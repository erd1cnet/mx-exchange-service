import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import {
    ComposableTaskEnumType,
    ComposableTaskType,
} from '../models/composable.tasks.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    BigUIntValue,
    BytesType,
    BytesValue,
    EnumValue,
    EnumVariantDefinition,
    Field,
    List,
    ListType,
    Struct,
    TokenIdentifierValue,
    TokenTransfer,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig } from 'src/config';
import { EgldOrEsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { decimalToHex } from 'src/utils/token.converters';

export type ComposableTask = {
    type: ComposableTaskType;
    arguments: BytesValue[];
};

@Injectable()
export class ComposableTasksTransactionService {
    constructor(private readonly mxPorxy: MXProxyService) {}

    async getComposeTasksTransaction(
        payment: EsdtTokenPayment,
        tokenOut: EgldOrEsdtTokenPayment,
        tasks: ComposableTask[],
    ): Promise<TransactionModel> {
        const contract = await this.mxPorxy.getComposableTasksSmartContract();

        const rawTasks: TypedValue[] = [];

        for (const task of tasks) {
            rawTasks.push(
                new EnumValue(
                    ComposableTaskEnumType.getEnumType(),
                    new EnumVariantDefinition(
                        task.type,
                        ComposableTaskEnumType.getEnumType().getVariantByName(
                            task.type,
                        ).discriminant,
                    ),
                    [],
                ),
            );
            rawTasks.push(
                new List(new ListType(new BytesType()), task.arguments),
            );
        }

        let interaction = contract.methodsExplicit
            .composeTasks([
                new Struct(EgldOrEsdtTokenPayment.getStructure(), [
                    new Field(
                        new TokenIdentifierValue(tokenOut.tokenIdentifier),
                        'token_identifier',
                    ),
                    new Field(new U64Value(new BigNumber(0)), 'token_nonce'),
                    new Field(
                        new BigUIntValue(new BigNumber(tokenOut.amount)),
                        'amount',
                    ),
                ]),
                ...rawTasks,
            ])
            .withGasLimit(gasConfig.composableTasks.default)
            .withChainID(mxConfig.chainID);

        switch (payment.tokenIdentifier) {
            case 'EGLD':
                interaction = interaction.withValue(
                    new BigUIntValue(new BigNumber(payment.amount)),
                );
                break;
            default:
                interaction = interaction.withSingleESDTTransfer(
                    TokenTransfer.fungibleFromBigInteger(
                        payment.tokenIdentifier,
                        new BigNumber(payment.amount),
                    ),
                );
                break;
        }

        return interaction.buildTransaction().toPlainObject();
    }

    async wrapEgldAndSwapTransaction(
        value: string,
        tokenOutID: string,
        tokenOutAmountMin: string,
    ): Promise<TransactionModel> {
        const wrapTask: ComposableTask = {
            type: ComposableTaskType.WRAP_EGLD,
            arguments: [],
        };
        console.log(decimalToHex(new BigNumber(tokenOutAmountMin)));
        const swapTask: ComposableTask = {
            type: ComposableTaskType.SWAP,
            arguments: [
                new BytesValue(Buffer.from(tokenOutID, 'utf-8')),
                new BytesValue(
                    Buffer.from(
                        decimalToHex(new BigNumber(tokenOutAmountMin)),
                        'hex',
                    ),
                ),
            ],
        };

        return this.getComposeTasksTransaction(
            new EsdtTokenPayment({
                tokenIdentifier: 'EGLD',
                tokenNonce: 0,
                amount: value,
            }),
            new EgldOrEsdtTokenPayment({
                tokenIdentifier: tokenOutID,
                amount: tokenOutAmountMin,
            }),
            [wrapTask, swapTask],
        );
    }
}
