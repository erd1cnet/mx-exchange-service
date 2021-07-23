import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Inject, Injectable } from '@nestjs/common';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { MetricsCollector } from '../../utils/metrics.collector';

@Injectable()
export class ElrondApiService {
    private apiProvider: ApiProvider;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: elrondConfig.keepAliveTimeout,
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.apiProvider = new ApiProvider(process.env.ELRONDAPI_URL, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        });
    }

    getService(): ApiProvider {
        return this.apiProvider;
    }

    async doGetGeneric(
        name: string,
        resourceUrl: string,
        callback: (response: any) => any,
    ): Promise<any> {
        const profiler = new PerformanceProfiler(`${name} ${resourceUrl}`);

        const response = await this.getService().doGetGeneric(
            resourceUrl,
            callback,
        );

        profiler.stop();

        MetricsCollector.setExternalCall(
            ElrondApiService.name,
            name,
            profiler.duration,
        );

        return response;
    }

    async getCurrentEpoch(): Promise<number> {
        try {
            const block = await this.doGetGeneric(
                this.getCurrentEpoch.name,
                'blocks?size=1',
                resonse => resonse,
            );
            return block[0].epoch;
        } catch (error) {
            this.logger.error('An error occurred while get current epoch', {
                path: 'ElrondApiService.getCurrentEpoch',
                error,
            });
        }
    }

    async getNftCollection(tokenID: string): Promise<NftCollection> {
        return this.doGetGeneric(
            this.getNftCollection.name,
            `collections/${tokenID}`,
            response => response,
        );
    }

    async getTokensForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<EsdtToken[]> {
        return this.doGetGeneric(
            this.getTokensForUser.name,
            `accounts/${address}/tokens?from=${from}&size=${size}`,
            response => response,
        );
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<NftToken[]> {
        return this.doGetGeneric(
            this.getNftsForUser.name,
            `accounts/${address}/nfts?from=${from}&size=${size}`,
            response => response,
        );
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        return await this.doGetGeneric(
            this.getNftByTokenIdentifier.name,
            `accounts/${address}/nfts/${nftIdentifier}`,
            response => response,
        );
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        return this.doGetGeneric(
            this.getCurrentNonce.name,
            `network/status/${shardId}`,
            response => response,
        );
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        return this.doGetGeneric(
            this.getHyperblockByNonce.name,
            `hyperblock/by-nonce/${nonce}`,
            response => response,
        );
    }

    async getTransaction(hash: string, withResults = false): Promise<any> {
        return this.doGetGeneric(
            this.getTransaction.name,
            `transaction/${hash}?withResults=${withResults}`,
            response => response,
        );
    }
}
