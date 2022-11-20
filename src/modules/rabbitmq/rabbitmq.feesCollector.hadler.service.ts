import {
    FEES_COLLECTOR_EVENTS,
    RawEventType,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import {
    FeesCollectorAbiService
} from "../fees-collector/services/fees-collector.abi.service";
import {
    DepositSwapFeesEvent
} from "@elrondnetwork/erdjs-dex/dist/event-decoder/fees-collector/depositSwapFees.event";
import {
    FeesCollectorSetterService
} from "../fees-collector/services/fees-collector.setter.service";
import {
    FeesCollectorGetterService
} from "../fees-collector/services/fees-collector.getter.service";
import { scAddress } from "../../config";
import BigNumber from "bignumber.js";
import {
    RabbitmqWeeklyRewardsSplittingHadlerService
} from "./rabbitmq.weeklyRewardsSplitting.hadler.service";

@Injectable()
export class RabbitmqFeesCollectorHadlerService extends RabbitmqWeeklyRewardsSplittingHadlerService {
    protected invalidatedKeys = [];

    constructor(
        protected readonly abi: FeesCollectorAbiService,
        protected readonly setter: FeesCollectorSetterService,
        protected readonly getter: FeesCollectorGetterService,
        @Inject(PUB_SUB) protected pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(abi, setter, getter, pubSub, logger);
    }

    async handleDepositSwapFeesEvent(rawEvent: RawEventType): Promise<void> {
        const event = new DepositSwapFeesEvent(rawEvent);
        const topics = event.getTopics();
        let cacheKey: string;
        if (topics.payment.tokenNonce) {
            const accumulatedLockedFees = await this.getter.getAccumulatedLockedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier
            );
            const updatedAccumulatedLockedFees = accumulatedLockedFees.map( token => {
                if (token.nonce === topics.payment.tokenNonce) {
                    token.amount  = new BigNumber(token.amount).plus(topics.payment.amount).toFixed()
                }
                return token
            });
            cacheKey = await this.setter.setAccumulatedLockedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier,
                updatedAccumulatedLockedFees
            );
        } else {
            const accumulatedFees = await this.getter.getAccumulatedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier
            );
            cacheKey = await this.setter.setAccumulatedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier,
                new BigNumber(accumulatedFees).plus(topics.payment.amount).toFixed()
            );
        }

        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
        await this.pubSub.publish(FEES_COLLECTOR_EVENTS.DEPOSIT_SWAP_FEES, {
            depositSwapFeesEvent: event,
        });
    }
}
