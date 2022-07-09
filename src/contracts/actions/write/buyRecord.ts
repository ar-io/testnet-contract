import { MAX_NAME_LENGTH, TX_ID_LENGTH } from "@/constants";
import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;

export const buyRecord = async (
  state: ArNSState,
  { caller, input: { name, contractTransactionId } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const fees = state.fees;

  // Check if the user has enough tokens to purchase the name
  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  // check if it is a valid subdomain name for the smartweave contract
  const namePattern = new RegExp("^[a-zA-Z0-9-]+$");
  const nameRes = namePattern.test(name);
  if (
    typeof name !== "string" ||
    name.length > MAX_NAME_LENGTH || // the name is too long
    !nameRes || // the name does not match our regular expression
    name === "www" || // reserved
    name === "" // reserved
  ) {
    throw new ContractError("Invalid ArNS Record Name");
  }

  // enforce lower case names
  name = name.toLowerCase();

  // Determine price of name
  let qty = fees[name.length.toString()];

  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to purchase this name for ${qty} token(s)!`
    );
  }

  // check if it is a valid arweave transaction id for the smartweave contract
  const txIdPattern = new RegExp("^[a-zA-Z0-9_-]{43}$");
  const txIdres = txIdPattern.test(contractTransactionId);
  if (
    typeof contractTransactionId !== "string" ||
    contractTransactionId.length !== TX_ID_LENGTH ||
    !txIdres
  ) {
    throw new ContractError("Invalid ANT Smartweave Contract Address");
  }

  // Check if the requested name already exists, if not reduce balance and add it
  if (name in records) {
    throw new ContractError("This name already exists");
  } else {
    balances[caller] -= qty;
    records[`${name}`] = contractTransactionId;
  }

  return { state };
};
