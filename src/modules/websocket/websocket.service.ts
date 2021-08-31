import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import WebSocket from 'ws';
import { AbiPairService } from '../pair/abi-pair.service';
import { EnterFarmEvent } from './entities/farm/enterFarm.event';
import { ExitFarmEvent } from './entities/farm/exitFarm.event';
import { RewardsEvent } from './entities/farm/rewards.event';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapEvent } from './entities/pair/swap.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from './entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from './entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from './entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from './entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from './entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from './entities/proxy/pairProxy.event';

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
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                identifier: 'swap_no_fee_and_forward',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqnle99utjmjumkrrw5743409yn0sxqwc70n4svqtd8c',
                identifier: 'enter_farm',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqnle99utjmjumkrrw5743409yn0sxqwc70n4svqtd8c',
                identifier: 'exit_farm',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqnle99utjmjumkrrw5743409yn0sxqwc70n4svqtd8c',
                identifier: 'claim_rewards',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqnle99utjmjumkrrw5743409yn0sxqwc70n4svqtd8c',
                identifier: 'compound_rewards',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'add_liquidity_proxy',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'remove_liquidity_proxy',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'enter_farm_proxy',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'exit_farm_proxy',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'claim_rewards_farm_proxy',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqdkwc004l832gtshfp4k2x62upawv46xa0n4s7746h6',
                identifier: 'compound_rewards_farm_proxy',
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
                    case 'swap_no_fee_and_forward':
                        const swapNoFeeAndForwardEvent = new SwapNoFeeEvent(
                            rawEvent,
                        );
                        console.log({
                            swapNoFeeAndForwardEvent: swapNoFeeAndForwardEvent.toPlainObject(),
                        });
                        break;
                    case 'enter_farm':
                        const enterFarmEvent = new EnterFarmEvent(rawEvent);
                        console.log({
                            enterFarmEvent: enterFarmEvent.toPlainObject(),
                        });
                        break;
                    case 'exit_farm':
                        const exitFarmEvent = new ExitFarmEvent(rawEvent);
                        console.log({
                            exitFarmEvent: exitFarmEvent.toPlainObject(),
                        });
                        break;
                    case 'claim_rewards':
                        const claimRewardsEvent = new RewardsEvent(rawEvent);
                        console.log({
                            claimRewardsEvent: claimRewardsEvent.toPlainObject(),
                        });
                        break;
                    case 'compound_rewards':
                        const compoundRewardsEvent = new RewardsEvent(rawEvent);
                        console.log({
                            compoundRewardsEvent: compoundRewardsEvent.toPlainObject(),
                        });
                        break;
                    case 'add_liquidity_proxy':
                        const addLiquidityProxyEvent = new AddLiquidityProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            addLiquidityProxyEvent: addLiquidityProxyEvent.toPlainObject(),
                        });
                        break;
                    case 'remove_liquidity_proxy':
                        const removeLiquidityProxyEvent = new PairProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            removeLiquidityProxyEvent: removeLiquidityProxyEvent.toPlainObject(),
                        });
                        break;
                    case 'enter_farm_proxy':
                        const enterFarmProxyEvent = new EnterFarmProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            enterFarmProxyEvent: enterFarmProxyEvent.toPlainObject(),
                        });
                        break;
                    case 'exit_farm_proxy':
                        const exitFarmProxyEvent = new ExitFarmProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            exitFarmProxyEvent: exitFarmProxyEvent.toPlainObject(),
                        });
                        break;
                    case 'claim_rewards_farm_proxy':
                        const claimRewardsProxyEvent = new ClaimRewardsProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            claimRewardsProxyEvent: claimRewardsProxyEvent.toPlainObject(),
                        });
                        break;
                    case 'compound_rewards_farm_proxy':
                        const compoundRewardsProxyEvent = new CompoundRewardsProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            compoundRewardsProxyEvent: compoundRewardsProxyEvent.toPlainObject(),
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
