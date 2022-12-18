import Arweave from "arweave";
import {
  defaultCacheOptions,
  LoggerFactory,
  WarpFactory,
} from "warp-contracts";
import { IOState } from "../contracts/types/types";
import * as fs from "fs";
import path from "path";
import { keyfile } from "../constants";
import { JWKInterface } from "arweave/node/lib/wallet";

// ~~ Initialize Arweave ~~
const arweave = Arweave.init({
  host: "arweave.net",
  timeout: 600000,
  port: 443,
  protocol: "https",
});

(async () => {
  let initialState: IOState;
  let wallet2: JWKInterface;
  let walletAddress2: string;
  let wallet3: JWKInterface;
  let walletAddress3: string;
  let wallet4: JWKInterface;
  let walletAddress4: string;
  let wallet5: JWKInterface;
  let walletAddress5: string;
  let gatewayWallet: JWKInterface;
  let gatewayWalletAddress: string;
  let gatewayWallet2: JWKInterface;
  let gatewayWalletAddress2: string;
  let delegateWallet: JWKInterface;
  let delegateWalletAddress: string;
  let delegateWallet2: JWKInterface;
  let delegateWalletAddress2: string;
  let slashedWallet: JWKInterface;
  let slashedWalletAddress: string;
  wallet2 = await arweave.wallets.generate();
  walletAddress2 = await arweave.wallets.jwkToAddress(wallet2);

  wallet3 = await arweave.wallets.generate();
  walletAddress3 = await arweave.wallets.jwkToAddress(wallet3);

  wallet4 = await arweave.wallets.generate();
  walletAddress4 = await arweave.wallets.jwkToAddress(wallet4);

  wallet5 = await arweave.wallets.generate();
  walletAddress5 = await arweave.wallets.jwkToAddress(wallet5);

  gatewayWallet = await arweave.wallets.generate();
  gatewayWalletAddress = await arweave.wallets.jwkToAddress(gatewayWallet);

  gatewayWallet2 = await arweave.wallets.generate();
  gatewayWalletAddress2 = await arweave.wallets.jwkToAddress(gatewayWallet2);

  delegateWallet = await arweave.wallets.generate();
  delegateWalletAddress = await arweave.wallets.jwkToAddress(delegateWallet);

  delegateWallet2 = await arweave.wallets.generate();
  delegateWalletAddress2 = await arweave.wallets.jwkToAddress(delegateWallet2);

  slashedWallet = await arweave.wallets.generate();
  slashedWalletAddress = await arweave.wallets.jwkToAddress(slashedWallet);

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel("error");

  // ~~ Initialize SmartWeave ~~
  const warp = WarpFactory.forMainnet(
    {
      ...defaultCacheOptions,
      inMemory: true,
    },
    true
  );

  // Get the key file used for the distribution
  const wallet = JSON.parse(await fs.readFileSync(keyfile).toString());
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, "../../dist/contract.js"),
    "utf8"
  );
  const stateFromFile: IOState = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../../dist/contracts/example-state-no-balances.json"
      ),
      "utf8"
    )
  );

  // expired name date
  let expiredDate = new Date();
  expiredDate.setFullYear(expiredDate.getFullYear() - 1);

  /*
  // ~~ Update initial state ~~
  initialState = {
    ...stateFromFile,
    ...{
      owner: walletAddress,
    },
    records: {
      ["permaweb"]: {
        // We set an expired name here so we can test overwriting it
        tier: 1,
        contractTxId: "io9_QNUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY",
        maxSubdomains: 100,
        minTtlSeconds: 3600, // tier 1 default for TTL
        endTimestamp: 100_000_000,
      },
      ["grace"]: {
        // We set a name in its grace period here
        tier: 3,
        contractTxId: "GRACENUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY",
        maxSubdomains: 10000,
        minTtlSeconds: 900, // tier 1 default for ttl
        endTimestamp: Math.round(Date.now() / 1000),
      },
      ["expired"]: {
        // We set an expired name here so we test extending
        tier: 1,
        contractTxId: "EXPIREUf4yBG0ErNKCmjGzZ-X9BJhmWOiVVQVyainlY",
        maxSubdomains: 100,
        minTtlSeconds: 3600, // tier 3 default for ttl
        endTimestamp: Math.round(expiredDate.getTime() / 1000),
      },
      ["ardrive-og-logo"]: {
        tier: 1,
        contractTxId: "6dUiTQKJCVD7c9icQhbbzfI-Le_hC4sXRDx1OQQ6jMI",
        maxSubdomains: 100,
        minTtlSeconds: 900, // tier 1 default for ttl
        endTimestamp: 1689431978,
      },
      ["gorilla"]: {
        contractTxId: "PsrA7IPJJHdK0kQ-4PJYJ0HzAgx8qsWVyeQvTSumr4w",
        endTimestamp: 1690590616,
        maxSubdomains: 100,
        minTtlSeconds: 3600,
        tier: 1,
      },
    },
    foundation: {
      balance: 0,
      actionPeriod: 17,
      minSignatures: 2,
      addresses: [walletAddress, walletAddress2, walletAddress3],
      actions: [],
    },
    balances: {
      [walletAddress]: 8_000_000_000, // create tokens during mint
      [walletAddress2]: 5_000_000,
      [walletAddress3]: 5_000_000,
      [gatewayWalletAddress]: 1_000_000,
      [gatewayWalletAddress2]: 3_250_000,
      [delegateWalletAddress]: 5_000,
      [delegateWalletAddress2]: 1_000,
    },
    vaults: {
      [walletAddress]: [
        {
          balance: 500_000, // Positive integer
          end: 1_000, // At what block the lock ends.
          start: 0, // At what block the lock starts.
        },
      ],
      [walletAddress3]: [
        {
          balance: 1_000_000, // Positive integer
          end: 1_000, // At what block the lock ends.
          start: 0, // At what block the lock starts.
        },
      ],
      [delegateWalletAddress2]: [
        {
          balance: 300_000, // Positive integer
          end: 5_000, // At what block the lock ends.
          start: 0, // At what block the lock starts.
        },
      ],
    },
    gateways: {
      [gatewayWalletAddress2]: {
        operatorStake: 80_000,
        delegatedStake: 300_000,
        vaults: [
          {
            balance: 40_000, // Positive integer
            end: 0, // At what block the lock ends.
            start: 1, // At what block the lock starts.
          },
        ],
        delegates: {
          [delegateWalletAddress2]: [
            {
              balance: 300_000, // Positive integer
              end: 5_000, // At what block the lock ends.
              start: 0, // At what block the lock starts.
            },
          ],
        },
        settings: {
          label: "Arweave Community Gateway", // The friendly name used to label this gateway
          sslFingerprint: "SHA-256 FINGERPRINT", // the SHA-256 Fingerprint used by SSL certificate used by this gateway eg. 5C 5D 05 16 C3 3C A3 34 51 78 1E 67 49 14 D4 66 31 A9 19 3C 63 8E F9 9E 54 84 1A F0 4C C2 1A 36
          ipV4Address: "10.230.70.22", // the IP address this gateway can be reached at eg. 10.124.72.100
          url: "arweave.net", // the fully qualified domain name this gateway can be reached at. eg arweave.net
          port: 443, // The port used by this gateway eg. 443
          protocol: "https", // The protocol used by this gateway, either http or https
        },
      },
      [slashedWalletAddress]: {
        operatorStake: 6_000, // this includes the additional vault we add below
        delegatedStake: 866, // this includes the additional delegate we add below
        vaults: [
          {
            balance: 5_000, // Positive integer
            end: 0, // At what block the lock ends.
            start: 1, // At what block the lock starts.
          },
        ],
        delegates: {
          [delegateWalletAddress]: [
            {
              balance: 100, // Positive integer
              end: 0, // At what block the lock ends.
              start: 1, // At what block the lock starts.
            },
          ],
        },
        settings: {
          label: "Slashme", // The friendly name used to label this gateway
          sslFingerprint:
            "B7 BC 55 10 CC 1C 63 7B 5E 5F B7 85 81 6A 77 3D BB 39 4B 68 33 7B 1B 11 7C A5 AB 43 CC F7 78 CF", // the SHA-256 Fingerprint used by SSL certificate used by this gateway eg. 5C 5D 05 16 C3 3C A3 34 51 78 1E 67 49 14 D4 66 31 A9 19 3C 63 8E F9 9E 54 84 1A F0 4C C2 1A 36
          ipV4Address: "75.10.113.66", // the IP address this gateway can be reached at eg. 10.124.72.100
          url: "slash-this-gateway.io", // the fully qualified domain name this gateway can be reached at. eg arweave.net
          port: 443, // The port used by this gateway eg. 443
          protocol: "https", // The protocol used by this gateway, either http or https
        },
      },
    },
  };

  initialState.gateways[slashedWalletAddress].delegates[
    delegateWalletAddress
  ].push({
    balance: 100, // Positive integer
    end: 0, // At what block the lock ends.
    start: 1, // At what block the lock starts.
  });

  initialState.gateways[slashedWalletAddress].delegates[
    delegateWalletAddress2
  ] = [
    {
      balance: 666, // Positive integer
      end: 0, // At what block the lock ends.
      start: 1, // At what block the lock starts.
    },
  ];

  initialState.gateways[slashedWalletAddress].vaults.push({
    balance: 1_000, // Positive integer
    end: 0, // At what block the lock ends.
    start: 1, // At what block the lock starts.
  }); */

  // ~~ Deploy contract ~~
  const contractTxId = await warp.createContract.deploy({
    wallet,
    initState: JSON.stringify(stateFromFile),
    src: contractSrc,
  });

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
