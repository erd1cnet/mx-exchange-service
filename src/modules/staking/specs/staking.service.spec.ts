import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { StakingService } from '../services/staking.service';
import { AbiStakingService } from '../services/staking.abi.service';
import { StakingGetterService } from '../services/staking.getter.service';
import { StakingGetterServiceMock } from '../mocks/staking.getter.service.mock';
import { StakingComputeService } from '../services/staking.compute.service';
import { MXProxyServiceMock } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { MXApiServiceMock } from 'src/services/multiversx-communication/mx.api.service.mock';
import { RemoteConfigGetterServiceProvider } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { Address } from '@multiversx/sdk-core';
import { TokenGetterServiceProvider } from '../../tokens/mocks/token.getter.service.mock';

describe('StakingService', () => {
    let service: StakingService;

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
    };

    const MXProxyServiceProvider = {
        provide: MXProxyService,
        useClass: MXProxyServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
            ],
            providers: [
                StakingService,
                AbiStakingService,
                StakingGetterServiceProvider,
                StakingComputeService,
                ContextGetterServiceProvider,
                RemoteConfigGetterServiceProvider,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                MXGatewayService,
                ApiConfigService,
                TokenGetterServiceProvider,
            ],
        }).compile();

        service = module.get<StakingService>(StakingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get farms staking', async () => {
        const farmsStaking = await service.getFarmsStaking();
        expect(farmsStaking.length).toBeGreaterThanOrEqual(1);
    });

    it('should get rewards for position', async () => {
        const rewards = await service.getRewardsForPosition({
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            liquidity: '1000000000000000',
            identifier: 'MEXFARML-772223-14',
            attributes:
                'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
            vmQuery: false,
            user: Address.Zero().bech32(),
        });
        expect(rewards).toEqual({
            decodedAttributes: {
                attributes:
                    'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                compoundedReward: '0',
                currentFarmAmount:
                    '519205458813209018315265407815173060004346493743728287017479820327455628280230924139593728',
                identifier: 'MEXFARML-772223-14',
                rewardPerShare: '0',
                type: 'stakingFarmToken',
            },
            rewards: '150000000000000001046423',
        });
    });

    it('should get batch rewards for position', async () => {
        const batchRewards = await service.getBatchRewardsForPosition([
            {
                farmAddress:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                liquidity: '1000000000000000',
                identifier: 'MEXFARML-772223-14',
                attributes:
                    'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                vmQuery: false,
                user: Address.Zero().bech32(),
            },
        ]);
        expect(batchRewards).toEqual([
            {
                decodedAttributes: {
                    attributes:
                        'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                    compoundedReward: '0',
                    currentFarmAmount:
                        '519205458813209018315265407815173060004346493743728287017479820327455628280230924139593728',
                    identifier: 'MEXFARML-772223-14',
                    rewardPerShare: '0',
                    type: 'stakingFarmToken',
                },
                rewards: '150000000000000001046423',
            },
        ]);
    });
});
