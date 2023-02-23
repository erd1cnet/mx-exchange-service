import { Module } from '@nestjs/common';
import { FeesCollectorGetterService } from './services/fees-collector.getter.service';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import {
    FeesCollectorResolver,
    UserEntryFeesCollectorResolver,
} from './fees-collector.resolver';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FeesCollectorService } from './services/fees-collector.service';
import { WeeklyRewardsSplittingModule } from '../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { WeekTimekeepingModule } from '../../submodules/week-timekeeping/week-timekeeping.module';
import { FeesCollectorSetterService } from './services/fees-collector.setter.service';
import { FeesCollectorComputeService } from './services/fees-collector.compute.service';
import { ContextModule } from '../../services/context/context.module';

@Module({
    imports: [
        MXCommunicationModule,
        CachingModule,
        WeekTimekeepingModule.register(FeesCollectorAbiService),
        WeeklyRewardsSplittingModule.register(FeesCollectorAbiService),
        ContextModule,
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorGetterService,
        FeesCollectorSetterService,
        FeesCollectorComputeService,
        FeesCollectorResolver,
        UserEntryFeesCollectorResolver,
    ],
    exports: [
        FeesCollectorAbiService,
        FeesCollectorSetterService,
        FeesCollectorGetterService,
        FeesCollectorService,
    ],
})
export class FeesCollectorModule {}
