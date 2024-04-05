import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { TransactionModel } from 'src/models/transaction.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PositionCreatorTransactionService } from './services/position.creator.transaction';
import { InputTokenModel } from 'src/models/inputToken.model';
import { UserAuthResult } from '../auth/user.auth.result';
import { AuthUser } from '../auth/auth.user';
import { PositionCreatorTransactionModel } from './models/position.creator.model';

@Resolver()
@UseGuards(JwtOrNativeAuthGuard)
export class PositionCreatorTransactionResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
    ) {}

    @Query(() => PositionCreatorTransactionModel)
    async createPositionSingleToken(
        @AuthUser() user: UserAuthResult,
        @Args('pairAddress') pairAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
        @Args('lockEpochs', { nullable: true }) lockEpochs: number,
    ): Promise<PositionCreatorTransactionModel> {
        return this.posCreatorTransaction.createLiquidityPositionSingleToken(
            user.address,
            pairAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
            lockEpochs,
        );
    }

    @Query(() => PositionCreatorTransactionModel)
    async createFarmPositionSingleToken(
        @AuthUser() user: UserAuthResult,
        @Args('farmAddress') farmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
        @Args('lockEpochs', { nullable: true }) lockEpochs: number,
    ): Promise<PositionCreatorTransactionModel> {
        return this.posCreatorTransaction.createFarmPositionSingleToken(
            user.address,
            farmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
            lockEpochs,
        );
    }

    @Query(() => PositionCreatorTransactionModel)
    async createDualFarmPositionSingleToken(
        @AuthUser() user: UserAuthResult,
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<PositionCreatorTransactionModel> {
        return this.posCreatorTransaction.createDualFarmPositionSingleToken(
            user.address,
            dualFarmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => [TransactionModel])
    async createStakingPositionSingleToken(
        @AuthUser() user: UserAuthResult,
        @Args('stakingAddress') stakingAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createStakingPositionSingleToken(
            user.address,
            stakingAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => [TransactionModel])
    async createFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('farmAddress') farmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createFarmPositionDualTokens(
            user.address,
            farmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => [TransactionModel])
    async createDualFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createDualFarmPositionDualTokens(
            user.address,
            dualFarmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async exitFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('farmAddress') farmAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.exitFarmPositionDualTokens(
            user.address,
            farmAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createEnergyPosition(
        @AuthUser() user: UserAuthResult,
        @Args('payment') payment: InputTokenModel,
        @Args('lockEpochs') lockEpochs: number,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createEnergyPosition(
            user.address,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            lockEpochs,
            tolerance,
        );
    }
}
