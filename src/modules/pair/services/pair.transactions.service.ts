import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityAndBuyBackAndBurnArgs,
    RemoveLiquidityArgs,
    SetLpTokenIdentifierArgs,
    SwapNoFeeAndForwardArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
    WhitelistArgs,
} from '../models/pair.args';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { PairGetterService } from './pair.getter.service';
import { PairService } from './pair.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { BPConfig } from '../models/pair.model';

@Injectable()
export class PairTransactionService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addInitialLiquidityBatch(
        sender: string,
        args: AddLiquidityArgs,
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
                break;
        }

        transactions.push(await this.addInitialLiquidity(sender, args));

        return transactions;
    }

    async addLiquidityBatch(
        sender: string,
        args: AddLiquidityArgs,
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
                break;
        }

        transactions.push(await this.addLiquidity(sender, args));

        return transactions;
    }

    async addInitialLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        const initialLiquidityAdder = await this.pairGetterService.getInitialLiquidityAdder(
            args.pairAddress,
        );
        if (sender != initialLiquidityAdder) {
            throw new Error('Invalid sender address');
        }

        let firstTokenInput, secondTokenInput: InputTokenModel;
        try {
            [firstTokenInput, secondTokenInput] = await this.validateTokens(
                args.pairAddress,
                args.tokens,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                PairTransactionService.name,
                this.addInitialLiquidity.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstTokenInput, secondTokenInput],
            'addInitialLiquidity',
            [],
            new GasLimit(gasConfig.pairs.addLiquidity),
        );
    }

    async addLiquidity(
        sender: string,
        args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        let firstTokenInput, secondTokenInput: InputTokenModel;
        try {
            [firstTokenInput, secondTokenInput] = await this.validateTokens(
                args.pairAddress,
                args.tokens,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                PairTransactionService.name,
                this.addLiquidity.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const amount0 = new BigNumber(firstTokenInput.amount);
        const amount1 = new BigNumber(secondTokenInput.amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const endpointArgs: TypedValue[] = [
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            [firstTokenInput, secondTokenInput],
            'addLiquidity',
            endpointArgs,
            new GasLimit(gasConfig.pairs.addLiquidity),
        );
    }

    async removeLiquidity(
        sender: string,
        args: RemoveLiquidityArgs,
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
            this.elrondProxy.getPairSmartContract(args.pairAddress),
        ]);

        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const transactionArgs = [
            BytesValue.fromUTF8(args.liquidityTokenID),
            new BigUIntValue(new BigNumber(args.liquidity)),
            BytesValue.fromUTF8('removeLiquidity'),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];
        transactions.push(
            this.contextTransactions.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.pairs.removeLiquidity),
            ),
        );

        switch (wrappedTokenID) {
            case firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount0Min.toString(),
                    ),
                );
                break;
            case secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount1Min.toString(),
                    ),
                );
        }

        return transactions;
    }

    async removeLiquidityAndBuyBackAndBurnToken(
        args: RemoveLiquidityAndBuyBackAndBurnArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromUTF8('removeLiquidityAndBuyBackAndBurnToken'),
            BytesValue.fromUTF8(args.tokenToBuyBackAndBurnID),
        ];

        // todo: test gasConfig.pairs.removeLiquidityAndBuyBackAndBurnToken
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.removeLiquidityAndBuyBackAndBurnToken),
        );
    }

    async swapTokensFixedInput(
        sender: string,
        args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
            this.pairGetterService.getTrustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);
        const amountOutMin = new BigNumber(1)
            .dividedBy(new BigNumber(1).plus(args.tolerance))
            .multipliedBy(amountOut)
            .integerValue();

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(sender, args.amountIn),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
            case args.tokenOutID:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOutMin),
                ];
                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amountOutMin.toString(),
                    ),
                );
                break;
            default:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOutMin),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedInput.default
                                : gasConfig.pairs.swapTokensFixedInput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
        }

        return transactions;
    }

    async swapTokensFixedOutput(
        sender: string,
        args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        let transactionArgs: TypedValue[];
        const [wrappedTokenID, contract, trustedSwapPairs] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.elrondProxy.getPairSmartContract(args.pairAddress),
            this.pairGetterService.getTrustedSwapPairs(args.pairAddress),
        ]);

        const amountIn = new BigNumber(args.amountIn);
        const amountOut = new BigNumber(args.amountOut);

        switch (elrondConfig.EGLDIdentifier) {
            case args.tokenInID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        amountIn.toString(),
                    ),
                );

                transactionArgs = [
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
            case args.tokenOutID:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(wrappedTokenID),
                    new BigUIntValue(amountOut),
                ];
                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        args.amountOut,
                    ),
                );
                break;
            default:
                transactionArgs = [
                    BytesValue.fromUTF8(args.tokenInID),
                    new BigUIntValue(amountIn),
                    BytesValue.fromUTF8('swapTokensFixedOutput'),
                    BytesValue.fromUTF8(args.tokenOutID),
                    new BigUIntValue(amountOut),
                ];

                transactions.push(
                    this.contextTransactions.esdtTransfer(
                        contract,
                        transactionArgs,
                        new GasLimit(
                            trustedSwapPairs.length === 0
                                ? gasConfig.pairs.swapTokensFixedOutput.default
                                : gasConfig.pairs.swapTokensFixedOutput
                                      .withFeeSwap,
                        ),
                    ),
                );
                break;
        }
        return transactions;
    }

    async validateTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (tokens[0].nonce > 0 || tokens[1].nonce > 0) {
            throw new Error('Only ESDT tokens allowed!');
        }

        if (
            tokens[0].tokenID === elrondConfig.EGLDIdentifier ||
            tokens[1].tokenID === elrondConfig.EGLDIdentifier
        ) {
            return await this.getTokensWithEGLD(
                tokens,
                firstTokenID,
                secondTokenID,
            );
        }

        if (
            tokens[0].tokenID === firstTokenID &&
            tokens[1].tokenID === secondTokenID
        ) {
            return tokens;
        }

        if (
            tokens[1].tokenID === firstTokenID &&
            tokens[0].tokenID === secondTokenID
        ) {
            return [tokens[1], tokens[0]];
        }

        throw new Error('invalid tokens received');
    }

    private async getTokensWithEGLD(
        tokens: InputTokenModel[],
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<InputTokenModel[]> {
        switch (elrondConfig.EGLDIdentifier) {
            case tokens[0].tokenID:
                return await this.getTokensInOrder(
                    tokens[1],
                    tokens[0],
                    firstTokenID,
                    secondTokenID,
                );
            case tokens[1].tokenID:
                return await this.getTokensInOrder(
                    tokens[0],
                    tokens[1],
                    firstTokenID,
                    secondTokenID,
                );
            default:
                throw new Error('Invalid tokens with EGLD');
        }
    }

    private async getTokensInOrder(
        firstToken: InputTokenModel,
        secondToken: InputTokenModel,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<InputTokenModel[]> {
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();
        if (firstToken.tokenID === firstTokenID) {
            return [
                firstToken,
                new InputTokenModel({
                    tokenID: wrappedTokenID,
                    amount: secondToken.amount,
                    nonce: secondToken.nonce,
                }),
            ];
        }
        if (firstToken.tokenID === secondTokenID) {
            return [
                new InputTokenModel({
                    tokenID: wrappedTokenID,
                    amount: secondToken.amount,
                    nonce: secondToken.nonce,
                }),
                firstToken,
            ];
        }
    }

    async swapNoFeeAndForward(
        args: SwapNoFeeAndForwardArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenOutID),
            new BigUIntValue(new BigNumber(args.destination)),
            BytesValue.fromUTF8('swapNoFeeAndForward'),
        ];

        // todo: test gasConfig.pairs.swapNoFeeAndForward
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.swapNoFeeAndForward),
        );
    }

    async setLpTokenIdentifier(
        args: SetLpTokenIdentifierArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('setLpTokenIdentifier'),
            BytesValue.fromUTF8(args.tokenID),
        ];

        // todo: test gasConfig.pairs.setLpTokenIdentifier
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setLpTokenIdentifier),
        );
    }

    async whitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('whitelist'),
            BytesValue.fromHex(new Address(args.address).hex()),
        ];

        // todo: test gasConfig.pairs.whitelist
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.whitelist),
        );
    }

    async removeWhitelist(args: WhitelistArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            args.pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('removeWhitelist'),
            BytesValue.fromHex(new Address(args.address).hex()),
        ];

        // todo: test gasConfig.pairs.removeWhitelist
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.removeWhitelist),
        );
    }

    async addTrustedSwapPair(
        pairAddress: string,
        swapPairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('addTrustedSwapPair'),
            BytesValue.fromHex(new Address(swapPairAddress).hex()),
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];

        // todo: test gasConfig.pairs.addTrustedSwapPair
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.addTrustedSwapPair),
        );
    }

    async removeTrustedSwapPair(
        pairAddress: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('addTrustedSwapPair'),
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];

        // todo: test gasConfig.pairs.removeTrustedSwapPair
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.removeTrustedSwapPair),
        );
    }

    async setTransferExecGasLimit(
        pairAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('set_transfer_exec_gas_limit'),
            new BigUIntValue(new BigNumber(gasLimit)),
        ];

        // todo: test gasConfig.pairs.set_transfer_exec_gas_limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.set_transfer_exec_gas_limit),
        );
    }

    async setExternExecGasLimit(
        pairAddress: string,
        gasLimit: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8('set_extern_swap_gas_limit'),
            new BigUIntValue(new BigNumber(gasLimit)),
        ];

        // todo: test gasConfig.pairs.set_extern_swap_gas_limit
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.set_extern_swap_gas_limit),
        );
    }

    async pause(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('pause')];
        // todo: test gasConfig.pairs.pause
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.pause),
        );
    }

    async resume(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('resume')];
        // todo: test gasConfig.pairs.resume
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.resume),
        );
    }

    async setStateActiveNoSwaps(
        pairAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [BytesValue.fromUTF8('setStateActiveNoSwaps')];
        // todo: test gasConfig.pairs.setStateActiveNoSwaps
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setStateActiveNoSwaps),
        );
    }

    async setFeePercents(
        pairAddress: string,
        totalFeePercent: string,
        specialFeePercent: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setFeePercents'),
            new BigUIntValue(new BigNumber(totalFeePercent)),
            new BigUIntValue(new BigNumber(specialFeePercent)),
        ];
        // todo: test gasConfig.pairs.setFeePercents
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setFeePercents),
        );
    }

    async updateAndGetTokensForGivenPositionWithSafePrice(
        pairAddress: string,
        liquidity: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8(
                'updateAndGetTokensForGivenPositionWithSafePrice',
            ),
            new BigUIntValue(new BigNumber(liquidity)),
        ];
        // todo: test gasConfig.pairs.updateAndGetTokensForGivenPositionWithSafePrice
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(
                gasConfig.pairs.updateAndGetTokensForGivenPositionWithSafePrice,
            ),
        );
    }

    /*async updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('updateAndGetSafePrice'),
            ...[
                BytesValue.fromUTF8(esdtTokenPayment.tokenID),
                new BigUIntValue(new BigNumber(esdtTokenPayment.nonce)),
                new BigUIntValue(new BigNumber(esdtTokenPayment.amount)),
            ],
        ];

        // todo: test gasConfig.pairs.updateAndGetSafePrice
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.updateAndGetSafePrice),
        );
    }*/

    async setMaxObservationsPerRecord(
        pairAddress: string,
        maxObservationsPerRecord: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setMaxObservationsPerRecord'),
            new BigUIntValue(new BigNumber(maxObservationsPerRecord)),
        ];
        // todo: test gasConfig.pairs.setMaxObservationsPerRecord
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setMaxObservationsPerRecord),
        );
    }

    async setBPSwapConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setBPSwapConfig'),
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        // todo: test gasConfig.pairs.setBPSwapConfig
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setBPSwapConfig),
        );
    }

    async setBPRemoveConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setBPRemoveConfig'),
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        // todo: test gasConfig.pairs.setBPRemoveConfig
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setBPRemoveConfig),
        );
    }

    async setBPAddConfig(
        pairAddress: string,
        config: BPConfig,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setBPAddConfig'),
            new BigUIntValue(new BigNumber(config.protectStopBlock)),
            new BigUIntValue(new BigNumber(config.volumePercent)),
            new BigUIntValue(new BigNumber(config.maxNumActionsPerAddress)),
        ];
        // todo: test gasConfig.pairs.setBPAddConfig
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setBPAddConfig),
        );
    }

    async setLockingDeadlineEpoch(
        pairAddress: string,
        newDeadline: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setLockingDeadlineEpoch'),
            new BigUIntValue(new BigNumber(newDeadline)),
        ];
        // todo: test gasConfig.pairs.setLockingDeadlineEpoch
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setLockingDeadlineEpoch),
        );
    }

    async setLockingScAddress(
        pairAddress: string,
        newAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setLockingScAddress'),
            BytesValue.fromHex(new Address(newAddress).hex()),
        ];
        // todo: test gasConfig.pairs.setLockingScAddress
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setLockingScAddress),
        );
    }

    async setUnlockEpoch(
        pairAddress: string,
        newEpoch: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8('setUnlockEpoch'),
            new BigUIntValue(new BigNumber(newEpoch)),
        ];
        // todo: test gasConfig.pairs.setUnlockEpoch
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.pairs.setUnlockEpoch),
        );
    }
}
