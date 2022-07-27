// ~~ Put all the interactions from '../actions/` together to write the final handle function which will be exported
// from the contract source. ~~
import { balance } from "./actions/read/balance";
import { record } from "./actions/read/record";
import { buyRecord } from "./actions/write/buyRecord";
import { extendRecord } from "./actions/write/extendRecord";
import { upgradeTier } from "./actions/write/upgradeTier";
import { setTier } from "./actions/write/setTier";
import { removeRecord } from "./actions/write/removeRecord";
import { addANTSourceCodeTx } from "./actions/write/addANTSourceCodeTx";
import { removeANTSourceCodeTx } from "./actions/write/removeANTSourceCodeTx";
import { evolve } from "./actions/write/evolve";
import { mintTokens } from "./actions/write/mintTokens";
import { lock } from "./actions/write/lock";
import { unlock } from "./actions/write/unlock";
import { increaseVaultLength } from "./actions/write/increaseVaultLength";
import { increaseVaultBalance } from "./actions/write/increaseVaultBalance";
import { setFees } from "./actions/write/setFees";
import { transferTokens } from "./actions/write/transferTokens";
import { transferTokensLocked } from "./actions/write/transferTokensLocked";
import { initiateFoundationAction } from "./actions/write/initiateFoundationAction";
import { approveFoundationAction } from "./actions/write/approveFoundationAction";
import { ContractResult, PstAction, ArNSState } from "./types/types";

declare const ContractError;

export async function handle(
  state: ArNSState,
  action: PstAction
): Promise<ContractResult> {
  const input = action.input;

  switch (input.function) {
    case "transfer":
      return await transferTokens(state, action);
    case "transferLocked":
      return await transferTokensLocked(state, action);
    case "approveFoundationAction":
      return await approveFoundationAction(state, action);
    case "initiateFoundationAction":
      return await initiateFoundationAction(state, action);
    case "lock":
      return await lock(state, action);
    case "unlock":
      return await unlock(state, action);
    case "increaseVaultLength":
      return await increaseVaultLength(state, action);
    case "increaseVaultBalance":
      return await increaseVaultBalance(state, action);
    case "mint":
      return await mintTokens(state, action);
    case "setFees":
      return await setFees(state, action);
    case "buyRecord":
      return await buyRecord(state, action);
    case "extendRecord":
      return await extendRecord(state, action);
    case "upgradeTier":
      return await upgradeTier(state, action);
    case "setTier":
      return await setTier(state, action);
    case "removeRecord":
      return await removeRecord(state, action);
    case "evolve":
      return await evolve(state, action);
    case "addANTSourceCodeTx":
      return await addANTSourceCodeTx(state, action);
    case "removeANTSourceCodeTx":
      return await removeANTSourceCodeTx(state, action);
    case "balance":
      return await balance(state, action);
    case "record":
      return await record(state, action);
    default:
      throw new ContractError(
        `No function supplied or function not recognised: "${input.function}"`
      );
  }
}
