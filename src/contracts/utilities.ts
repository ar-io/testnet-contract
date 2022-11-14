declare const ContractError;

export function isArweaveAddress(address: string) {
  const trimmedAddress = address.toString().trim();
  if (!/[a-z0-9_-]{43}/i.test(trimmedAddress)) {
    throw new ContractError("Invalid Arweave address.");
  }
  return trimmedAddress;
}

export function isipV4Address(ipV4Address: string) {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ipV4Address
    )
  ) {
    return true;
  }
  alert("You have entered an invalid IP address!");
  return false;
}

export function getTotalSupply(state: any) {
  let totalSupply = 0;
  totalSupply += state.rewards;
  totalSupply += state.foundation.balance;
  for (const key of Object.keys(state.gateways)) {
    // iterate through each gateway and add all operator and delegated stakes
    totalSupply += state.gateways[key].operatorStake;
    totalSupply += state.gateways[key].delegatedStake;
  };

  for (const key of Object.keys(state.vaults)) {
    // iterate through each vault and add all community stakes
    for (let i = 0; i < state.vaults[key].length; i++) {
      totalSupply += state.vaults[key][i].balance;
    }
  };

  for (const key of Object.keys(state.balances)) {
    totalSupply += state.balances[key]
  }

  return totalSupply;
}