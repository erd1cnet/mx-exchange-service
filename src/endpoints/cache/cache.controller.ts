import { Controller, Inject } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';

@Controller()
export class CacheController {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly cachingService: CachingService,
    ) {}

    @EventPattern('deleteCacheKeys')
    async deleteCacheKey(keys: string[]) {
        this.logger.info(`Deleting cache keys ${keys}`);

        for (const key of keys) {
            await this.cachingService.deleteInCacheLocal(key);
        }
    }
}
