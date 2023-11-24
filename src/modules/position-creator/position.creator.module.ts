import { Module } from '@nestjs/common';
import { PositionCreatorResolver } from './position.creator.resolver';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { PositionCreatorComputeService } from './services/position.creator.compute';
import { PositionCreatorTransactionService } from './services/position.creator.transaction';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { AutoRouterModule } from '../auto-router/auto-router.module';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { StakingModule } from '../staking/staking.module';
import { TokenModule } from '../tokens/token.module';
import { PositionCreatorTransactionResolver } from './position.creator.transaction.resolver';

@Module({
    imports: [
        PairModule,
        RouterModule,
        AutoRouterModule,
        FarmModuleV2,
        StakingModule,
        StakingProxyModule,
        TokenModule,
        MXCommunicationModule,
    ],
    providers: [
        PositionCreatorComputeService,
        PositionCreatorTransactionService,
        PositionCreatorResolver,
        PositionCreatorTransactionResolver,
    ],
    exports: [],
})
export class PositionCreatorModule {}
