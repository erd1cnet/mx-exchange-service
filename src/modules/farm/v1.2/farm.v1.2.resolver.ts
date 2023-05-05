import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmMigrationConfig } from '../models/farm.model';
import { FarmModelV1_2 } from '../models/farm.v1.2.model';
import { FarmAbiServiceV1_2 } from './services/farm.v1.2.abi.service';
import { FarmServiceV1_2 } from './services/farm.v1.2.service';
import { FarmComputeServiceV1_2 } from './services/farm.v1.2.compute.service';
import { LockedAssetModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';

@Resolver(() => FarmModelV1_2)
export class FarmResolverV1_2 extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_2,
        protected readonly farmService: FarmServiceV1_2,
        protected readonly farmCompute: FarmComputeServiceV1_2,
    ) {
        super(farmAbi, farmService, farmCompute);
    }

    @ResolveField()
    async lockedAssetFactory(
        @Parent() parent: FarmModelV1_2,
    ): Promise<LockedAssetModel> {
        const address = await this.farmAbi.lockedAssetFactoryAddress(
            parent.address,
        );
        return new LockedAssetModel({ address });
    }

    @ResolveField()
    async farmingTokenReserve(
        @Parent() parent: FarmModelV1_2,
    ): Promise<string> {
        return this.farmAbi.farmingTokenReserve(parent.address);
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModelV1_2): Promise<string> {
        return this.farmAbi.undistributedFees(parent.address);
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModelV1_2): Promise<string> {
        return this.farmAbi.currentBlockFee(parent.address);
    }

    @ResolveField()
    async aprMultiplier(@Parent() parent: FarmModelV1_2): Promise<number> {
        return this.farmAbi.lockedRewardAprMuliplier(parent.address);
    }

    @ResolveField()
    async unlockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return this.farmCompute.unlockedRewardsAPR(parent.address);
    }

    @ResolveField()
    async lockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return this.farmCompute.lockedRewardsAPR(parent.address);
    }

    @ResolveField()
    async lockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return this.farmCompute.lockedFarmingTokenReserve(parent.address);
    }

    @ResolveField()
    async unlockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return this.farmCompute.unlockedFarmingTokenReserve(parent.address);
    }

    @ResolveField()
    async lockedFarmingTokenReserveUSD(parent: FarmModelV1_2): Promise<string> {
        return this.farmCompute.lockedFarmingTokenReserveUSD(parent.address);
    }

    @ResolveField()
    async unlockedFarmingTokenReserveUSD(
        parent: FarmModelV1_2,
    ): Promise<string> {
        return this.farmCompute.unlockedFarmingTokenReserveUSD(parent.address);
    }

    @ResolveField()
    async migrationConfig(
        @Parent() parent: FarmModelV1_2,
    ): Promise<FarmMigrationConfig> {
        return this.farmAbi.farmMigrationConfiguration(parent.address);
    }
}
