import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;

export const record = async (
  state: IOState,
  { input: { name } }: PstAction,
): Promise<ContractResult> => {
  const records = state.records;

  if (typeof name !== 'string') {
    throw new ContractError('Must specify the ArNS Name');
  }

  // Check if the requested name already exists, if not reduce balance and add it
  if (!(name in records)) {
    throw new ContractError('This name does not exist');
  }

  return {
    result: {
      name,
      tier: records[name].tier,
      contractTxId: records[name].contractTxId,
      maxSubdomains: records[name].maxSubdomains,
      minTtlSeconds: records[name].minTtlSeconds,
      endTimestamp: records[name].endTimestamp,
    },
  };
};
