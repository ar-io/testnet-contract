import {
  MIN_DELEGATED_STAKE,
  NON_CONTRACT_OWNER_MESSAGE,
  TOTAL_IO_SUPPLY,
} from '../../constants';
import { safeTransfer } from '../../transfer';
import {
  ContractWriteResult,
  Gateway,
  IOState,
  IOToken,
  PstAction,
  VaultData,
  mIOToken,
} from '../../types';

const contractTxIds = [
  'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U',
  '_NctcA2sRy1-J4OmIQZbYFPM17piNcbdBPH2ncX2RL8',
];

const contractOwner = 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ';

// Updates this contract to new source code
export const evolveState = async (
  state: IOState,
  { caller }: PstAction,
): Promise<ContractWriteResult> => {
  const owner = state.owner;

  if (caller !== owner) {
    throw new ContractError(NON_CONTRACT_OWNER_MESSAGE);
  }

  // convert balances to mIO
  let totalOutstandingTokens = new mIOToken(0);
  for (const [address, balance] of Object.entries(state.balances)) {
    const balanceInIO = new IOToken(balance).toMIO();
    state.balances[address] = balanceInIO.valueOf();
    totalOutstandingTokens = totalOutstandingTokens.plus(balanceInIO);
  }

  // helps with tests - transfer known protocol balances to the contract balance if they are not already there
  for (const contractTxId of contractTxIds) {
    if (
      !state.balances[contractTxId] ||
      contractTxId === SmartWeave.contract.id
    )
      continue;
    safeTransfer({
      balances: state.balances,
      fromAddress: contractTxId,
      toAddress: SmartWeave.contract.id,
      qty: new mIOToken(state.balances[contractTxId]),
    });
  }

  // transfer the owner balance to the contract owner for any forked contracts (helpful with testing)
  if (state.owner !== contractOwner && state.balances[contractOwner]) {
    safeTransfer({
      balances: state.balances,
      fromAddress: contractOwner,
      toAddress: state.owner,
      qty: new mIOToken(state.balances[contractOwner]),
    });
  }

  // convert auctions to mIO
  for (const [auctionId, auction] of Object.entries(state.auctions)) {
    const floorPrice = new IOToken(auction.floorPrice).toMIO();
    const startPrice = new IOToken(auction.startPrice).toMIO();
    const updatedAuction = {
      ...auction,
      floorPrice: floorPrice.valueOf(),
      startPrice: startPrice.valueOf(),
    };
    state.auctions[auctionId] = updatedAuction;
    totalOutstandingTokens = totalOutstandingTokens.plus(floorPrice);
  }

  // convert all gateway stakes and delegates to mIO
  for (const [gatewayAddress, gateway] of Object.entries(state.gateways)) {
    const operatorStake = new IOToken(gateway.operatorStake).toMIO();
    // TODO: set any other gateway changes we want to apply here
    const updatedGateway: Gateway = {
      ...gateway,
      operatorStake: operatorStake.valueOf(),
      delegates: gateway.delegates || {},
      settings: {
        ...gateway.settings,
        allowDelegatedStaking: false,
        delegateRewardShareRatio: 0,
        minDelegatedStake: MIN_DELEGATED_STAKE.valueOf(),
        autoStake: false,
      },
    };
    totalOutstandingTokens = totalOutstandingTokens.plus(operatorStake);

    // convert delegates to mIO
    for (const [delegateAddress, delegate] of Object.entries(
      updatedGateway.delegates,
    )) {
      const delegateStake = new IOToken(delegate.delegatedStake).toMIO();
      updatedGateway.delegates[delegateAddress] = {
        ...delegate,
        delegatedStake: delegateStake.valueOf(),
      };
      totalOutstandingTokens = totalOutstandingTokens.plus(delegateStake);
      // convert any vaulted delegate stakes to mIO
      for (const [vaultAddress, vault] of Object.entries(delegate.vaults)) {
        const vaultBalance = new IOToken(vault.balance).toMIO();
        updatedGateway.delegates[delegateAddress].vaults[vaultAddress] = {
          ...vault,
          balance: vaultBalance.valueOf(),
        };
        totalOutstandingTokens = totalOutstandingTokens.plus(vaultBalance);
      }
    }
    // convert all existing gateway vaults to mIO
    for (const [vaultAddress, vault] of Object.entries(gateway.vaults)) {
      const vaultBalance = new IOToken(vault.balance).toMIO();
      updatedGateway.vaults[vaultAddress] = {
        ...vault,
        balance: vaultBalance.valueOf(),
      };
      totalOutstandingTokens = totalOutstandingTokens.plus(vaultBalance);
    }
    state.gateways[gatewayAddress] = updatedGateway;
  }

  // convert all contract vaults to mIO
  for (const [walletAddress, walletVaults] of Object.entries(state.vaults)) {
    const updatedWalletVaults: Record<string, VaultData> = {};
    for (const [interactionId, vault] of Object.entries(walletVaults)) {
      const vaultBalance = new IOToken(vault.balance).toMIO();
      updatedWalletVaults[interactionId] = {
        ...vault,
        balance: vaultBalance.valueOf(),
      };
      totalOutstandingTokens = totalOutstandingTokens.plus(vaultBalance);
    }
    state.vaults[walletAddress] = walletVaults;
  }

  // convert all record purchase prices to mIO
  for (const [recordId, record] of Object.entries(state.records)) {
    const purchasePrice = new IOToken(record.purchasePrice || 0).toMIO();
    state.records[recordId] = {
      ...record,
      purchasePrice: purchasePrice.valueOf(),
    };
    // do not increment these as they are not outstanding tokens
  }

  // update demand factoring to mIO
  state.demandFactoring.revenueThisPeriod = new IOToken(
    state.demandFactoring.revenueThisPeriod,
  )
    .toMIO()
    .valueOf();
  state.demandFactoring.trailingPeriodRevenues =
    state.demandFactoring.trailingPeriodRevenues.map((revenue) =>
      new IOToken(revenue).toMIO().valueOf(),
    );

  // update the fees to mIO
  state.fees = Object.keys(state.fees).reduce(
    (acc: Record<string, number>, nameLength: string) => {
      const updatedFee = new mIOToken(state.fees[nameLength]);
      // set the minimum value to 1 MIO
      acc[nameLength] = Math.max(
        updatedFee.valueOf(),
        new mIOToken(1).valueOf(),
      );
      return acc;
    },
    {},
  );

  // transfer 500 IO to everyone from protocol balance but the owner and protocol
  for (const address in state.balances) {
    if ([state.owner, SmartWeave.contract.Id].includes(address)) continue;
    safeTransfer({
      balances: state.balances,
      fromAddress: state.owner,
      toAddress: address,
      qty: new IOToken(500).toMIO(),
    });
  }

  // calculate the difference in total outstanding tokens from protocol balance and adjust the protocol balance accordingly
  const protocolBalance = new mIOToken(
    state.balances[SmartWeave.contract.id] || 0,
  );
  if (totalOutstandingTokens.isGreaterThan(TOTAL_IO_SUPPLY)) {
    const difference = totalOutstandingTokens.minus(TOTAL_IO_SUPPLY);
    state.balances[SmartWeave.contract.id] = protocolBalance
      .minus(difference)
      .valueOf();
  } else {
    const difference = TOTAL_IO_SUPPLY.minus(totalOutstandingTokens);
    state.balances[SmartWeave.contract.id] = protocolBalance
      .plus(difference)
      .valueOf();
  }

  return { state };
};
