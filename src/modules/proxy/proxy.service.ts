import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyService } from './proxy-abi.service';
import {
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from './models/proxy.model';
import { cacheConfig, scAddress } from '../../config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from './utils';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmService } from '../farm/farm.service';
import { DecodeAttributesArgs } from './models/proxy.args';
import { ContextService } from '../../services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { RedisCacheService } from 'src/services/redis-cache.service';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class ProxyService {
    private redisClient: Redis.Redis;

    constructor(
        private apiService: ElrondApiService,
        private abiService: AbiProxyService,
        private context: ContextService,
        private farmService: FarmService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    async getProxyInfo(): Promise<ProxyModel> {
        return new ProxyModel({ address: scAddress.proxyDexAddress });
    }

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        try {
            const cacheKey = this.getProxyCacheKey(tokenCacheKey);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                createValueFunc,
                cacheConfig.token,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get ${tokenCacheKey}`,
                error,
                {
                    path: 'ProxyService.getTokenID',
                },
            );
        }
    }

    async getAssetTokenID(): Promise<string> {
        return this.getTokenID('assetTokenID', () =>
            this.abiService.getAssetTokenID(),
        );
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getTokenID('lockedAssetTokenID', () =>
            this.abiService.getLockedAssetTokenID(),
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return this.context.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID();
        return this.context.getNftCollectionMetadata(lockedAssetTokenID);
    }

    getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            const decodedAttributes = decodeWrappedLPTokenAttributes(
                arg.attributes,
            );

            return new WrappedLpTokenAttributesModel({
                identifier: arg.identifier,
                attributes: arg.attributes,
                lpTokenID: decodedAttributes.lpTokenID.toString(),
                lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toFixed(),
                lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toFixed(),
                lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
            });
        });
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map(async arg => {
            const decodedAttributes = decodeWrappedFarmTokenAttributes(
                arg.attributes,
            );

            const farmToken = await this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedAttributes.farmTokenIdentifier,
            );
            const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
                decodedAttributes.farmTokenIdentifier,
                farmToken.attributes,
            );

            return new WrappedFarmTokenAttributesModel({
                identifier: arg.identifier,
                attributes: arg.attributes,
                farmTokenID: decodedAttributes.farmTokenID.toString(),
                farmTokenNonce: decodedAttributes.farmTokenNonce,
                farmTokenAmount: decodedAttributes.farmTokenAmount,
                farmTokenIdentifier: decodedAttributes.farmTokenIdentifier,
                farmTokenAttributes: decodedFarmAttributes,
                farmingTokenID: decodedAttributes.farmingTokenID.toString(),
                farmingTokenNonce: decodedAttributes.farmingTokenNonce,
                farmingTokenAmount: decodedAttributes.farmingTokenAmount,
            });
        });

        return Promise.all(promises);
    }

    private getProxyCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxy', args);
    }
}
