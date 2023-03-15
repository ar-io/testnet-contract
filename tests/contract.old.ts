import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import * as fs from 'fs';
import path from 'path';
import {
  InteractionResult,
  LoggerFactory,
  PstContract,
  PstState,
  Warp,
  WarpFactory,
} from 'warp-contracts';

import { IOState } from '../src/contracts/types/types';
import { addFunds, mineBlock } from '../utils/_helpers';

const WALLET_STARTING_TOKENS = 1_000_000_000_0;
const TRANSFER_AMOUNT = 5_000_000;
const INTERACTION_COST = 20000;
const EXPECTED_BALANCE_AFTER_INVALID_TX = 9515750000;
const DEFAULT_ANT_CONTRACT_ID = 'MSFTfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
const SECONDS_IN_A_YEAR = 31_536_000;

describe('Testing the ArNS Registry Contract', () => {
  let contractSrc: string;
  let wallet: JWKInterface;
  let walletAddress: string;
  let wallet2: JWKInterface;
  let walletAddress2: string;
  let wallet3: JWKInterface;
  let walletAddress3: string;
  let initialState: IOState;
  let arweave: Arweave;
  let pst: PstContract;
  let arlocal: ArLocal;
  let warp: Warp;

  jest.setTimeout(20000);

  beforeAll(async () => {
    // ~~ Set up ArLocal and instantiate Arweave ~~
    arlocal = new ArLocal(1820, false);

    await arlocal.start();

    // ~~ Initialize 'LoggerFactory' ~~
    LoggerFactory.INST.logLevel('fatal');

    arweave = Arweave.init({
      host: 'localhost',
      port: 1820,
      protocol: 'http',
    });

    warp = WarpFactory.forLocal(1820);

    // ~~ Generate wallet and add funds ~~
    wallet = await arweave.wallets.generate();
    walletAddress = await arweave.wallets.jwkToAddress(wallet);
    await addFunds(arweave, wallet);

    wallet2 = await arweave.wallets.generate();
    walletAddress2 = await arweave.wallets.jwkToAddress(wallet2);
    await addFunds(arweave, wallet2);

    wallet3 = await arweave.wallets.generate();
    walletAddress3 = await arweave.wallets.jwkToAddress(wallet3);
    await addFunds(arweave, wallet3);

    // ~~ Read contract source and initial state files ~~
    contractSrc = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
      'utf8',
    );
    const stateFromFile: IOState = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../dist/contracts/initial-state.json'),
        'utf8',
      ),
    );

    // expired name date
    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 1);

    // ~~ Update initial state ~~
    initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress,
      },
      records: {
        ['permaweb']: {
          // We set an expired name here so we can test overwriting it
          tier: 1,
          contractTxId: 'io9_QNUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY',
          maxSubdomains: 100,
          minTtlSeconds: 3600, // tier 1 default for TTL
          endTimestamp: 100_000_000,
        },
        ['grace']: {
          // We set a name in its grace period here
          tier: 3,
          contractTxId: 'GRACENUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY',
          maxSubdomains: 10000,
          minTtlSeconds: 900, // tier 3 default for ttl
          endTimestamp: Math.round(Date.now() / 1000),
        },
        ['expired']: {
          // We set an expired name here so we test extending
          tier: 1,
          contractTxId: 'EXPIREUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY',
          maxSubdomains: 100,
          minTtlSeconds: 3600, // tier 3 default for ttl
          endTimestamp: Math.round(expiredDate.getTime() / 1000),
        },
      },
      balances: {
        [walletAddress]: 0, // create tokens during mint
        [walletAddress2]: 1_000_000_000,
        [walletAddress3]: 1_000_000_000,
      },
    };

    // ~~ Deploy contract ~~
    const deployedContract = await warp.deploy(
      {
        wallet,
        initState: JSON.stringify(initialState),
        src: contractSrc,
      },
      true,
    );

    // ~~ Connect to the pst contract ~~
    pst = warp.pst(deployedContract.contractTxId);
    pst.connect(wallet);

    // ~~ Mine block ~~
    await mineBlock(arweave);
  });

  afterAll(async () => {
    // ~~ Stop ArLocal ~~
    await arlocal.stop();
  });

  it('should read pst state and balance data', async () => {
    expect(await pst.currentState()).toEqual(initialState);
    expect((await pst.currentState()).owner).toEqual(walletAddress);
  });

  it('should properly mint tokens', async () => {
    await pst.writeInteraction({
      function: 'mint',
      qty: WALLET_STARTING_TOKENS,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      WALLET_STARTING_TOKENS,
    );
  });

  it('should properly transfer and perform dry write with overwritten caller', async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);

    await pst.transfer({
      target: overwrittenCaller.toString(),
      qty: TRANSFER_AMOUNT,
    });

    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.balances[walletAddress]).toEqual(
      WALLET_STARTING_TOKENS - TRANSFER_AMOUNT,
    );
    expect((await pst.currentState()).balances[overwrittenCaller]).toEqual(
      TRANSFER_AMOUNT,
    );
    expect(currentState.balances[overwrittenCaller]).toEqual(TRANSFER_AMOUNT);
    const result: InteractionResult<PstState, unknown> = await pst.dryWrite(
      {
        function: 'transfer',
        target: 'NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
        qty: INTERACTION_COST,
      },
      overwrittenCaller,
    );

    expect(result.state.balances[overwrittenCaller]).toEqual(
      TRANSFER_AMOUNT - INTERACTION_COST,
    );
    expect(
      result.state.balances['NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g'],
    ).toEqual(INTERACTION_COST);
  });

  it('should not transfer tokens with incorrect ownership', async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);
    const PREVIOUS_BALANCE = (await pst.currentBalance(walletAddress)).balance;
    pst.connect(newWallet);
    await pst.transfer({
      target: walletAddress.toString(),
      qty: TRANSFER_AMOUNT,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.balances[walletAddress]).toEqual(PREVIOUS_BALANCE);
    expect(currentState.balances[overwrittenCaller]).toEqual(undefined);
  });

  it('should not extend record with not enough balance or invalid parameters', async () => {
    pst.connect(wallet2);
    const PREVIOUS_BALANCE = (await pst.currentBalance(walletAddress2)).balance;
    const PREVIOUS_END_TIMESTAMP = ((await pst.currentState()) as IOState)
      .records['vile'].endTimestamp;
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'doesnt-exist', // This name doesnt exist so it shouldnt be created
      years: 5,
    });
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'expired', // is already expired, so it should not be extendable
      years: 1,
    });
    await mineBlock(arweave);
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'microsoft', // should cost 1000000 tokens
      years: 1000, // too many years
    });
    await mineBlock(arweave);
    const newWallet = await arweave.wallets.generate();
    pst.connect(newWallet);
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'vile', // should cost too many tokens to extend this existing name with this empty wallet
      years: 50,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.balances[walletAddress2]).toEqual(PREVIOUS_BALANCE);
    expect(currentState.records['vile'].endTimestamp).toEqual(
      PREVIOUS_END_TIMESTAMP,
    );
  });

  it('should change fees and settings with correct ownership', async () => {
    pst.connect(wallet); // connect the original owning wallet
    const feesToChange = {
      '1': 5000000000,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
      '21': 5,
      '22': 5,
      '23': 5,
      '24': 5,
      '25': 5,
      '26': 5,
      '27': 5,
      '28': 5,
      '29': 5,
      '30': 5,
      '31': 5,
      '32': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.fees).toEqual(feesToChange);
  });

  it('should not change malformed fees with correct ownership', async () => {
    pst.connect(wallet); // connect the original owning wallet
    const originalFees = {
      '1': 5000000000,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
      '21': 5,
      '22': 5,
      '23': 5,
      '24': 5,
      '25': 5,
      '26': 5,
      '27': 5,
      '28': 5,
      '29': 5,
      '30': 5,
      '31': 5,
      '32': 5,
    };

    const feesToChange = {
      // should not write if any fee is equal to 0
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
      '21': 5,
      '22': 5,
      '23': 5,
      '24': 5,
      '25': 5,
      '26': 5,
      '27': 5,
      '28': 5,
      '29': 5,
      '30': 5,
      '31': 5,
      '32': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange,
    });
    await mineBlock(arweave);
    let currentState = (await pst.currentState()) as IOState;
    expect(currentState.fees).toEqual(originalFees);

    const feesToChange2 = {
      // should not write if strings are the fees
      '1': '5000000000',
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange2,
    });
    await mineBlock(arweave);
    currentState = (await pst.currentState()) as IOState;

    expect(currentState.fees).toEqual(originalFees);

    const feesToChange3 = {
      // should not write with a string as the index
      whatever: 5000000000,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange3,
    });
    await mineBlock(arweave);
    currentState = (await pst.currentState()) as IOState;

    expect(currentState.fees).toEqual(originalFees);

    const feesToChange4 = {
      // should not write if incomplete fees are added
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange4,
    });
    await mineBlock(arweave);
    currentState = (await pst.currentState()) as IOState;

    expect(currentState.fees).toEqual(originalFees);

    const feesToChange5 = {
      // should not write if additional fees are added
      '1': 5000000000,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
      '21': 1000000000,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange5,
    });
    await mineBlock(arweave);
    currentState = (await pst.currentState()) as IOState;

    expect(currentState.fees).toEqual(originalFees);

    const feesToChange6 = {
      // should not write if decimals are used
      '1': 5000000000.666,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5.666,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange6,
    });
    await mineBlock(arweave);
    currentState = (await pst.currentState()) as IOState;

    expect(currentState.fees).toEqual(originalFees);
  });

  it('should not change fees with incorrect ownership', async () => {
    const originalFees = {
      '1': 5000000000,
      '2': 1406250000,
      '3': 468750000,
      '4': 156250000,
      '5': 62500000,
      '6': 25000000,
      '7': 10000000,
      '8': 5000000,
      '9': 1000000,
      '10': 500000,
      '11': 450000,
      '12': 400000,
      '13': 350000,
      '14': 300000,
      '15': 250000,
      '16': 200000,
      '17': 175000,
      '18': 150000,
      '19': 125000,
      '20': 5,
      '21': 5,
      '22': 5,
      '23': 5,
      '24': 5,
      '25': 5,
      '26': 5,
      '27': 5,
      '28': 5,
      '29': 5,
      '30': 5,
      '31': 5,
      '32': 5,
    };
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);
    const feesToChange = {
      '1': 1,
      '2': 1,
      '3': 1,
      '4': 1,
      '5': 1,
      '6': 1,
      '7': 1,
      '8': 1,
      '9': 1,
      '10': 1,
      '11': 1,
      '12': 1,
      '13': 1,
      '14': 1,
      '15': 1,
      '16': 1,
      '17': 1,
      '18': 1,
      '19': 1,
      '20': 5,
      '21': 5,
      '22': 5,
      '23': 5,
      '24': 5,
      '25': 5,
      '26': 5,
      '27': 5,
      '28': 5,
      '29': 5,
      '30': 5,
      '31': 5,
      '32': 5,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.fees).toEqual(originalFees);
  });

  it('should not add whitelisted ANT Smartweave Contract Source TX IDs with incorrect ownership', async () => {
    pst.connect(wallet2);
    const sourceTxIdToAdd = 'BLAHhDwLZaLBA3lzpE7xl36Rms2NwUNZ7SKOTEWkbI';
    await pst.writeInteraction({
      function: 'addANTSourceCodeTx',
      contractTxId: sourceTxIdToAdd,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    if (currentState.approvedANTSourceCodeTxs.indexOf(sourceTxIdToAdd) > -1) {
      expect(false);
    } else {
      expect(true);
    }
  });

  it('should upgrade tier with correct balance, regardless of ownership', async () => {
    pst.connect(wallet2);
    const name = 'permaweb';
    await pst.writeInteraction({
      function: 'upgradeTier',
      name: 'permaweb',
      tier: 2,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.records[name].tier).toEqual(2);
  });

  it('should not upgrade tier on expired name or without correct balance', async () => {
    const name = 'permaweb';
    const newWallet = await arweave.wallets.generate();
    pst.connect(newWallet); // empty wallet
    await pst.writeInteraction({
      function: 'upgradeTier',
      name: name,
      tier: 3,
    });
    const expiredName = 'expired';
    pst.connect(wallet); // wallet with tokens
    await pst.writeInteraction({
      function: 'upgradeTier',
      name: expiredName,
      tier: 2,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.records[name].tier).toEqual(2); // the tier should remain unchanged
    expect(currentState.records[expiredName].tier).toEqual(1); // the tier should remain unchanged
  });

  it('should not downgrade tier with correct balance, regardless of ownership', async () => {
    pst.connect(wallet2);
    const name = 'permaweb';
    await pst.writeInteraction({
      function: 'upgradeTier',
      name: 'permaweb',
      tier: 1,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.records[name].tier).toEqual(2);
  });

  it('should not remove names with incorrect ownership', async () => {
    pst.connect(wallet3);
    const nameToRemove = 'vile';
    await pst.writeInteraction({
      function: 'removeRecord',
      name: nameToRemove,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.records[nameToRemove]).toBeTruthy();
  });

  it('should remove names with correct ownership', async () => {
    pst.connect(wallet); // connect the original owning wallet
    const nameToRemove = 'vile';
    await pst.writeInteraction({
      function: 'removeRecord',
      name: nameToRemove,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.records[nameToRemove]).toEqual(undefined);
  });

  // EVOLUTION
  it("should properly evolve contract's source code", async () => {
    pst.connect(wallet);
    const newSource = fs.readFileSync(
      path.join(__dirname, '../src/tools/contract_evolve.js'),
      'utf8',
    );
    const evolveSrcTx = await warp.createSourceTx({ src: newSource }, wallet);
    const evolveSrcTxId = await warp.saveSourceTx(evolveSrcTx, true);
    if (evolveSrcTxId === null) {
      return 0;
    }
    await mineBlock(arweave);

    await pst.evolve(evolveSrcTxId);

    await mineBlock(arweave);

    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.evolve).toEqual(evolveSrcTxId);
  });

  it("should not evolve contract's source code without correct ownership", async () => {
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);

    let currentState = (await pst.currentState()) as IOState;
    const PREVIOUS_EVOLVE = currentState.evolve;

    const newSource = fs.readFileSync(
      path.join(__dirname, '../src/tools/contract_evolve.js'),
      'utf8',
    );
    const evolveSrcTx = await warp.createSourceTx({ src: newSource }, wallet);
    const evolveSrcTxId = await warp.saveSourceTx(evolveSrcTx);
    if (evolveSrcTxId === null) {
      return 0;
    }
    await mineBlock(arweave);

    await pst.evolve(evolveSrcTxId);
    await mineBlock(arweave);

    currentState = (await pst.currentState()) as IOState;
    expect(currentState.evolve).toEqual(PREVIOUS_EVOLVE);
  });
});
