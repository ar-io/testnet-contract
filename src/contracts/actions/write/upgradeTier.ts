import { SECONDS_IN_A_YEAR, SECONDS_IN_GRACE_PERIOD } from '@/constants';

import { ContractResult, IOState, PstAction } from '../../types/types';

declare const ContractError;
declare const SmartWeave: any;

export const upgradeTier = async (
  state: IOState,
  { caller, input: { name, tierNumber } }: PstAction,
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

  // check if record exists
  if (!records[name]) {
    throw new ContractError(`No record exists with this name ${name}`);
  }

  // Check if it includes a valid tier number
  const allowedTierNumbers = Object.keys(currentTiers).map((t) => +t);
  if (
    !Number.isInteger(tierNumber) ||
    !allowedTierNumbers.includes(tierNumber)
  ) {
    throw new ContractError(
      `Invalid value for "tier". Allowed tier numbers: ${allowedTierNumbers}`,
    );
  }

  // get the tier to upgrade too
  const currentNameTier = allTiers.find((t) => t.id === records[name].tier);
  const selectedUpgradeTier = allTiers.find(
    (t) => t.id === currentTiers[tierNumber],
  );

  if (!selectedUpgradeTier) {
    throw new ContractError(
      'The tier associated with the provided tier number does not exist. Try again.',
    );
  }

  if (currentNameTier.id === selectedUpgradeTier.id) {
    throw new ContractError('Cannot upgrade to the same tier.');
  }

  // check if this is an active lease, if not it cannot be upgraded
  if (records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD < currentBlockTime) {
    throw new ContractError(
      `This name's lease has expired.  It must be purchased first before being extended.`,
    );
  }

  // Determine price of upgrading this tier, prorating based on current time and amount of tiers left
  const previousTierFee = currentNameTier.fee;
  const newTierFee = selectedUpgradeTier.fee;
  const tierFeeDifference = newTierFee - previousTierFee;

  const amountOfSecondsLeft = records[name].endTimestamp - currentBlockTime;
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
  records[name].tier = selectedUpgradeTier.id;

  return { state };
};
