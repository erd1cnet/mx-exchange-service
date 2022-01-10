import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';
import Agent, { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class ElrondGatewayService {
    private url: string;
    private config: AxiosRequestConfig;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);
        this.url = process.env.ELRONDGATEWAY_URL;

        this.config = {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        };
    }

    async getSCStorageKey(address: string, key: string): Promise<any> {
        return await this.doGetGeneric(
            `address/${address}/key/${Buffer.from(key).toString('hex')}`,
            response => response.data.value,
        );
    }

    /**
     * Get method that receives the resource url and on callback the method used to map the response.
     */
    private async doGetGeneric(
        resourceUrl: string,
        callback: (response: any) => any,
    ): Promise<any> {
        const response = await this.doGet(resourceUrl);
        return callback(response);
    }

    private async doGet(resourceUrl: string): Promise<any> {
        try {
            const url = `${this.url}/${resourceUrl}`;
            const response = await axios.get(url, this.config);
            return response.data;
        } catch (error) {
            this.handleApiError(error, resourceUrl);
        }
    }

    private handleApiError(error: any, resourceUrl: string) {
        if (!error.response) {
            this.logger.warn(error);
            throw new Error(`Cannot GET ${resourceUrl}: [${error}]`);
        }

        const errorData = error.response.data;
        const originalErrorMessage =
            errorData.error || errorData.message || JSON.stringify(errorData);
        throw new Error(`Cannot GET ${resourceUrl}: [${originalErrorMessage}]`);
    }
}
