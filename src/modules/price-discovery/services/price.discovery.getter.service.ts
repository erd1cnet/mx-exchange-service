import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
@Injectable()
export class PriceDiscoveryGetterService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        private readonly abiService: PriceDiscoveryAbiService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        priceDiscoveryAddress: string,
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getPriceDiscoveryCacheKey(
            priceDiscoveryAddress,
            key,
        );
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PriceDiscoveryGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLaunchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenID',
            () => this.abiService.getLaunchedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getAcceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'acceptedTokenID',
            () => this.abiService.getAcceptedTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getRedeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'redeemTokenID',
            () => this.abiService.getRedeemTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getLpTokenID(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getLaunchedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const launchedTokenID = await this.getLaunchedTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getTokenMetadata(launchedTokenID);
    }

    async getAcceptedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const acceptedTokenID = await this.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getTokenMetadata(acceptedTokenID);
    }

    async getRedeemToken(
        priceDiscoveryAddress: string,
    ): Promise<NftCollection> {
        const redeemTokenID = await this.getRedeemTokenID(
            priceDiscoveryAddress,
        );
        return this.contextGetter.getNftCollectionMetadata(redeemTokenID);
    }

    async getLpToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(priceDiscoveryAddress);
        if (lpTokenID === elrondConfig.EGLDIdentifier) {
            return undefined;
        }
        return this.contextGetter.getTokenMetadata(lpTokenID);
    }

    async getLaunchedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const tokenID = await this.getLaunchedTokenID(priceDiscoveryAddress);
        return this.getData(
            priceDiscoveryAddress,
            'launchedTokenAmount',
            () =>
                this.apiService.getTokenBalanceForUser(
                    priceDiscoveryAddress,
                    tokenID,
                ),
            oneSecond() * 6,
        );
    }

    async getAcceptedTokenAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const tokenID = await this.getAcceptedTokenID(priceDiscoveryAddress);
        return this.getData(
            priceDiscoveryAddress,
            'acceptedTokenAmount',
            () =>
                this.apiService.getTokenBalanceForUser(
                    priceDiscoveryAddress,
                    tokenID,
                ),
            oneSecond() * 6,
        );
    }

    async getLpTokensReceived(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'lpTokensReceived',
            () => this.abiService.getLpTokensReceived(priceDiscoveryAddress),
            oneMinute(),
        );
    }

    async getStartBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'startEpoch',
            () => this.abiService.getStartBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getEndBlock(priceDiscoveryAddress: string): Promise<number> {
        return this.getData(
            priceDiscoveryAddress,
            'endEpoch',
            () => this.abiService.getEndBlock(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getPairAddress(priceDiscoveryAddress: string): Promise<string> {
        return this.getData(
            priceDiscoveryAddress,
            'pairAddress',
            () => this.abiService.getPairAddress(priceDiscoveryAddress),
            oneHour(),
        );
    }

    async getCurrentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        return this.getData(
            priceDiscoveryAddress,
            'currentPhase',
            () => this.abiService.getCurrentPhase(priceDiscoveryAddress),
            oneMinute(),
        );
    }

    private getPriceDiscoveryCacheKey(
        priceDiscoveryAddress: string,
        ...args: any
    ) {
        return generateCacheKeyFromParams(
            'priceDiscovery',
            priceDiscoveryAddress,
            ...args,
        );
    }
}
