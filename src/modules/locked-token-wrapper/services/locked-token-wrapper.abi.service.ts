import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { Interaction } from '@multiversx/sdk-core';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class LockedTokenWrapperAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        className: LockedTokenWrapperAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'lockedTokenWrapper',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async wrappedTokenId(): Promise<string> {
        return await this.wrappedTokenIdRaw();
    }

    async wrappedTokenIdRaw(): Promise<string> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        const interaction: Interaction =
            contract.methodsExplicit.getWrappedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        className: LockedTokenWrapperAbiService.name,
    })
    @GetOrSetCache({
        baseKey: 'lockedTokenWrapper',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async energyFactoryAddress(): Promise<string> {
        return await this.energyFactoryAddressRaw();
    }

    async energyFactoryAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }
}
