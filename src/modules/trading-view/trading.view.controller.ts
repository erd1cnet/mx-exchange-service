import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { BarsQueryArgs, BarsResponse } from './dtos/bars.response';
import { TradingViewService } from './services/trading.view.service';
import { TokenService } from '../tokens/services/token.service';

@Controller('trading-view')
export class TradingViewController {
    constructor(
        private readonly tradingViewService: TradingViewService,
        private readonly tokenService: TokenService,
    ) {}

    @Get('/config')
    async config() {
        return {
            supported_resolutions: [
                '1',
                '5',
                '15',
                '30',
                '60',
                '240',
                '1D',
                '7D',
                '1M',
            ],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_group_request: false,
            supports_search: true,
            supports_time: false,
        };
    }

    @Get('/symbols')
    async symbolResolve(@Query('symbol') symbol: string) {
        const { ticker } = await this.tradingViewService.resolveSymbol(symbol);

        return {
            ticker: symbol,
            name: ticker,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'xExchange',
            minmov: 1,
            pricescale: 100,
            has_daily: true,
            has_intraday: true,
            has_weekly_and_monthly: true,
            has_empty_bars: true,
            visible_plots_set: 'ohlc',
            supported_resolutions: [
                '1',
                '5',
                '15',
                '30',
                '60',
                '240',
                '1D',
                '7D',
                '1M',
            ],
            data_status: 'streaming',
        };
    }

    @Get('/history')
    async historyBars(
        @Query(new ValidationPipe()) queryArgs: BarsQueryArgs,
    ): Promise<BarsResponse> {
        return await this.tradingViewService.getBars(queryArgs);
    }
}
