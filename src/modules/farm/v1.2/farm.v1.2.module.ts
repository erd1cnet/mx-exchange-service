import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmAbiServiceV1_2 } from './services/farm.v1.2.abi.service';
import { FarmComputeServiceV1_2 } from './services/farm.v1.2.compute.service';
import { FarmGetterServiceV1_2 } from './services/farm.v1.2.getter.service';
import { FarmResolverV1_2 } from './farm.v1.2.resolver';
import { FarmTransactionServiceV1_2 } from './services/farm.v1.2.transaction.service';
import { FarmServiceV1_2 } from './services/farm.v1.2.service';

@Module({
    imports: [
        FarmBaseModule,
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmServiceV1_2,
        FarmAbiServiceV1_2,
        FarmGetterServiceV1_2,
        FarmComputeServiceV1_2,
        FarmTransactionServiceV1_2,
        FarmResolverV1_2,
    ],
    exports: [
        FarmServiceV1_2,
        FarmAbiServiceV1_2,
        FarmComputeServiceV1_2,
        FarmTransactionServiceV1_2,
    ],
})
export class FarmModuleV1_2 {}
