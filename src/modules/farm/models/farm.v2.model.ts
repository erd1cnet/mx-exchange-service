import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel } from './farm.model';

@ObjectType()
export class FarmModelV2 extends BaseFarmModel {
    @Field()
    boostedYieldsRewardsPercenatage: number;

    @Field(() => Int)
    currentWeek: number;

    @Field()
    energyFactoryAddress: string;

    constructor(init?: Partial<FarmModelV2>) {
        super(init);
        Object.assign(this, init);
    }
}
