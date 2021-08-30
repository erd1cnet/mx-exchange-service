import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import WebSocket from 'ws';
import { AbiPairService } from '../pair/abi-pair.service';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapEvent } from './entities/pair/swap.event';

@Injectable()
export class WebSocketService {
    private ws = new WebSocket(process.env.WEBSOCKET_URL);
    private subEvent = {
        subscriptionEntries: [
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                identifier: 'swap',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                identifier: 'add_liquidity',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                identifier: 'remove_liquidity',
            },
        ],
    };

    constructor(
        private readonly cachingService: CachingService,
        private readonly abiPairService: AbiPairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @Inject('PUBSUB_SERVICE') private readonly client: ClientProxy,
    ) {
        this.ws.on('open', () => {
            this.logger.info('Subscribe to events');
            this.ws.send(JSON.stringify(this.subEvent));
        });

        this.ws.on('message', message => {
            const rawEvents = JSON.parse(message.toString());
            rawEvents.map(async rawEvent => {
                switch (rawEvent.identifier) {
                    case 'swap':
                        const swapEvent = new SwapEvent(rawEvent);
                        console.log({ swapEvent: swapEvent.toPlainObject() });
                        const pairInfoMetadata = await this.abiPairService.getPairInfoMetadata(
                            swapEvent.getAddress(),
                        );

                        const cacheKey = generateCacheKeyFromParams(
                            'pair',
                            swapEvent.getAddress(),
                            'valueLocked',
                        );
                        await this.cachingService.setCache(
                            cacheKey,
                            pairInfoMetadata,
                            oneSecond() * 30,
                        );
                        await this.client.emit('deleteCacheKeys', [cacheKey]);
                        break;
                    case 'add_liquidity':
                        const addLiquidityEvent = new AddLiquidityEvent(
                            rawEvent,
                        );
                        console.log({
                            addLiquidityEvent: addLiquidityEvent.toPlainObject(),
                        });
                        break;
                    case 'remove_liquidity':
                        const removeLiquidityEvent = new RemoveLiquidityEvent(
                            rawEvent,
                        );
                        console.log({
                            removeLiquidityEvent: removeLiquidityEvent.toPlainObject(),
                        });
                        break;
                }
            });
        });
    }

    send(data: any) {
        this.ws.send(data);
    }
}
