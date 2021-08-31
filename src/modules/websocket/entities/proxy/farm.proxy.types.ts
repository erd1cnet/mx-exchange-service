import { GenericEventType } from '../generic.types';

export type FarmProxyEventType = GenericEventType & {
    farmAddress: string;
    farmingToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    wrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
};

export type EnterFarmProxyEventType = FarmProxyEventType & {
    createdWithMerge: boolean;
};

export type ExitFarmProxyEventType = FarmProxyEventType & {
    rewardToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
};

export type RewardsProxyEventType = GenericEventType & {
    farmAddress: string;
    oldWrappedFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    newWrappedFarmToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
    oldWrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
    newWrappedFarmAttributes: {
        farmTokenID: string;
        farmTokenNonce: number;
        farmTokenAmount: string;
        farmingTokenID: string;
        farmingTokenNonce: number;
        farmingTokenAmount: string;
    };
    createdWithMerge: boolean;
};

export type ClaimRewardsProxyEventType = RewardsProxyEventType & {
    rewardToken: {
        tokenID: string;
        tokenNonce: number;
        amount: string;
    };
};
