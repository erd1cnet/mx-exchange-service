import { Inject, Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address, QueryResponseBundle } from '@elrondnetwork/erdjs';
import { PairInfoModel } from '../models/pair-info.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';

@Injectable()
export class PairAbiService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);

            return response;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                PairAbiService.name,
                interaction.getFunction().name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFirstTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSecondTokenId([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getTokenReserve(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getReserve([
            BytesValue.fromUTF8(tokenID),
        ]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTotalSupply([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return new PairInfoModel({
            reserves0: response.values[0].valueOf().toFixed(),
            reserves1: response.values[1].valueOf().toFixed(),
            totalSupply: response.values[2].valueOf().toFixed(),
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTotalFeePercent(
            [],
        );

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSpecialFee([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(callerAddress).hex()),
            BytesValue.fromUTF8(tokenID),
        ]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);

        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf();
    }
}
