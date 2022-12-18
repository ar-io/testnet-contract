import { SECONDS_IN_A_YEAR } from "@/constants";
import { PstAction, IOState, ContractResult } from "../../types/types";

declare const ContractError;
declare const SmartWeave: any;

// Temporary method to fix a broken contract state
export const fixState = async (
  state: IOState,
  { caller, input: {} }: PstAction
): Promise<ContractResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError("Caller cannot evolve the contract");
  }

  if (state.tiers === undefined) {
    // Do this if Tiers does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        tiers: {},
      },
    };
  }

  if (state.vaults === undefined) {
    // Do this if vaults do not exist in the state of the contract.
    state = {
      ...state,
      ...{
        vaults: {},
      },
    };
  }

  if (state.version === undefined) {
    // Do this if vaults do not exist in the state of the contract.
    state = {
      ...state,
      ...{
        version: "0.0.1",
      },
    };
  }

  if (state.foundation === undefined) {
    // Do this if foundation does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        foundation: {
          balance: 0,
          actionPeriod: 720,
          minSignatures: 2,
          addresses: [
            "QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ",
            "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8",
            "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g",
          ],
          actions: [],
        },
      },
    };
  }

  if (state.settings === undefined) {
    // Do this if settings does not exist in the state of the contract.
    state = {
      ...state,
      ...{
        settings: {
          lockMinLength: 5,
          lockMaxLength: 10000,
          minGatewayStakeAmount: 5000,
          minDelegatedStakeAmount: 100,
          gatewayJoinLength: 720,
          gatewayLeaveLength: 10080,
          delegatedStakeWithdrawLength: 10080,
          operatorStakeWithdrawLength: 10080,
        },
      },
    };
  }

  if (state.gateways === undefined) {
    // Do this if gateways do not exist in the state of the contract.
    state = {
      ...state,
      ...{
        gateways: {},
      },
    };
  }

  if (state.votes === undefined) {
    // Do this if gateways do not exist in the state of the contract.
    state = {
      ...state,
      ...{
        votes: [],
      },
    };
  }

  if (state.rewards === undefined) {
    state = {
      ...state,
      ...{
        rewards: 0,
      },
    };
  }

  for (const key of Object.keys(state.records)) {
    if (state.records[key].contractTxId === undefined) {
      // set the end lease period for this based on number of years
      const endTimestamp = +SmartWeave.block.timestamp;
      +SECONDS_IN_A_YEAR * 1; // default tier
      state.records[key] = {
        contractTxId: state.records[key].toString(),
        endTimestamp,
        maxSubdomains: 100, // default for tier 1
        minTtlSeconds: 3600, // default for tier 1
        tier: 1,
      };
    }
  }

  return { state };
};
