import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

export class AnalyticsSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'analytics';
    }

    async lockedValueUSDFarms(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('lockedValueUSDFarms'),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async totalValueLockedUSD(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalValueLockedUSD'),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async totalValueStakedUSD(value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalValueStakedUSD'),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async totalAggregatedRewards(days: number, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalAggregatedRewards', days),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async totalLockedMexStakedUSD(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalLockedMexStakedUSD'),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async feeTokenBurned(
        tokenID: string,
        time: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('feeTokenBurned', tokenID, time),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }

    async penaltyTokenBurned(
        tokenID: string,
        time: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('penaltyTokenBurned', tokenID, time),
            value,
            Constants.oneMinute() * 10,
            Constants.oneMinute() * 5,
        );
    }
}
