import {
  ARNS_NAME_DOES_NOT_EXIST_MESSAGE,
  INVALID_TIER_MESSAGE,
  SECONDS_IN_A_YEAR,
  SECONDS_IN_GRACE_PERIOD,
} from '../../constants';
import { ContractResult, IOState, PstAction } from '../../types';

declare const ContractError;
declare const SmartWeave: any;

export const upgradeTier = async (
  state: IOState,
  { caller, input: { name, tier } }: PstAction,
): Promise<ContractResult> => {
  const balances = state.balances;
  const records = state.records;
  const currentTiers = state.tiers.current;
  const allTiers = state.tiers.history;
  const currentBlockTime = +SmartWeave.block.timestamp;

  // Check if the user has enough tokens to upgrade the tier
  if (
    !balances[caller] ||
    balances[caller] == undefined ||
    balances[caller] == null ||
    isNaN(balances[caller])
  ) {
    throw new ContractError(`Caller balance is not defined!`);
  }

  const selectedName = name.toLowerCase();

  // check if record exists
  if (!records[selectedName]) {
    throw new ContractError(ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
  }

  // get the current tier
  const currentTier = allTiers.find((t) => t.id === records[selectedName].tier);

  // Check if it includes a valid tier number
  const currentTierIndex = currentTiers.indexOf(currentTier.id) ?? 0;
  const selectedTierIndex = currentTiers.indexOf(tier);

  if (
    !currentTiers.includes(tier) ||
    selectedTierIndex < 0 ||
    selectedTierIndex <= currentTierIndex
  ) {
    throw new ContractError(INVALID_TIER_MESSAGE);
  }

  const selectedTier = allTiers.find((t) => t.id === tier);

  if (!selectedTier) {
    throw new ContractError('The provided tier does not exist. Try again.');
  }

  // check if this is an active lease, if not it cannot be upgraded
  if (
    records[selectedName].endTimestamp + SECONDS_IN_GRACE_PERIOD <
    currentBlockTime
  ) {
    throw new ContractError(
      `This name's lease has expired.  It must be purchased first before being extended.`,
    );
  }

  // Determine price of upgrading this tier, prorating based on current time and amount of tiers left
  const previousTierFee = currentTier.fee;
  const newTierFee = selectedTier.fee;
  const tierFeeDifference = newTierFee - previousTierFee;

  const amountOfSecondsLeft =
    records[selectedName].endTimestamp - currentBlockTime;
  const amountOfYearsLeft = amountOfSecondsLeft / SECONDS_IN_A_YEAR;

  // The price is determined by multiplying the base fee times the number of levels upgraded times the amount of years left
  // TODO: add a foundation fee for upgrading tiers (e.g 5%)
  const totalTierFeeUpgrade = tierFeeDifference * amountOfYearsLeft;

  // Check if the caller has enough tokens to upgrade this tier
  if (balances[caller] < totalTierFeeUpgrade) {
    throw new ContractError(
      `Caller balance not high enough to extend this name lease for ${totalTierFeeUpgrade} token(s)!`,
    );
  }

  // reduce balance set the end lease period for this record based on number of years
  balances[caller] -= totalTierFeeUpgrade;
  records[selectedName].tier = selectedTier.id;

  state.balances = balances;
  state.records = records;

  return { state };
};
