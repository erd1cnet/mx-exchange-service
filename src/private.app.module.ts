import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';
import { PairModule } from './modules/pair/pair.module';
import { TokenController } from './modules/tokens/token.controller';
import { TokenModule } from './modules/tokens/token.module';

@Module({
    imports: [CommonAppModule, PairModule, TokenModule],
    controllers: [MetricsController, TokenController],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
