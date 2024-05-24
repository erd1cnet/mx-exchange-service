import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';

export enum PairSortableFields {
    TRADES_COUNT = 'trades_count',
    TVL = 'total_value_locked',
    VOLUME_24 = 'volume_24h',
    FEES_24 = 'fees_24h',
    DEPLOYED_AT = 'deployed_at',
}

export enum PairSortOrder {
    ASC = 'ascending',
    DESC = 'descending',
}

registerEnumType(PairSortableFields, { name: 'PairSortableFields' });
registerEnumType(PairSortOrder, { name: 'PairSortOrder' });

@ArgsType()
export class PairFilterArgs {
    @Field({ nullable: true })
    address: string;
    @Field({ nullable: true })
    firstTokenID: string;
    @Field({ nullable: true })
    secondTokenID: string;
    @Field(() => Boolean)
    issuedLpToken = true;
    @Field({ nullable: true })
    state: string;
    @Field({ nullable: true })
    minVolume: number;
    @Field({ nullable: true })
    feeState: boolean;
    @Field({ nullable: true })
    minLockedValueUSD: number;
}

@InputType()
export class PairsFilter {
    @Field({ nullable: true })
    address: string;
    @Field({ nullable: true })
    firstTokenID: string;
    @Field({ nullable: true })
    secondTokenID: string;
    @Field(() => Boolean)
    issuedLpToken = true;
    @Field({ nullable: true })
    state: string;
    @Field({ nullable: true })
    minVolume: number;
    @Field({ nullable: true })
    feeState: boolean;
    @Field({ nullable: true })
    minLockedValueUSD: number;
    @Field({ nullable: true })
    minTradesCount: number;
    @Field({ nullable: true })
    hasFarms: boolean;
    @Field({ nullable: true })
    hasDualFarms: boolean;
    @Field({ nullable: true })
    minDeployedAt: number;
}

@InputType()
export class PairSortingArgs {
    @Field(() => PairSortableFields, { nullable: true })
    sortField?: string;

    @Field(() => PairSortOrder, { defaultValue: PairSortOrder.ASC })
    sortOrder: string;
}
