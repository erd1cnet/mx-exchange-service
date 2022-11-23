import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LockedTokenWrapperModel  {
    @Field()
    address: string;
    @Field()
    lockedTokenId: string
    @Field()
    wrappedTokenId: string

    constructor(init?: Partial<LockedTokenWrapperModel>) {
        Object.assign(this, init);
    }
}
