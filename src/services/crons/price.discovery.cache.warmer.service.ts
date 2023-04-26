import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { scAddress } from 'src/config';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from 'src/modules/price-discovery/services/price.discovery.compute.service';
import { PriceDiscoverySetterService } from 'src/modules/price-discovery/services/price.discovery.setter.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class PriceDiscoveryCacheWarmerService {
    constructor(
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoverySetter: PriceDiscoverySetterService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly tokenSetter: TokenSetterService,
        private readonly apiService: MXApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheTokens(): Promise<void> {
        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;
        for (const address of priceDiscoveryAddresses) {
            const [launchedTokenID, acceptedTokenID, redeemTokenID] =
                await Promise.all([
                    this.priceDiscoveryAbi.getLaunchedTokenIDRaw(address),
                    this.priceDiscoveryAbi.getAcceptedTokenIDRaw(address),
                    this.priceDiscoveryAbi.getRedeemTokenIDRaw(address),
                ]);
            const [launchedToken, acceptedToken, redeemToken] =
                await Promise.all([
                    this.apiService.getToken(launchedTokenID),
                    this.apiService.getToken(acceptedTokenID),
                    this.apiService.getNftCollection(redeemTokenID),
                ]);
            const cachedKeys = await Promise.all([
                this.priceDiscoverySetter.setLaunchedTokenID(
                    address,
                    launchedTokenID,
                ),
                this.priceDiscoverySetter.setAcceptedTokenID(
                    address,
                    acceptedTokenID,
                ),
                this.priceDiscoverySetter.setRedeemTokenID(
                    address,
                    redeemTokenID,
                ),
                this.tokenSetter.setTokenMetadata(
                    launchedTokenID,
                    launchedToken,
                ),
                this.tokenSetter.setTokenMetadata(
                    acceptedTokenID,
                    acceptedToken,
                ),
                this.tokenSetter.setNftCollectionMetadata(
                    redeemTokenID,
                    redeemToken,
                ),
            ]);

            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cachePriceDiscovery(): Promise<void> {
        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;

        for (const address of priceDiscoveryAddresses) {
            const [startBlock, endBlock] = await Promise.all([
                this.priceDiscoveryAbi.getStartBlockRaw(address),
                this.priceDiscoveryAbi.getEndBlockRaw(address),
            ]);

            const [
                minLaunchedTokenPrice,
                noLimitPhaseDurationBlocks,
                linearPenaltyPhaseDurationBlocks,
                fixedPenaltyPhaseDurationBlocks,
                lockingScAddress,
                unlockEpoch,
                penaltyMinPercentage,
                penaltyMaxPercentage,
                fixedPenaltyPercentage,
            ] = await Promise.all([
                this.priceDiscoveryAbi.getMinLaunchedTokenPriceRaw(address),
                this.priceDiscoveryAbi.getNoLimitPhaseDurationBlocksRaw(
                    address,
                ),
                this.priceDiscoveryAbi.getLinearPenaltyPhaseDurationBlocksRaw(
                    address,
                ),
                this.priceDiscoveryAbi.getFixedPenaltyPhaseDurationBlocksRaw(
                    address,
                ),
                this.priceDiscoveryAbi.getLockingScAddressRaw(address),
                this.priceDiscoveryAbi.getUnlockEpochRaw(address),
                this.priceDiscoveryAbi.getPenaltyMinPercentageRaw(address),
                this.priceDiscoveryAbi.getPenaltyMaxPercentageRaw(address),
                this.priceDiscoveryAbi.getFixedPenaltyPercentageRaw(address),
            ]);

            const invalidatedKeys = await Promise.all([
                this.priceDiscoverySetter.setStartBlock(address, startBlock),
                this.priceDiscoverySetter.setEndBlock(address, endBlock),
                this.priceDiscoverySetter.setMinLaunchedTokenPrice(
                    address,
                    minLaunchedTokenPrice,
                ),
                this.priceDiscoverySetter.setNoLimitPhaseDurationBlocks(
                    address,
                    noLimitPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setLinearPenaltyPhaseDurationBlocks(
                    address,
                    linearPenaltyPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setFixedPenaltyPhaseDurationBlocks(
                    address,
                    fixedPenaltyPhaseDurationBlocks,
                ),
                this.priceDiscoverySetter.setLockingScAddress(
                    address,
                    lockingScAddress,
                ),
                this.priceDiscoverySetter.setUnlockEpoch(address, unlockEpoch),
                this.priceDiscoverySetter.setPenaltyMinPercentage(
                    address,
                    penaltyMinPercentage,
                ),
                this.priceDiscoverySetter.setPenaltyMaxPercentage(
                    address,
                    penaltyMaxPercentage,
                ),
                this.priceDiscoverySetter.setFixedPenaltyPercentage(
                    address,
                    fixedPenaltyPercentage,
                ),
            ]);

            await this.deleteCacheKeys(invalidatedKeys);
        }
    }

    @Cron('*/12 * * * * *') // Update prices and reserves every 6 seconds
    async cacheTokensPrices(): Promise<void> {
        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;

        for (const address of priceDiscoveryAddresses) {
            const [
                launchedTokenAmount,
                acceptedTokenAmount,
                launchedTokenRedeemBalance,
                acceptedTokenRedeemBalance,
                currentPhase,
            ] = await Promise.all([
                this.priceDiscoveryAbi.getLaunchedTokenBalanceRaw(address),
                this.priceDiscoveryAbi.getAcceptedTokenBalanceRaw(address),
                this.priceDiscoveryAbi.getLaunchedTokenRedeemBalanceRaw(
                    address,
                ),
                this.priceDiscoveryAbi.getAcceptedTokenRedeemBalanceRaw(
                    address,
                ),
                this.priceDiscoveryAbi.currentPhase(address),
            ]);

            const invalidatedKeys: string[] = await Promise.all([
                this.priceDiscoverySetter.setLaunchedTokenAmount(
                    address,
                    launchedTokenAmount,
                ),
                this.priceDiscoverySetter.setAcceptedTokenAmount(
                    address,
                    acceptedTokenAmount,
                ),
                this.priceDiscoverySetter.setLaunchedTokenRedeemBalance(
                    address,
                    launchedTokenRedeemBalance,
                ),
                this.priceDiscoverySetter.setAcceptedTokenRedeemBalance(
                    address,
                    acceptedTokenRedeemBalance,
                ),
                this.priceDiscoverySetter.setCurrentPhase(
                    address,
                    currentPhase,
                ),
            ]);

            const [
                launchedTokenPrice,
                acceptedTokenPrice,
                launchedTokenPriceUSD,
            ] = await Promise.all([
                this.priceDiscoveryCompute.computeLaunchedTokenPrice(address),
                this.priceDiscoveryCompute.computeAcceptedTokenPrice(address),
                this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                    address,
                ),
            ]);

            invalidatedKeys.push(
                ...(await Promise.all([
                    this.priceDiscoverySetter.setLaunchedTokenPrice(
                        address,
                        launchedTokenPrice,
                    ),
                    this.priceDiscoverySetter.setAcceptedTokenPrice(
                        address,
                        acceptedTokenPrice,
                    ),
                    this.priceDiscoverySetter.setLaunchedTokenPriceUSD(
                        address,
                        launchedTokenPriceUSD,
                    ),
                ])),
            );

            await this.deleteCacheKeys(invalidatedKeys);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
