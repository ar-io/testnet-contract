import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

export const nameId = async (
  state: ArNSState,
  { input: { name } }: PstAction
): Promise<ContractResult> => {
    const records = state.records;

    if (typeof name !== "string") {
        throw new ContractError("Must specify name to get the GNT Smartweave Contract ID for");
    }

    // Check if the requested name already exists, if not reduce balance and add it
    if (!(name in records)) {
        throw new ContractError("This name does not exist");
    } 

    return {
        result: {
            name,
            contractTransactionId: records[name],
        },
    };
};
