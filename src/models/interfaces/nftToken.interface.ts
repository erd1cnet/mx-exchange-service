import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { IToken } from './token.interface';

@InterfaceType()
export abstract class INftToken extends IToken {
    @Field() canAddSpecialRoles: boolean;
    @Field() canTransferNFTCreateRole: boolean;
    @Field() NFTCreateStopped: boolean;
    @Field() wiped: string;

    @Field({ nullable: true })
    attributes?: string;
    @Field({ nullable: true })
    creator?: string;
    @Field(type => Int, { nullable: true }) nonce?: number;
    @Field({ nullable: true }) royalties?: string;
}
