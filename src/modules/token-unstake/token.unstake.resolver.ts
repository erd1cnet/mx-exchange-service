import { UseGuards } from '@nestjs/common';
import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import {
    TokenUnstakeModel,
    UnstakePairModel,
} from './models/token.unstake.model';
import { TokenUnstakeGetterService } from './services/token.unstake.getter.service';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';

@Resolver(() => TokenUnstakeModel)
export class TokenUnstakeResolver extends GenericResolver {
    constructor(
        private readonly tokenUnstakeGetter: TokenUnstakeGetterService,
        private readonly tokenUnstakeTransactions: TokenUnstakeTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async unbondEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getUnbondEpochs(),
        );
    }

    @ResolveField()
    async feesBurnPercentage(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getFeesBurnPercentage(),
        );
    }

    @ResolveField()
    async feesCollectorAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getFeesCollectorAddress(),
        );
    }

    @ResolveField()
    async lastEpochFeeSentToCollector(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getLastEpochFeeSentToCollector(),
        );
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeGetter.getEnergyFactoryAddress(),
        );
    }

    @Query(() => TokenUnstakeModel)
    async tokenUnstake(): Promise<TokenUnstakeModel> {
        return new TokenUnstakeModel({
            address: scAddress.tokenUnstake,
        });
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [UnstakePairModel])
    async getUnlockedTokensForUser(
        @User() user: any,
    ): Promise<UnstakePairModel[]> {
        return await this.genericQuery(() =>
            this.tokenUnstakeGetter.getUnlockedTokensForUser(user.publicKey),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimUnlockedTokens(@User() user: any): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.claimUnlockedTokens(user.publicKey),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async cancelUnbond(): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.cancelUnbond(),
        );
    }
}
