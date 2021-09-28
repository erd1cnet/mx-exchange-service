import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextService } from 'src/services/context/context.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PairInfoModel } from '../models/pair-info.model';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';

@Injectable()
export class PairGetterService {
    constructor(
        private readonly context: ContextService,
        private readonly cachingService: CachingService,
        private readonly abiService: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairComputeService: PairComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        pairAddress: string,
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getPairCacheKey(pairAddress, key);
        try {
            return this.cachingService.getOrSet(cacheKey, createValueFunc, ttl);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairGetterService.name,
                this.getData.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenID',
            () => this.abiService.getFirstTokenID(pairAddress),
            oneHour(),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenID',
            () => this.abiService.getSecondTokenID(pairAddress),
            oneHour(),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(pairAddress),
            oneHour(),
        );
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.context.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.context.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(pairAddress);
        return this.context.getTokenMetadata(lpTokenID);
    }

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPrice(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPrice(pairAddress);
        }
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenPrice',
            () => this.pairComputeService.computeFirstTokenPrice(pairAddress),
            oneMinute(),
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenPrice',
            () => this.pairComputeService.computeSecondTokenPrice(pairAddress),
            oneMinute(),
        );
    }

    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPriceUSD(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPriceUSD(pairAddress);
        }
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);

        return this.getData(
            pairAddress,
            'firstTokenPriceUSD',
            () => this.pairComputeService.computeTokenPriceUSD(firstTokenID),
            oneMinute(),
        );
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'secondTokenPriceUSD',
            () => this.pairComputeService.computeTokenPriceUSD(secondTokenID),
            oneMinute(),
        );
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenPriceUSD',
            () => this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
            oneMinute(),
        );
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getFirstTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'firstTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneMinute(),
        );
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'secondTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneMinute(),
        );
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'totalSupply',
            () => this.abiService.getTotalSupply(pairAddress),
            oneMinute(),
        );
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [
            firstTokenReserve,
            secondTokenReserve,
            totalSupply,
        ] = await Promise.all([
            this.getFirstTokenReserve(pairAddress),
            this.getSecondTokenReserve(pairAddress),
            this.getTotalSupply(pairAddress),
        ]);

        return new PairInfoModel({
            reserves0: firstTokenReserve,
            reserves1: secondTokenReserve,
            totalSupply: totalSupply,
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<number> {
        const totalFeePercent = await this.getData(
            pairAddress,
            'totalFeePercent',
            () => this.abiService.getTotalFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getState(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'state',
            () => this.abiService.getState(pairAddress),
            oneHour(),
        );
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
