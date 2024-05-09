import { Test, TestingModule } from '@nestjs/testing';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { PairsData, Tokens } from '../mocks/pair.constants';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import BigNumber from 'bignumber.js';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { AssetsModel } from 'src/modules/tokens/models/assets.model';
import { RolesModel } from 'src/modules/tokens/models/roles.model';
import { PairAbiService } from '../services/pair.abi.service';
import { ElasticService } from 'src/helpers/elastic.service';

describe('PairService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                PairComputeService,
                PairService,
                PairAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                TokenComputeService,
                AnalyticsQueryServiceProvider,
                ContextGetterServiceProvider,
                ApiConfigService,
                MXApiServiceProvider,
                ElasticService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<PairComputeService>(PairComputeService);

        expect(service).toBeDefined();
    });

    it('compute first token price', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const routerAbi = module.get<RouterAbiService>(RouterAbiService);
        const pairsAddress = await routerAbi.pairsAddress();

        for (const pairAddress of pairsAddress) {
            const tokenPrice = await service.computeFirstTokenPrice(
                pairAddress,
            );
            expect(tokenPrice).toEqual(PairsData(pairAddress).firstTokenPrice);
        }
    });

    it('compute second token price', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPrice = await service.computeSecondTokenPrice(pairAddress);
        expect(tokenPrice).toEqual(PairsData(pairAddress).secondTokenPrice);
    });

    it('compute first token price USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPriceUSD = await service.computeFirstTokenPriceUSD(
            pairAddress,
        );
        expect(tokenPriceUSD).toEqual(
            PairsData(pairAddress).firstTokenPriceUSD,
        );
    });

    it('compute second token price USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPriceUSD = await service.computeSecondTokenPriceUSD(
            pairAddress,
        );
        expect(tokenPriceUSD).toEqual(
            PairsData(pairAddress).secondTokenPriceUSD,
        );
    });

    it('compute first token locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD =
            await service.computeFirstTokenLockedValueUSD(pairAddress);
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).firstTokenLockedValueUSD,
        );
    });

    it('compute second token locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD =
            await service.computeSecondTokenLockedValueUSD(pairAddress);
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).secondTokenLockedValueUSD,
        );
    });

    it('compute locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD = await service.computeLockedValueUSD(
            pairAddress,
        );
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).lockedValueUSD,
        );
    });

    it('should get lpToken Price in USD from pair', async () => {
        const service = module.get<PairComputeService>(PairComputeService);

        let lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );
        expect(lpTokenPriceUSD).toEqual('20');

        lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000013',
            ).bech32(),
        );

        expect(lpTokenPriceUSD).toEqual('2000000000000');
    });

    it('should get pair type: Core', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000013',
            ).bech32(),
        );
        expect(type).toEqual('Core');
    });

    it('should get pair type: Ecosystem', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );
        expect(type).toEqual('Ecosystem');
    });

    it('should compute permanent locked value USD with 0 decimals', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairService = module.get<PairService>(PairService);
        const pairAbi = module.get<PairAbiService>(PairAbiService);

        jest.spyOn(pairAbi, 'firstTokenID').mockResolvedValue('TOK7-123456');
        jest.spyOn(pairAbi, 'secondTokenID').mockResolvedValue('USDC-123456');
        jest.spyOn(pairAbi, 'pairInfoMetadata').mockResolvedValue({
            reserves0: '0',
            reserves1: '0',
            totalSupply: '0',
        });
        jest.spyOn(pairService, 'getFirstToken').mockResolvedValue(
            new EsdtToken({
                identifier: 'TOK7-123456',
                decimals: 0,
            }),
        );
        jest.spyOn(pairService, 'getSecondToken').mockResolvedValue(
            Tokens('USDC-123456'),
        );

        const lockedValueUSD = await service.computePermanentLockedValueUSD(
            Address.Zero().bech32(),
            new BigNumber('1000'),
            new BigNumber('500000000'),
        );

        expect(lockedValueUSD.toFixed()).toEqual('500');
    });

    it('should compute permanent locked value USD with decimals', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairService = module.get<PairService>(PairService);
        const pairAbi = module.get<PairAbiService>(PairAbiService);

        jest.spyOn(pairAbi, 'firstTokenID').mockResolvedValue('MEX-123456');
        jest.spyOn(pairAbi, 'secondTokenID').mockResolvedValue('USDC-123456');
        jest.spyOn(pairAbi, 'pairInfoMetadata').mockResolvedValue({
            reserves0: '0',
            reserves1: '0',
            totalSupply: '0',
        });
        jest.spyOn(pairService, 'getFirstToken').mockResolvedValue(
            Tokens('MEX-123456'),
        );
        jest.spyOn(pairService, 'getSecondToken').mockResolvedValue(
            Tokens('USDC-123456'),
        );

        const lockedValueUSD = await service.computePermanentLockedValueUSD(
            Address.Zero().bech32(),
            new BigNumber('50000000000000000000000'),
            new BigNumber('500000000'),
        );

        expect(lockedValueUSD.toFixed()).toEqual('0.001');
    });
});
