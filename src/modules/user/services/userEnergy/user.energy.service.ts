import { Injectable } from '@nestjs/common';
import { mxConfig, gasConfig, scAddress } from '../../../../config';
import { TransactionModel } from '../../../../models/transaction.model';
import { ElrondProxyService } from '../../../../services/elrond-communication/elrond-proxy.service';
import { Address, AddressValue, TypedValue } from '@multiversx/sdk-core';
import { UserEnergyGetterService } from './user.energy.getter.service';
import { OutdatedContract } from '../../models/user.model';

@Injectable()
export class UserEnergyService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly userEnergyGetter: UserEnergyGetterService,
    ) {}

    async updateFarmsEnergyForUser(
        userAddress: string,
        includeAllContracts = false,
    ): Promise<TransactionModel | null> {
        let outdatedContracts;
        if (includeAllContracts) {
            const farms = await this.userEnergyGetter.getUserActiveFarmsV2(
                userAddress,
            );
            outdatedContracts = [...farms, scAddress.feesCollector];
        } else {
            outdatedContracts = await this.getUserOutdatedContracts(
                userAddress,
            );
            outdatedContracts = outdatedContracts.map(
                (contract) => contract.address,
            );
        }
        if (outdatedContracts.length === 0) {
            return null;
        }
        const endpointArgs: TypedValue[] = [
            new AddressValue(Address.fromString(userAddress)),
        ];
        for (const contract of outdatedContracts) {
            if (includeAllContracts || !contract.claimProgressOutdated) {
                endpointArgs.push(
                    new AddressValue(Address.fromString(contract)),
                );
            }
        }
        const contract = await this.elrondProxy.getEnergyUpdateContract();
        return contract.methodsExplicit
            .updateFarmsEnergyForUser(endpointArgs)
            .withGasLimit(
                gasConfig.energyUpdate.updateFarmsEnergyForUser *
                    endpointArgs.length,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getUserOutdatedContracts(
        userAddress: string,
    ): Promise<OutdatedContract[]> {
        return await this.userEnergyGetter.getUserOutdatedContracts(
            userAddress,
        );
    }
}
