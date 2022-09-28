import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig, constantsConfig, tokensSupplyConfig } from 'src/config';
import { AnalyticsComputeService } from 'src/modules/analytics/services/analytics.compute.service';
import { AnalyticsGetterService } from 'src/modules/analytics/services/analytics.getter.service';
import { awsOneYear, oneMinute, oneYear } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class AnalyticsCacheWarmerService {
    constructor(
        private readonly analyticsGetterService: AnalyticsGetterService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheAnalytics(): Promise<void> {
        for (const token of tokensSupplyConfig) {
            await this.analyticsGetterService.getTotalTokenSupply(token);
        }
        const [
            totalValueLockedUSD,
            totalAggregatedRewards,
            totalValueLockedUSDFarms,
        ] = await Promise.all([
            this.analyticsCompute.computeTotalValueLockedUSD(),
            this.analyticsCompute.computeTotalAggregatedRewards(30),
            this.analyticsCompute.computeLockedValueUSDFarms(),
        ]);
        const cachedKeys = await Promise.all([
            this.setAnalyticsCache(
                ['totalValueLockedUSD'],
                totalValueLockedUSD,
                oneMinute() * 10,
                oneMinute() * 5,
            ),
            this.setAnalyticsCache(
                [30, 'totalAggregatedRewards'],
                totalAggregatedRewards,
                oneMinute() * 10,
                oneMinute() * 5,
            ),
            this.setAnalyticsCache(
                ['lockedValueUSDFarms'],
                totalValueLockedUSDFarms,
                oneMinute() * 10,
                oneMinute() * 5,
            ),
        ]);

        await this.deleteCacheKeys(cachedKeys);
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cacheBurnedTokens(): Promise<void> {
        const [feeBurned, penaltyBurned] = await Promise.all([
            this.analyticsCompute.computeTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                awsOneYear(),
                'feeBurned',
            ),
            this.analyticsCompute.computeTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                awsOneYear(),
                'penaltyBurned',
            ),
        ]);

        const cachedKeys = await Promise.all([
            this.setAnalyticsCache(
                [constantsConfig.MEX_TOKEN_ID, awsOneYear(), 'feeTokenBurned'],
                feeBurned,
                oneMinute() * 30,
                oneMinute() * 10,
            ),
            this.setAnalyticsCache(
                [
                    constantsConfig.MEX_TOKEN_ID,
                    awsOneYear(),
                    'penaltyTokenBurned',
                ],
                penaltyBurned,
                oneMinute() * 30,
                oneMinute() * 10,
            ),
        ]);
        await this.deleteCacheKeys(cachedKeys);
    }

    private async setAnalyticsCache(
        keys: any[],
        value: any,
        remoteTtl: number = cacheConfig.default,
        localTtl?: number,
    ): Promise<string> {
        const cacheKey = generateCacheKeyFromParams('analytics', ...keys);
        await this.cachingService.setCache(
            cacheKey,
            value,
            remoteTtl,
            localTtl,
        );
        return cacheKey;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
