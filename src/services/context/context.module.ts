import { forwardRef, Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { ContextService } from './context.service';
import { RouterModule } from '../../modules/router/router.module';
import { CachingModule } from '../caching/cache.module';
import { ContextGetterService } from './context.getter.service';
import { ContextTransactionsService } from './context.transactions.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        forwardRef(() => RouterModule),
    ],
    providers: [
        ContextService,
        ContextGetterService,
        ContextTransactionsService,
    ],
    exports: [ContextService, ContextGetterService, ContextTransactionsService],
})
export class ContextModule {}
