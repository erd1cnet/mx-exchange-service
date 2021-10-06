import { Inject, UseGuards } from '@nestjs/common';
import { Query, Args, Resolver } from '@nestjs/graphql';
import { UserToken } from './models/user.model';
import { UserNftTokens } from './nfttokens.union';
import { UserService } from './user.service';
import { PaginationArgs } from '../dex.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

@Resolver()
export class UserResolver {
    constructor(@Inject(UserService) private userService: UserService) {}

    @UseGuards(GqlAuthGuard)
    @Query(returns => [UserToken])
    async tokens(
        @Args() pagination: PaginationArgs,
        @User() user: any,
    ): Promise<UserToken[]> {
        return await this.userService.getAllEsdtTokens(
            user.publicKey,
            pagination,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [UserNftTokens])
    async nfts(
        @Args() pagination: PaginationArgs,
        @User() user: any,
    ): Promise<Array<typeof UserNftTokens>> {
        return await this.userService.getAllNftTokens(
            user.publicKey,
            pagination,
        );
    }

    @Query(returns => Number)
    async getUserWorth(
        @Args('address', { type: () => String }) address: string,
    ): Promise<number> {
        return this.userService.computeUserWorth(address);
    }
}
