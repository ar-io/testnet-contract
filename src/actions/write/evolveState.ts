import { NON_CONTRACT_OWNER_MESSAGE, TOTAL_IO_SUPPLY } from '../../constants';
import {
  AuctionData,
  ContractWriteResult,
  Gateway,
  IOState,
  PstAction,
  TokenVault,
} from '../../types';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // balances
  const totalBalances = Object.values(state.balances).reduce(
    (total, current) => total + current,
    0,
  );

  // gateway stakes
  const totalGatewayStaked = Object.values(state.gateways).reduce(
    (totalGatewaysStake: number, gateway: Gateway) => {
      const gatewayStake =
        gateway.operatorStake +
        gateway.vaults.reduce(
          (totalVaulted, currentVault: TokenVault) =>
            totalVaulted + currentVault.balance,
          0,
        );
      return totalGatewaysStake + gatewayStake;
    },
    0,
  );

  // active auctions
  const totalAuctionStake = Object.values(state.auctions).reduce(
    (totalAuctionStake: number, auction: AuctionData) => {
      return totalAuctionStake + auction.floorPrice;
    },
    0,
  );

  const totalContractIO =
    totalBalances + totalGatewayStaked + totalAuctionStake;

  const diff = TOTAL_IO_SUPPLY - totalContractIO;

  if (diff > 0) {
    state.balances[SmartWeave.contract.id] += diff;
  }

  return { state };
};
