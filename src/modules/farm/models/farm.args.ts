import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CalculateRewardsArgs {
    @Field()
    farmAddress: string;
    @Field()
    liquidity: string;
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field(type => Boolean)
    vmQuery = false;
}

@InputType()
export class BatchFarmRewardsComputeArgs {
    @Field(type => [CalculateRewardsArgs])
    farmsPositions: Array<{
        farmAddress: string;
        liquidity: string;
        identifier: string;
        attributes: string;
        vmQuery: boolean;
    }>;
}

@ArgsType()
export class EnterFarmArgs {
    @Field()
    farmAddress: string;
    @Field()
    tokenInID: string;
    @Field()
    amount: string;
    @Field({ nullable: true })
    lockRewards: boolean;
}

@ArgsType()
export class SftFarmInteractionArgs {
    @Field()
    farmAddress: string;
    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    amount: string;
}

@ArgsType()
export class EnterFarmBatchArgs {
    @Field()
    farmAddress: string;

    @Field()
    tokenInID: string;
    @Field()
    amountIn: string;
    @Field({ nullable: true })
    lockRewards: boolean;

    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    amount: string;
}
@ArgsType()
export class ExitFarmArgs extends SftFarmInteractionArgs {}

@ArgsType()
export class ClaimRewardsArgs extends SftFarmInteractionArgs {}

@ArgsType()
export class CompoundRewardsArgs extends SftFarmInteractionArgs {}
