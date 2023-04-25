import { Args, Query, Resolver } from '@nestjs/graphql';
import { ProxyFarmTransactionsService } from './services/proxy-farm/proxy.farm.transactions.service';
import { ProxyPairTransactionsService } from './services/proxy-pair/proxy.pair.transactions.service';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from './models/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './models/proxy-farm.args';
import { WrappedLpValidationPipe } from './validators/wrapped.lp.validator';
import { MergeWrappedTokenValidationPipe } from './validators/merge.wrapped.token.validator';
import { EnterFarmProxyValidationPipe } from './validators/enter.farm.proxy.valodator';
import { WrappedFarmValidationPipe } from './validators/wrapped.farm.token.validator';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { LiquidityTokensValidationPipe } from './validators/add.liquidity.input.validator';
import { ProxyService } from './services/proxy.service';
import { scAddress } from 'src/config';

@Resolver()
export class ProxyTransactionResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly transactionsProxyPairService: ProxyPairTransactionsService,
        private readonly transactionsProxyFarmService: ProxyFarmTransactionsService,
    ) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityProxyBatch(
        @Args(LiquidityTokensValidationPipe) args: AddLiquidityProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.transactionsProxyPairService.addLiquidityProxyBatch(
            user.address,
            scAddress.proxyDexAddress.v2,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidityProxy(
        @Args(LiquidityTokensValidationPipe) args: AddLiquidityProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionsProxyPairService.addLiquidityProxy(
            user.address,
            scAddress.proxyDexAddress.v2,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidityProxy(
        @Args(WrappedLpValidationPipe) args: RemoveLiquidityProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedLpTokenID,
        );
        return this.transactionsProxyPairService.removeLiquidityProxy(
            user.address,
            proxyAddress,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async enterFarmProxy(
        @Args(EnterFarmProxyValidationPipe) args: EnterFarmProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionsProxyFarmService.enterFarmProxy(
            user.address,
            scAddress.proxyDexAddress.v2,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async exitFarmProxy(
        @Args(WrappedFarmValidationPipe) args: ExitFarmProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return this.transactionsProxyFarmService.exitFarmProxy(
            user.address,
            proxyAddress,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimFarmRewardsProxy(
        @Args(WrappedFarmValidationPipe) args: ClaimFarmRewardsProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return this.transactionsProxyFarmService.claimFarmRewardsProxy(
            user.address,
            proxyAddress,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedLpTokens(
        @Args(
            'tokens',
            { type: () => [InputTokenModel] },
            MergeWrappedTokenValidationPipe,
        )
        tokens: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            tokens[0].tokenID,
        );
        return this.transactionsProxyPairService.mergeWrappedLPTokens(
            user.address,
            proxyAddress,
            tokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedFarmTokens(
        @Args('farmAddress') farmAddress: string,
        @Args(
            'tokens',
            { type: () => [InputTokenModel] },
            MergeWrappedTokenValidationPipe,
        )
        tokens: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            tokens[0].tokenID,
        );
        return this.transactionsProxyFarmService.mergeWrappedFarmTokens(
            user.address,
            proxyAddress,
            farmAddress,
            tokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewardsProxy(
        @Args(WrappedFarmValidationPipe) args: CompoundRewardsProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.tokenID,
        );
        return this.transactionsProxyFarmService.compoundRewardsProxy(
            user.address,
            proxyAddress,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarmProxy(
        @Args(WrappedFarmValidationPipe) args: ExitFarmProxyArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return this.transactionsProxyFarmService.migrateToNewFarmProxy(
            user.address,
            proxyAddress,
            args,
        );
    }
}
