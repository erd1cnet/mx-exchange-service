import { Inject, Injectable } from '@nestjs/common';
import { cacheConfig, scAddress } from '../../config';
import { ContextService } from '../../services/context/context.service';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { WrapModel } from './models/wrapping.model';
import { AbiWrapService } from './abi-wrap.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CachingService } from '../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateGetLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class WrapService {
    constructor(
        private abiService: AbiWrapService,
        private context: ContextService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getWrappingInfo(): Promise<WrapModel[]> {
        return [
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-0'),
                shard: 0,
            }),
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-1'),
                shard: 1,
            }),
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-2'),
                shard: 2,
            }),
        ];
    }

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getWrapCacheKey(tokenCacheKey);
        try {
            return this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                cacheConfig.token,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                WrapService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getWrappedEgldTokenID(): Promise<string> {
        return this.getTokenID('wrappedTokenID', () =>
            this.abiService.getWrappedEgldTokenID(),
        );
    }

    async getWrappedEgldToken(): Promise<EsdtToken> {
        const wrappedEgldTokenID = await this.getWrappedEgldTokenID();
        return this.context.getTokenMetadata(wrappedEgldTokenID);
    }

    private getWrapCacheKey(...args: any) {
        return generateCacheKeyFromParams('wrap', ...args);
    }
}
