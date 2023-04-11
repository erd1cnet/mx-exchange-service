import { Test, TestingModule } from '@nestjs/testing';
import { PairAbiService } from '../services/pair.abi.service';
import { PairService } from '../services/pair.service';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairAbiServiceMock } from '../mocks/pair.abi.service.mock';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceStub } from '../mocks/pair-getter-service-stub.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';

describe('PairService', () => {
    let service: PairService;

    const PairAbiServiceProvider = {
        provide: PairAbiService,
        useClass: PairAbiServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairAbiServiceProvider,
                PairGetterServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                RouterGetterServiceProvider,
            ],
        }).compile();

        service = module.get<PairService>(PairService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get amount in', async () => {
        const amountIn = await service.getAmountIn(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            '10000000000000000',
        );
        expect(amountIn).toEqual('20262808627903914');
    });

    it('should get amount out', async () => {
        const amountOut = await service.getAmountOut(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            '10000000000000000',
        );
        expect(amountOut).toEqual('19743160687941225');
    });

    it('should get equivalent for liquidity', async () => {
        const equivalent = await service.getEquivalentForLiquidity(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'TOK1-1111',
            '10000000000000000',
        );
        expect(equivalent.toFixed()).toEqual('20000000000000000');
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });

    it('should get liquidity position from pair in USD', async () => {
        const liquidityPositionUSD = await service.getLiquidityPositionUSD(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            '10000',
        );
        expect(liquidityPositionUSD).toEqual('0.000000000004');
    });

    it('should get pair address by LP token ID', async () => {
        const address = await service.getPairAddressByLpTokenID('TOK1TOK2LP');
        expect(address).toEqual(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
    });

    it('should check if token is part of any pair', async () => {
        const isPair0 = await service.isPairEsdtToken('TOK1TOK2LP');
        expect(isPair0).toEqual(true);

        const isPair1 = await service.isPairEsdtToken('LPT-4321');
        expect(isPair1).toEqual(false);
    });
});
