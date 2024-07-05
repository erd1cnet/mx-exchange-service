import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonAppModule } from 'src/common.app.module';
import { TimescaleDBQueryService } from './timescaledb.query.service';
import { TimescaleDBWriteService } from './timescaledb.write.service';
import {
    CloseDaily,
    CloseHourly,
    PDCloseMinute,
    PriceCandleHourly,
    PriceCandleMinute,
    PriceCandleDaily,
    SumDaily,
    SumHourly,
    TokenBurnedWeekly,
    XExchangeAnalyticsEntity,
} from './entities/timescaledb.entities';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getCacheModule(),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            database: 'development',
            username: 'admin',
            password: 'admin',
            applicationName: 'xExchangeService',
            ssl: false,
            entities: ['dist/**/*.entities.{ts,js}'],
        }),
        TypeOrmModule.forFeature([
            XExchangeAnalyticsEntity,
            SumDaily,
            SumHourly,
            CloseDaily,
            CloseHourly,
            TokenBurnedWeekly,
            PDCloseMinute,
            PriceCandleMinute,
            PriceCandleHourly,
            PriceCandleDaily,
        ]),
    ],
    providers: [TimescaleDBQueryService, TimescaleDBWriteService],
    exports: [TimescaleDBQueryService, TimescaleDBWriteService],
})
export class TimescaleDBModule {}
