import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { ContextSetterService } from '../context/context.setter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';

@Injectable()
export class PairCacheWarmerService {
    private invalidatedKeys = [];
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly abiPairService: PairAbiService,
        private readonly routerGetter: RouterGetterService,
        private readonly apiService: ElrondApiService,
        private readonly contextSetter: ContextSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );

            const [
                firstToken,
                secondToken,
                totalFeePercent,
                specialFeePercent,
            ] = await Promise.all([
                this.apiService.getToken(pairMetadata.firstTokenID),
                this.apiService.getToken(pairMetadata.secondTokenID),
                this.abiPairService.getTotalFeePercent(pairMetadata.address),
                this.abiPairService.getSpecialFeePercent(pairMetadata.address),
            ]);

            const cacheKeys = await Promise.all([
                this.pairSetterService.setFirstTokenID(
                    pairMetadata.address,
                    pairMetadata.firstTokenID,
                ),
                this.pairSetterService.setSecondTokenID(
                    pairMetadata.address,
                    pairMetadata.secondTokenID,
                ),
                this.pairSetterService.setTotalFeePercent(
                    pairMetadata.address,
                    totalFeePercent,
                ),
                this.pairSetterService.setSpecialFeePercent(
                    pairMetadata.address,
                    specialFeePercent,
                ),
            ]);
            if (lpTokenID !== undefined) {
                const lpToken = await this.apiService.getToken(lpTokenID);
                cacheKeys.push(
                    await this.pairSetterService.setLpTokenID(
                        pairMetadata.address,
                        lpTokenID,
                    ),
                );
                cacheKeys.push(
                    await this.contextSetter.setTokenMetadata(
                        lpTokenID,
                        lpToken,
                    ),
                );
            }
            this.invalidatedKeys.push(cacheKeys);
            cacheKeys.push(
                await this.contextSetter.setTokenMetadata(
                    pairMetadata.firstTokenID,
                    firstToken,
                ),
            );
            cacheKeys.push(
                await this.contextSetter.setTokenMetadata(
                    pairMetadata.secondTokenID,
                    secondToken,
                ),
            );

            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddresses = await this.routerGetter.getAllPairsAddress();

        for (const pairAddress of pairsAddresses) {
            const [
                feesAPR,
                state,
                type,
                feeState,
                totalFeePercent,
            ] = await Promise.all([
                this.pairComputeService.computeFeesAPR(pairAddress),
                this.abiPairService.getState(pairAddress),
                this.pairComputeService.computeTypeFromTokens(pairAddress),
                this.abiPairService.getFeeState(pairAddress),
                this.abiPairService.getTotalFeePercent(pairAddress),
            ]);

            this.invalidatedKeys = await Promise.all([
                this.pairSetterService.setFeesAPR(pairAddress, feesAPR),
                this.pairSetterService.setState(pairAddress, state),
                this.pairSetterService.setType(pairAddress, type),
                this.pairSetterService.setFeeState(pairAddress, feeState),
                this.pairSetterService.setTotalFeePercent(
                    pairAddress,
                    totalFeePercent,
                ),
            ]);
            await this.deleteCacheKeys();
        }
    }

    @Cron('*/6 * * * * *') // Update prices and reserves every 6 seconds
    async cacheTokenPrices(): Promise<void> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();

        for (const pairAddress of pairsMetadata) {
            const pairInfo = await this.abiPairService.getPairInfoMetadata(
                pairAddress.address,
            );

            const cacheKeys = await Promise.all([
                this.pairSetterService.setFirstTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves0,
                ),
                this.pairSetterService.setSecondTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves1,
                ),
                this.pairSetterService.setTotalSupply(
                    pairAddress.address,
                    pairInfo.totalSupply,
                ),
            ]);
            this.invalidatedKeys.push(...cacheKeys);
        }

        for (const pairMetadata of pairsMetadata) {
            const [
                firstTokenPrice,
                firstTokenPriceUSD,
                secondTokenPrice,
                secondTokenPriceUSD,
                lpTokenPriceUSD,
            ] = await Promise.all([
                this.pairComputeService.computeFirstTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeFirstTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeLpTokenPriceUSD(
                    pairMetadata.address,
                ),
            ]);

            const cacheKeys = await Promise.all([
                this.pairSetterService.setFirstTokenPrice(
                    pairMetadata.address,
                    firstTokenPrice,
                ),
                this.pairSetterService.setSecondTokenPrice(
                    pairMetadata.address,
                    secondTokenPrice,
                ),
                this.pairSetterService.setFirstTokenPriceUSD(
                    pairMetadata.address,
                    firstTokenPriceUSD,
                ),
                this.pairSetterService.setSecondTokenPriceUSD(
                    pairMetadata.address,
                    secondTokenPriceUSD,
                ),
                this.pairSetterService.setLpTokenPriceUSD(
                    pairMetadata.address,
                    lpTokenPriceUSD,
                ),
            ]);
            this.invalidatedKeys.push(...cacheKeys);
        }
        await this.deleteCacheKeys();
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
