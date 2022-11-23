import { Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../services/generics/generic.getter.service';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    LockedTokenWrapperAbiService
} from './locked-token-wrapper.abi.service';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

@Injectable()
export class LockedTokenWrapperGetterService extends GenericGetterService{
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: LockedTokenWrapperAbiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'lockedTokenWrapper'
    }

    async getLockedTokenId(address: string): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedTokenId', address),
            () => this.abiService.lockedTokenId(address),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        )
    }

    async getWrappedTokenId(address: string): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedTokenId', address),
            () => this.abiService.wrappedTokenId(address),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        )
    }
}
