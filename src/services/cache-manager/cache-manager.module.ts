import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';

import * as redisStore from 'cache-manager-redis-store';
import { CacheDistributionService } from './cache-distribution.service';
import { CachePairService } from './cache-pair.service';
import { CacheWrapService } from './cache-wrapping.service';
import { CacheProxyService } from './cache-proxy.service';
import { CacheProxyPairService } from './cache-proxy-pair.service';
import { CacheProxyFarmService } from './cache-proxy-farm.service';
import { CacheFarmService } from './cache-farm.service';
import { CacheLockedAssetService } from './cache-locked-asset.service';
import { CacheUserService } from './cache-user.service';

@Module({
    providers: [
        CacheManagerService,
        CachePairService,
        CacheFarmService,
        CacheDistributionService,
        CacheWrapService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
        CacheLockedAssetService,
        CacheUserService,
    ],
    imports: [
        CacheModule.register({
            ttl: 60 * 5,
            store: redisStore,
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
            prefix: process.env.REDIS_PREFIX,
            // password: process.env.REDIS_PASSWORD,
        }),
    ],
    exports: [
        CacheManagerService,
        CachePairService,
        CacheFarmService,
        CacheWrapService,
        CacheDistributionService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
        CacheLockedAssetService,
        CacheUserService,
    ],
})
export class CacheManagerModule {}
