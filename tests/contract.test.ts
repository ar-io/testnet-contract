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

import { ArNSState } from '../src/contracts/types/types';
import { addFunds, mineBlock } from '../utils/_helpers';

const INITIAL_TOKEN_COUNT = 0;
const TOKENS_TO_CREATE = 1000000000; // ten million tokens
const ARNS_NAME_PURCHASE_COST = 156250000;
const TRANSFER_COST = 5000000;
const INTERACTION_COST = 2500;
const EXPECTED_BALANCE_AFTER_INVALID_TX =
  TOKENS_TO_CREATE - ARNS_NAME_PURCHASE_COST - TRANSFER_COST;
describe('Testing the ArNS Registry Contract', () => {
  const arlocal = new ArLocal(1820, false);
  const warp: Warp = WarpFactory.forLocal(1820);
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1820,
    protocol: 'http',
  });

  let contractSrc: string;
  let wallet: JWKInterface;
  let walletAddress: string;
  let initialState: ArNSState;
  let pst: PstContract;
  beforeAll(async () => {
    // ~~ Set up ArLocal and instantiate Arweave ~~
    await arlocal.start();

    // ~~ Initialize 'LoggerFactory' ~~
    LoggerFactory.INST.logLevel('fatal');

    // ~~ Generate wallet and add funds ~~
    wallet = await arweave.wallets.generate();
    walletAddress = await arweave.wallets.jwkToAddress(wallet);
    await addFunds(arweave, wallet);

    // ~~ Read contract source and initial state files ~~
    contractSrc = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
      'utf8',
    );
    const stateFromFile: ArNSState = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../dist/contracts/initial-state.json'),
        'utf8',
      ),
    );

    // ~~ Update initial state ~~
    initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress,
      },
      balances: {
        [walletAddress]: INITIAL_TOKEN_COUNT,
      },
    };

    // ~~ Deploy contract ~~
    const deployedContract = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
    });

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
      qty: TOKENS_TO_CREATE,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      INITIAL_TOKEN_COUNT + TOKENS_TO_CREATE,
    );
  });

  it('should properly buy records with atomic ant creation', async () => {
    const nameToBuy = 'permaWEB'; // this should be set to lower case
    const contractTransactionId = 'lheofeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: nameToBuy, // should cost 5000000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    const anotherNameToBuy = 'vile';
    const interaction = await pst.writeInteraction({
      function: 'buyRecord',
      name: anotherNameToBuy, // should cost 156250000 tokens
      contractTransactionId: 'atomic',
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState); // Had to do this because I cannot use my custom token interface
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToBuy.toLowerCase()]).toEqual(
      contractTransactionId,
    );
    expect(currentStateJSON.records[anotherNameToBuy]).toEqual(
      interaction?.originalTxId,
    );
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
  });

  it('should not buy malformed, too long, existing, or too expensive records', async () => {
    const emptyNameToBuy = '';
    const contractTransactionId = 'lheofeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: emptyNameToBuy, // should cost 156250000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
    const malformedNameToBuy = '*&*##$%#';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: malformedNameToBuy, // should cost 156250000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
    const veryLongNameToBuy = 'this_is_a_looong_name';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: veryLongNameToBuy, // should cost 156250000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
    const existingNameToBuy = 'permaweb';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: existingNameToBuy, // should cost 156250000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
    const expensiveNameToBuy = 'v';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: expensiveNameToBuy, // should cost 5000000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
    const disallowedNameToBuy = 'test.subdomain.name';
    await pst.writeInteraction({
      function: 'buyRecord',
      name: disallowedNameToBuy, // should cost 125000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
  });

  // EVOLUTION
  it("should properly evolve contract's source code", async () => {
    pst.connect(wallet);

    const newSource = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
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

    // note: the balance should return correctly now
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX,
    );
  });

  it('should properly transfer and perform dry write with overwritten caller', async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);

    await pst.transfer({
      target: overwrittenCaller.toString(),
      qty: TRANSFER_COST,
    });

    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX - TRANSFER_COST,
    );
    expect((await pst.currentState()).balances[overwrittenCaller]).toEqual(
      TRANSFER_COST,
    );
    const result: InteractionResult<PstState, unknown> = await pst.dryWrite(
      {
        function: 'transfer',
        target: 'NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
        qty: INTERACTION_COST,
      },
      overwrittenCaller,
    );

    expect(result.state.balances[overwrittenCaller]).toEqual(
      TRANSFER_COST - INTERACTION_COST,
    );
    expect(
      result.state.balances['NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g'],
    ).toEqual(INTERACTION_COST);
  });

  it('should not transfer tokens with incorrect ownership', async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);
    pst.connect(newWallet);
    await pst.transfer({
      target: walletAddress.toString(),
      qty: TOKENS_TO_CREATE,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX - TRANSFER_COST,
    );
    expect((await pst.currentState()).balances[overwrittenCaller]).toEqual(
      undefined,
    );
  });

  it("should not evolve contract's source code without correct ownership", async () => {
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX - TRANSFER_COST,
    );

    const newSource = fs.readFileSync(
      path.join(__dirname, '../dist/contract.js'),
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

    // note: the evolved balance should not change since no evolution should have happened
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(
      EXPECTED_BALANCE_AFTER_INVALID_TX - TRANSFER_COST,
    );
  });

  it('should not remove names with incorrect ownership', async () => {
    const nameToRemove = 'permaweb';
    const contractTransactionId = 'lheofeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU';
    await pst.writeInteraction({
      function: 'removeRecord',
      name: nameToRemove,
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToRemove]).toEqual(
      contractTransactionId,
    );
  });

  it('should remove names with correct ownership', async () => {
    pst.connect(wallet); // connect the original owning wallet
    const nameToRemove = 'vile';
    await pst.writeInteraction({
      function: 'removeRecord',
      name: nameToRemove,
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToRemove]).toEqual(undefined);
  });

  it('should change fees with correct ownership', async () => {
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
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(feesToChange);
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

    let feesToChange = {
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
    let currentState = await pst.currentState();
    let currentStateString = JSON.stringify(currentState);
    let currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);

    let feesToChange2 = {
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
      fees: feesToChange2,
    });
    await mineBlock(arweave);
    currentState = await pst.currentState();
    currentStateString = JSON.stringify(currentState);
    currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);

    let feesToChange3 = {
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
      fees: feesToChange3,
    });
    await mineBlock(arweave);
    currentState = await pst.currentState();
    currentStateString = JSON.stringify(currentState);
    currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);

    let feesToChange4 = {
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
    currentState = await pst.currentState();
    currentStateString = JSON.stringify(currentState);
    currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);

    let feesToChange5 = {
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
      '33': 1000000,
    };
    await pst.writeInteraction({
      function: 'setFees',
      fees: feesToChange5,
    });
    await mineBlock(arweave);
    currentState = await pst.currentState();
    currentStateString = JSON.stringify(currentState);
    currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);

    let feesToChange6 = {
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
      fees: feesToChange6,
    });
    await mineBlock(arweave);
    currentState = await pst.currentState();
    currentStateString = JSON.stringify(currentState);
    currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);
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
      '20': 1,
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
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.fees).toEqual(originalFees);
  });

  it('should add valid whitelisted ANT Smartweave Contract Source TX IDs with correct ownership', async () => {
    pst.connect(wallet); // connect the original owning wallet
    const sourceTxIdToAdd = 'da51nhDwLZaLBA3lzpE7xl36Rms2NwUNZ7SKOTEWkbI';
    await pst.writeInteraction({
      function: 'addANTSourceCodeTx',
      contractTransactionId: sourceTxIdToAdd,
    });

    const anotherSourceTxIdToAdd = 'test'; // this should not get added because it is not a valid arweave transaction
    await pst.writeInteraction({
      function: 'addANTSourceCodeTx',
      contractTransactionId: anotherSourceTxIdToAdd,
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.approvedANTSourceCodeTxs).toContain(
      sourceTxIdToAdd,
    );
    if (
      currentStateJSON.approvedANTSourceCodeTxs.indexOf(
        anotherSourceTxIdToAdd,
      ) > -1
    ) {
      expect(false);
    } else {
      expect(true);
    }
  });

  it('should not add whitelisted ANT Smartweave Contract Source TX IDs with incorrect ownership', async () => {
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);
    const sourceTxIdToAdd = 'BLAHhDwLZaLBA3lzpE7xl36Rms2NwUNZ7SKOTEWkbI';
    await pst.writeInteraction({
      function: 'addANTSourceCodeTx',
      contractTransactionId: sourceTxIdToAdd,
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    if (
      currentStateJSON.approvedANTSourceCodeTxs.indexOf(sourceTxIdToAdd) > -1
    ) {
      expect(false);
    } else {
      expect(true);
    }
  });

  it('should not remove whitelisted ANT Smartweave Contract Source TX IDs with incorrect ownership', async () => {
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    const sourceTxIdToRemove = currentStateJSON.approvedANTSourceCodeTxs[0];
    await pst.writeInteraction({
      function: 'removeANTSourceCodeTx',
      contractTransactionId: sourceTxIdToRemove,
    });
    await mineBlock(arweave);
    const newState = await pst.currentState();
    const newStateString = JSON.stringify(newState);
    const newStateJSON = JSON.parse(newStateString);
    expect(newStateJSON.approvedANTSourceCodeTxs).toEqual(
      currentStateJSON.approvedANTSourceCodeTxs,
    );
  });

  it('should remove whitelisted ANT Smartweave Contract Source TX IDs with correct ownership', async () => {
    pst.connect(wallet);
    const sourceTxIdToRemove = 'da51nhDwLZaLBA3lzpE7xl36Rms2NwUNZ7SKOTEWkbI';
    await pst.writeInteraction({
      function: 'removeANTSourceCodeTx',
      contractTransactionId: sourceTxIdToRemove,
    });
    await mineBlock(arweave);
    const newState = await pst.currentState();
    const newStateString = JSON.stringify(newState);
    const newStateJSON = JSON.parse(newStateString);
    if (
      newStateJSON.approvedANTSourceCodeTxs.indexOf(sourceTxIdToRemove) > -1
    ) {
      expect(false);
    } else {
      expect(true);
    }
  });
});
