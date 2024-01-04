import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
    TokenDistributionModel,
    UserInfoByWeekModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EnergyModel } from '../energy/models/energy.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import { scAddress } from '../../config';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FeesCollectorComputeService } from '../fees-collector/services/fees-collector.compute.service';
import { FarmComputeServiceV2 } from '../farm/v2/services/farm.v2.compute.service';
import { StakingComputeService } from '../staking/services/staking.compute.service';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';

@Resolver(() => UserInfoByWeekModel)
export class UserInfoByWeekResolver {
    constructor(
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly stakingCompute: StakingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly remoteConfig: RemoteConfigGetterService,
    ) {}

    @ResolveField(() => EnergyModel)
    async energyForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EnergyModel> {
        return this.weeklyRewardsSplittingAbi.userEnergyForWeek(
            parent.scAddress,
            parent.userAddress,
            parent.week,
        );
    }

    @ResolveField()
    async apr(@Parent() parent: UserInfoByWeekModel): Promise<string> {
        return this.weeklyRewardsSplittingCompute.userApr(
            parent.scAddress,
            parent.userAddress,
            parent.week,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async rewardsForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        if (parent.scAddress === scAddress.feesCollector) {
            return this.feesCollectorCompute.userRewardsForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            );
        }

        const stakingAddresses = await this.remoteConfig.getStakingAddresses();
        if (stakingAddresses.includes(parent.scAddress)) {
            return this.stakingCompute.userRewardsForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            );
        }

        return this.farmComputeV2.userRewardsForWeek(
            parent.scAddress,
            parent.userAddress,
            parent.week,
        );
    }

    @ResolveField(() => [TokenDistributionModel])
    async rewardsDistributionForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<TokenDistributionModel[]> {
        if (parent.scAddress === scAddress.feesCollector) {
            return this.feesCollectorCompute.userRewardsDistributionForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            );
        }
        const stakingAddresses = await this.remoteConfig.getStakingAddresses();
        if (stakingAddresses.includes(parent.scAddress)) {
            return this.stakingCompute.userRewardsDistributionForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            );
        }

        return this.farmComputeV2.userRewardsDistributionForWeek(
            parent.scAddress,
            parent.userAddress,
            parent.week,
        );
    }
}
