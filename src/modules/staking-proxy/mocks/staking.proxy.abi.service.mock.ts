import { Address } from '@multiversx/sdk-core/out';
import { IStakingProxyAbiService } from '../services/interfaces';
import { StakingProxyAbiService } from '../services/staking.proxy.abi.service';

export class StakingProxyAbiServiceMock implements IStakingProxyAbiService {
    async lpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async pairAddress(stakingProxyAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async stakingTokenID(stakingProxyAddress: string): Promise<string> {
        return 'TOK1-1111';
    }
    async farmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'STAKETOK-1111';
    }
    async dualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return 'METASTAKE-1234';
    }
    async lpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return 'TOK1TOK4LPStaked';
    }
}

export const StakingProxyAbiServiceProvider = {
    provide: StakingProxyAbiService,
    useClass: StakingProxyAbiServiceMock,
};
