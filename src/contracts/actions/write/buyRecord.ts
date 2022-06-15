import { PstAction, ArNSState, ContractResult } from "../../types/types";

declare const ContractError;
const MAX_NAME_LENGTH = 20;
const TX_ID_LENGTH = 43;

export const buyRecord = async (
  state: ArNSState,
  { caller, input: { name, contractTransactionId } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;

  // Check if the user has enough tokens to purchase the name
  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  // check if it is a valid arweave transaction id for the smartweave contract
  const namePattern = new RegExp("^[a-zA-Z0-9_-]");
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

  // Determine price of name
  let qty: number;
  switch (name.length) {
    case 1:
      qty = 100000000;
      break;
    case 2:
      qty = 50000000;
      break;
    case 3:
      qty = 25000000;
      break;
    case 4:
      qty = 10000000;
      break;
    case 5:
      qty = 5000000;
      break;
    case 6:
      qty = 2500000;
      break;
    case 7:
      qty = 2000000;
      break;
    case 8:
      qty = 1500000;
      break;
    case 9:
      qty = 1250000;
      break;
    case 10:
      qty = 1000000;
      break;
    case 11:
      qty = 900000;
      break;
    case 12:
      qty = 800000;
      break;
    case 13:
      qty = 700000;
      break;
    case 14:
      qty = 600000;
      break;
    case 15:
      qty = 500000;
      break;
    case 16:
      qty = 400000;
      break;
    case 17:
      qty = 300000;
      break;
    case 18:
      qty = 200000;
      break;
    case 19:
      qty = 100000;
      break;
    case 20:
      qty = 50000;
      break;
    default:
      throw new ContractError("Invalid string length");
  }

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
