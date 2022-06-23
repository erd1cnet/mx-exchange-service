import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../../../services/context/context.service';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../services/farm.service';
import { AbiFarmService } from '../services/abi-farm.service';
import { AbiFarmServiceMock } from '../mocks/abi.farm.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { ContextServiceMock } from '../../../services/context/mocks/context.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmComputeService } from '../services/farm.compute.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../../../modules/pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { PriceFeedService } from '../../../services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from '../../../services/price-feed/price.feed.service.mock';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';

describe('FarmService', () => {
    let service: FarmComputeService;

    const AbiFarmServiceProvider = {
        provide: AbiFarmService,
        useClass: AbiFarmServiceMock,
    };

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                FarmGetterServiceProvider,
                FarmComputeService,
                ElrondApiServiceProvider,
                ContextServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
                WrapServiceProvider,
                FarmService,
            ],
        }).compile();

        service = module.get<FarmComputeService>(FarmComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get unlocked rewards APR', async () => {
        const farmAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmAPR).toEqual('10');
    });

    it('should compute farmed token price USD', async () => {
        const farmedTokenPriceUSD = await service.computeFarmedTokenPriceUSD(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(farmedTokenPriceUSD).toEqual('0');
    });

    it('should compute farming token price USD', async () => {
        const farmingTokenPriceUSD = await service.computeFarmingTokenPriceUSD(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(farmingTokenPriceUSD).toEqual('0');
    });

    it('should compute farm locked value USD', async () => {
        const farmLockedValueUSD = await service.computeFarmLockedValueUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmLockedValueUSD).toEqual('0.00000000024');
    });

    it('should compute farm rewards for position', async () => {
        const farmRewardsForPosition = await service.computeFarmRewardsForPosition(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            '100',
            new FarmTokenAttributesModel({
                identifier: undefined,
                attributes: undefined,
                rewardPerShare: '1',
                originalEnteringEpoch: 0,
                enteringEpoch: 0,
                aprMultiplier: 1,
                initialFarmingAmount: '10',
                compoundedReward: '5',
                currentFarmAmount: '100',
                lockedRewards: true,
            }),
        );
        expect(farmRewardsForPosition.toFixed()).toEqual('0.0199');
    });

    it('should compute locked farming token reserve', async () => {
        const lockedFarmingTokenReserve = await service.computeLockedFarmingTokenReserve(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(lockedFarmingTokenReserve).toEqual('400000');
    });

    it('should compute unlocked farming token reserve', async () => {
        const unlockedFarmingTokenReserve = await service.computeUnlockedFarmingTokenReserve(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(unlockedFarmingTokenReserve).toEqual('200000');
    });

    it('should compute locked farming token reserve USD', async () => {
        const lockedFarmingTokenReserveUSD = await service.computeLockedFarmingTokenReserveUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(lockedFarmingTokenReserveUSD).toEqual('0.00000000016');
    });

    it('should compute unlocked farming token reserve USD', async () => {
        const unlockedFarmingTokenReserveUSD = await service.computeUnlockedFarmingTokenReserveUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(unlockedFarmingTokenReserveUSD).toEqual('0.00000000008');
    });

    it('should compute virtual value locked USD', async () => {
        const virtualValueLockedUSD = await service.computeVirtualValueLockedUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(virtualValueLockedUSD).toEqual('0.0000000004');
    });

    it('should compute anual rewards USD', async () => {
        const anualRewardsUSD = await service.computeAnualRewardsUSD(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(anualRewardsUSD).toEqual('0');
    });

    it('should compute unlocked rewards APR', async () => {
        const unlockedRewardsAPR = await service.computeUnlockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(unlockedRewardsAPR).toEqual('10');
    });

    it('should compute locked rewards APR', async () => {
        const lockedRewardsAPR = await service.computeLockedRewardsAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(lockedRewardsAPR).toEqual('10');
    });

    it('should compute farm APR', async () => {
        const farmAPR_0 = await service.computeFarmAPR(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(farmAPR_0).toEqual(null);

        const farmAPR_1 = await service.computeFarmAPR('farm_address_2');
        expect(farmAPR_1).toEqual('10');
    });
});
