import { Inject, Injectable } from '@nestjs/common';
import { constantsConfig, elrondConfig, gasConfig } from 'src/config';
import {
    BigUIntValue,
    BytesValue,
    TypedValue,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { Address, TokenPayment } from '@multiversx/sdk-core';
import { TransactionModel } from 'src/models/transaction.model';
import BigNumber from 'bignumber.js';
import { PairService } from 'src/modules/pair/services/pair.service';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from '../../models/proxy-pair.args';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ProxyGetterService } from '../proxy.getter.service';

@Injectable()
export class TransactionsProxyPairService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addLiquidityProxyBatch(
        sender: string,
        proxyAddress: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokens[0].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[0].amount,
                    ),
                );
                break;
            case args.tokens[1].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[1].amount,
                    ),
                );
                break;
            default:
                throw new Error('No EGLD to wrap found!');
        }

        transactions.push(
            await this.addLiquidityProxy(sender, proxyAddress, args),
        );

        return transactions;
    }

    async addLiquidityProxy(
        sender: string,
        proxyAddress: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        let liquidityTokens: InputTokenModel[];
        try {
            liquidityTokens = await this.convertInputTokenstoESDTTokens(
                args.tokens,
            );
            liquidityTokens = await this.getLiquidityTokens(
                args.pairAddress,
                liquidityTokens,
                proxyAddress,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsProxyPairService.name,
                this.addLiquidityProxy.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const amount0 = new BigNumber(liquidityTokens[0].amount);
        const amount1 = new BigNumber(liquidityTokens[1].amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const endpointArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const gasLimit =
            liquidityTokens.length > 2
                ? gasConfig.proxy.pairs.addLiquidity.withTokenMerge
                : gasConfig.proxy.pairs.addLiquidity.default;
        const mappedPayments: TokenPayment[] = liquidityTokens.map(
            (inputToken) =>
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
        );

        return contract.methodsExplicit
            .addLiquidityProxy(endpointArgs)
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeLiquidityProxy(
        sender: string,
        proxyAddress: string,
        args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            liquidityPosition,
            contract,
        ] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(args.pairAddress),
            this.pairGetterService.getSecondTokenID(args.pairAddress),
            this.pairService.getLiquidityPosition(
                args.pairAddress,
                args.liquidity,
            ),
            this.elrondProxy.getProxyDexSmartContract(proxyAddress),
        ]);
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        )
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        )
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        transactions.push(
            contract.methodsExplicit
                .removeLiquidityProxy(endpointArgs)
                .withSingleESDTNFTTransfer(
                    TokenPayment.metaEsdtFromBigInteger(
                        args.wrappedLpTokenID,
                        args.wrappedLpTokenNonce,
                        new BigNumber(args.liquidity),
                    ),
                    Address.fromString(sender),
                )
                .withGasLimit(gasConfig.proxy.pairs.removeLiquidity)
                .withChainID(elrondConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        switch (wrappedTokenID) {
            case firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount0Min.toFixed(),
                    ),
                );
                break;
            case secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount1Min.toFixed(),
                    ),
                );
        }

        return transactions;
    }

    async mergeWrappedLPTokens(
        sender: string,
        proxyAddress: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeWLPT * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }

        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const gasLimit = gasConfig.proxy.pairs.defaultMergeWLPT * tokens.length;
        const mappedPayments = tokens.map((token) =>
            TokenPayment.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeWrappedLpTokens()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async convertInputTokenstoESDTTokens(
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();

        switch (elrondConfig.EGLDIdentifier) {
            case tokens[0].tokenID:
                if (tokens[0].nonce > 0) {
                    throw new Error('Invalid nonce for EGLD token!');
                }
                return [
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        nonce: 0,
                        amount: tokens[0].amount,
                    }),
                    ...tokens.slice(1),
                ];
            case tokens[1].tokenID:
                if (tokens[1].nonce > 0) {
                    throw new Error('Invalid nonce for EGLD token!');
                }
                return [
                    tokens[0],
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        nonce: 0,
                        amount: tokens[1].amount,
                    }),
                    ...tokens.slice(2),
                ];
            default:
                return tokens;
        }
    }

    private async getLiquidityTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
        proxyAddress: string,
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.proxyGetter.getLockedAssetTokenID(proxyAddress),
        ]);

        switch (firstTokenID) {
            case tokens[0].tokenID:
                if (!secondTokenID.includes(tokens[1].tokenID)) {
                    throw new Error('Invalid tokens received!');
                }
                if (tokens[0].nonce > 0 || tokens[1].nonce < 1) {
                    throw new Error('Invalid tokens nonce received!');
                }
                return tokens;
            case tokens[1].tokenID:
                if (!secondTokenID.includes(tokens[0].tokenID)) {
                    throw new Error('Invalid tokens received!');
                }
                if (tokens[1].nonce > 0 || tokens[0].nonce < 1) {
                    throw new Error('Invalid tokens nonce received!');
                }
                return [tokens[1], tokens[0], ...tokens.slice(2)];
            default:
                break;
        }

        throw new Error('Invalid tokens received!');
    }
}
