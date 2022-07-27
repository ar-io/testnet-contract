declare const ContractError;

export function isArweaveAddress(address: string) {
    const trimmedAddress = address.toString().trim();
    if(!/[a-z0-9_-]{43}/i.test(trimmedAddress)) {
      throw new ContractError('Invalid Arweave address.');
    }
    return trimmedAddress;
};