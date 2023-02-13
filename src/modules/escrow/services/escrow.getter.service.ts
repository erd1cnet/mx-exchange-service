import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { EscrowAbiService } from './escrow.abi.service';

@Injectable()
export class EscrowGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly escrowAbi: EscrowAbiService,
    ) {
        super(cachingService, logger);

        this.baseKey = 'escrow';
    }

    async getEnergyFactoryAddress(): Promise<string> {
        return await this.getData(
            'energyFactoryAddress',
            () => this.escrowAbi.getEnergyFactoryAddress(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            'lockedTokenID',
            () => this.escrowAbi.getLockedTokenID(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getMinLockEpochs(): Promise<number> {
        return await this.getData(
            'minLockEpochs',
            () => this.escrowAbi.getMinLockEpochs(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getEpochCooldownDuration(): Promise<number> {
        return await this.getData(
            'epochCooldownDuration',
            () => this.escrowAbi.getEpochCooldownDuration(),
            oneSecond(),
            oneSecond(),
        );
    }
}
