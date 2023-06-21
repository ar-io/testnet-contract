import Arweave from 'arweave';
import * as fs from 'fs';
import path from 'path';
import {
  LoggerFactory,
  SourceType,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

import { IOState } from '../src/types';
import { keyfile } from './constants';

(async () => {
  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel('error');
  const arweave = new Arweave({
    host: 'ar-io.dev',
    port: 443,
    protocol: 'https',
  });

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true,
    arweave,
  ).use(new DeployPlugin());

  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());
  const walletAddress = await arweave.wallets.getAddress(wallet);
  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, '../dist/contract.js'),
    'utf8',
  );

  // load state of contract
  const TEST_ARNS_CONTRACT_TX_ID =
    'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
  const {
    cachedValue: { state: existingContractState },
  } = await warp.contract(TEST_ARNS_CONTRACT_TX_ID).readState();
  const { approvedANTSourceCodeTxs, evolve, ...relevantState } =
    existingContractState as any;
  const forkedState = {
    ...(relevantState as IOState),
    ticker: 'ARNS-TEST-V2',
    balances: {
      [walletAddress]: 10_000_000_000_000,
      'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo': 10_000_000_000,
      '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo': 10_000_000_000,
      '7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk': 10_000_000_000,
      KsUYFIGvpX9MCbhHvsHbPAnxLIMYpzifqNFtFSuuIHA: 10_000_000_000,
      'Kaajvkd2G--bS4qzKKECP1b2meEotzLwTPSoprSaQ_E': 10_000_000_000,
      q6zIf3KQRMCW9fytR0YlKG4oqw6Cox4r_bk7mq6JZBM: 10_000_000_000,
      QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ: 10_000_000_000,
    },
    reserved: {
      www: {},
      google: {
        target: 'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo',
      },
      microsoft: {
        target: 'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo',
      },
      apple: {
        target: 'KsUYFIGvpX9MCbhHvsHbPAnxLIMYpzifqNFtFSuuIHA',
      },
      adobe: {
        target: '7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk',
      },
      news: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      atticus: {
        target: '7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk',
      },
      turbo: {
        target: '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo',
      },
      july: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      august: {
        endTimestamp: Math.floor(new Date('08/01/2023').getTime() / 1000),
      },
      september: {
        endTimestamp: Math.floor(new Date('09/01/2023').getTime() / 1000),
      },
      phil: {
        target: 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ',
      },
      mataras: {
        target: 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ',
      },
      arielmelendez: {
        endTimestamp: Math.floor(new Date('06/21/2023').getTime() / 1000),
      },
      one: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      two: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      four: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      five: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      six: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      seven: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      eight: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      nine: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      ten: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      admin: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      amazon: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      alexa: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      android: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      bestbuy: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      boston: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      blackrock: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      biogen: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      buzzfeed: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      eth: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      ethereum: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      coinbase: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      costco: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      disney: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      edison: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      facebook: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      files: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      help: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      meta: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      chatgpt: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      faq: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      netflix: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      nginx: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      nvidia: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      python: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      spotify: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      tinyurl: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      youtube: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      weather: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      verizon: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      zoo: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      openai: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
      llm: {
        endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
      },
    },
  };
  // TODO: do some AJV validation the the initial state meets our spec
  // ~~ Deploy contract ~~
  const contractTxId = await warp.deploy(
    {
      wallet,
      initState: JSON.stringify(forkedState),
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          sourceType: SourceType.ARWEAVE, // evaluation is restricted to only L1 arweave transactions (does not load any interactions submitted to warp sequencer)
          unsafeClient: 'skip',
          internalWrites: true,
          useKVStorage: true, // tells evaluators the key value storage is used for storing contract state
          maxCallDepth: 3, // maximum allowed of cross contract, calls - we may want to set this to a larger number (e.g. 5) - relevant when evaluting a contract, if this is exceed for an interaction, error will be thrown
          remoteStateSyncEnabled: false, // disallows contract from being evaluated from remote source (r.e. D.R.E) - TODO: this should be validated
          waitForConfirmation: true, // contract allows interaction to wait for confirmations when interactions are submitted against as a part of evalutation
          updateCacheForEachInteraction: true, // required for internal writes - increases performance, but takes memory hit
          maxInteractionEvaluationTimeSeconds: 60, // TODO: we may want to set this, doesn't look like anything by default
          allowBigInt: false, // big int cannot be serialized to JSON, but with Key/Value store, maybe we set this to true? TODO: determine if we want BigInt
          throwOnInternalWriteError: true,
        },
      },
    },
    true,
  ); // disable bundling

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
