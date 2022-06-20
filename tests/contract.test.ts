import ArLocal from "arlocal";
import Arweave from "arweave";
import { addFunds, mineBlock } from "../utils/_helpers";
import * as fs from "fs";
import path from "path";
import {
  InteractionResult,
  LoggerFactory,
  PstContract,
  PstState,
  Warp,
  WarpNodeFactory,
} from "warp-contracts";
import { JWKInterface } from "arweave/node/lib/wallet";
import { ArNSState } from "../src/contracts/types/types";

const TOKENS_TO_CREATE = 0; // ten million tokens

describe("Testing the ArNS Registry Contract", () => {
  let contractSrc: string;
  let wallet: JWKInterface;
  let walletAddress: string;
  let initialState: ArNSState;
  let Warp: Warp;
  let arweave: Arweave;
  let pst: PstContract;
  const arlocal = new ArLocal(1820, false);
  beforeAll(async () => {
    // ~~ Set up ArLocal and instantiate Arweave ~~
    await arlocal.start();

    arweave = Arweave.init({
      host: "localhost",
      port: 1820,
      protocol: "http",
    });

    // ~~ Initialize 'LoggerFactory' ~~
    LoggerFactory.INST.logLevel("fatal");

    // ~~ Set up Warp ~~
    Warp = WarpNodeFactory.forTesting(arweave);

    // ~~ Generate wallet and add funds ~~
    wallet = await arweave.wallets.generate();
    walletAddress = await arweave.wallets.jwkToAddress(wallet);
    await addFunds(arweave, wallet);

    // ~~ Read contract source and initial state files ~~
    contractSrc = fs.readFileSync(
      path.join(__dirname, "../dist/contract.js"),
      "utf8"
    );
    const stateFromFile: ArNSState = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../dist/contracts/initial-state.json"),
        "utf8"
      )
    );

    // ~~ Update initial state ~~
    initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress,
      },
      balances: {
        [walletAddress]: TOKENS_TO_CREATE,
      },
    };

    // ~~ Deploy contract ~~
    const contractTxId = await Warp.createContract.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
    });

    // ~~ Connect to the pst contract ~~
    pst = Warp.pst(contractTxId);
    pst.connect(wallet);

    // ~~ Mine block ~~
    await mineBlock(arweave);
  });

  afterAll(async () => {
    console.log(await pst.currentState());
    // ~~ Stop ArLocal ~~
    await arlocal.stop();
  });

  it("should read pst state and balance data", async () => {
    console.log(await pst.currentState());
    expect(await pst.currentState()).toEqual(initialState);
    expect((await pst.currentState()).owner).toEqual(walletAddress);
  });

  it("should properly mint tokens", async () => {
    await pst.writeInteraction({
      function: "mint",
      qty: 20000000,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000
    );
  });

  it("should properly buy records", async () => {
    const nameToBuy = "permaweb";
    const contractTransactionId = "lheofeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU"
    await pst.writeInteraction({
      function: "buyRecord",
      name: nameToBuy, // should cost 1500000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    const anotherNameToBuy = "vile";
    const anotherContractTransactionId = "BBBBfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU"
    await pst.writeInteraction({
      function: "buyRecord",
      name: anotherNameToBuy, // should cost 1500000 tokens
      contractTransactionId: anotherContractTransactionId,
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState); // Had to do this because I cannot use my custom token interface
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToBuy]).toEqual(contractTransactionId);
    expect(currentStateJSON.records[anotherNameToBuy]).toEqual(anotherContractTransactionId);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
  });

  it("should not buy malformed, too long, existing, or too expensive records", async () => {
    const emptyNameToBuy = "";
    const contractTransactionId = "lheofeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU"
    await pst.writeInteraction({
      function: "buyRecord",
      name: emptyNameToBuy, // should cost 1500000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
    const malformedNameToBuy = "*&*##$%#";
    await pst.writeInteraction({
      function: "buyRecord",
      name: malformedNameToBuy, // should cost 1500000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
    const veryLongNameToBuy = "this_is_a_looong_name";
    await pst.writeInteraction({
      function: "buyRecord",
      name: veryLongNameToBuy, // should cost 1500000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
    const existingNameToBuy = "permaweb";
    await pst.writeInteraction({
      function: "buyRecord",
      name: existingNameToBuy, // should cost 1500000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
    const expensiveNameToBuy = "v";
    await pst.writeInteraction({
      function: "buyRecord",
      name: expensiveNameToBuy, // should cost 10000000 tokens
      contractTransactionId,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      0 + 20000000 - 1500000 - 10000000
    );
  });

  it("should properly evolve contract's source code", async () => {
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(0 + 20000000 - 1500000 - 10000000);

    const newSource = fs.readFileSync(path.join(__dirname, '../src/tools/contract_evolve.js'), 'utf8');

    const newSrcTxId = await pst.save({src: newSource});
    if (newSrcTxId === null) {
      return 0;
    }
    await mineBlock(arweave);

    await pst.evolve(newSrcTxId);
    await mineBlock(arweave);

    // note: the evolved balance always returns -1
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(-1);

    const updatedContractTxId = await pst.save({src: contractSrc});
    if (updatedContractTxId === null) {
      return 0;
    }
    await mineBlock(arweave);
    await pst.evolve(updatedContractTxId);
    await mineBlock(arweave);

    // note: the balance should return correctly now
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(0 + 20000000 - 1500000 - 10000000);
  });

  it("should properly transfer and perform dry write with overwritten caller", async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);
    await pst.transfer({
      target: overwrittenCaller.toString(),
      qty: 500000,
    });

    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      10000000 - 1500000 - 500000
    );
    expect((await pst.currentState()).balances[overwrittenCaller]).toEqual(
      0 + 500000
    );
    const result: InteractionResult<PstState, unknown> = await pst.dryWrite(
      {
        function: "transfer",
        target: "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g",
        qty: 25000,
      },
      overwrittenCaller
    );

    expect(result.state.balances[overwrittenCaller]).toEqual(
      0 + 500000 - 25000
    );
    expect(
      result.state.balances["NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g"]
    ).toEqual(0 + 25000);
  });

  it("should not transfer tokens with incorrect ownership", async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);
    pst.connect(newWallet)
    await pst.transfer({
      target: walletAddress.toString(),
      qty: 1000000000,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      10000000 - 1500000 - 500000
    );
    expect((await pst.currentState()).balances[overwrittenCaller]).toEqual(undefined);
  });

  it("should not evolve contract's source code without correct ownership", async () => {
    const newWallet = await arweave.wallets.generate();
    await addFunds(arweave, newWallet);
    pst.connect(newWallet);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(10000000 - 1500000 - 500000);

    const newSource = fs.readFileSync(path.join(__dirname, '../src/tools/contract_evolve.js'), 'utf8');
    const newSrcTxId = await pst.save({src: newSource});
    if (newSrcTxId === null) {
      return 0;
    }
    await mineBlock(arweave);

    await pst.evolve(newSrcTxId);
    await mineBlock(arweave);

    // note: the evolved balance always returns 1 because the contract did not change
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(10000000 - 1500000 - 500000);
  });

  it("should not remove names with incorrect ownership", async () => {
    const nameToRemove = "vile";
    await pst.writeInteraction({
      function: "removeRecord",
      name: nameToRemove
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToRemove]).toEqual("BBBBfeBVyaJ8s9n7GxIyJNNc62jEVCKD7lbL3fV8kzU");
  });

  it("should remove names with correct ownership", async () => {
    pst.connect(wallet) // connect the original owning wallet
    const nameToRemove = "vile";
    await pst.writeInteraction({
      function: "removeRecord",
      name: nameToRemove
    });
    await mineBlock(arweave);
    const currentState = await pst.currentState();
    const currentStateString = JSON.stringify(currentState);
    const currentStateJSON = JSON.parse(currentStateString);
    expect(currentStateJSON.records[nameToRemove]).toEqual(undefined);
  });
});


