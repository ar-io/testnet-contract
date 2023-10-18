import { ArNSNameData, ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;

export const getRecord = async (
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

  const arnsName: ArNSNameData = records[name];
  return {
    result: {
      name,
      ...arnsName,
    },
  };
};
