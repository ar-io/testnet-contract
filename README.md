# AR.IO Network Test SmartWeave Contract

[![codecov](https://codecov.io/gh/ar-io/testnet-contract/graph/badge.svg?token=J2H5WQQ0IX)](https://codecov.io/gh/ar-io/testnet-contract)

## Project setup

Clone this repository and install the dependencies.

- `nvm use`
- `yarn install`
- `yarn build`

## Testing

Unit and integration tests are written using [Jest]. Setup files are located in [tests] directory.

### Integration Tests

Integration tests are located in the [tests] directory and run against ArLocal. They deploy multiple Smartweave contract using [Warp SDK].

- `yarn test:integration` - runs full test suite
- `yarn test:integration -t 'Auctions'` - runs integration tests that match this spec name (e.g. `Auctions`)
- `yarn test tests/records.test.ts` - runs a specific test file (e.g. `records.test.ts`)

### Unit Tests

Unit tests are located in the [src] directory and run against the source code directly.

- `yarn test:unit` - runs full unit test suite located in [tests/unit]
- `yarn test:unit -t 'submitAuctionBid'` - runs unit tests that match this spec name (e.g. `submitAuctionBid`)

## Linting & Formatting

Eslint and Prettier are used for static analysis and formatting.

- `yarn format:fix` - runs prettier and fixes any formatting issues
- `yarn lint:fix` - runs eslint and fixes any linting issues

## Tools

In order to deploy contracts and use the functions within the AR.IO Network, like Arweave Name System and the Gateway Address Registry, the following tools are available to be used.

Make sure to update the variables at the top of the respective file before running.

You can also modify the script to use `dryWrite` following Warps documentation [here](https://academy.warp.cc/docs/sdk/basic/contract-methods#drywrite).

### Environment Variables

- `WALLET_FILE_PATH` - the path to the wallet file you intend to use for the transaction (default is `./key.json`)
- `ARNS_CONTRACT_TX_ID` - the IO Testnet contract ID (defaulted to `bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U`)

You can copy [.env.sample](./env.sample) to `.env` and fill in the values before executing any scripts.

### CLI

#### Operators

- `yarn get-balance` - [get-balance] - get the balance of a wallet address.

```shell
❯ yarn get-balance
? Enter the address you want to check the balance >  QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ
Balance: 714667588.589208 IO
```

- `yarn join-network` - [join-network] - takes a Gateway into the ar.io network and adds the Gateway into the Gateway Address Registry. This detail includes the Gateway Operator’s public wallet address, fully qualified domain name, port, protocol, properties and friendly note.

```shell
❯ yarn join-network
? Enter your a friendly name for your gateway (e.g. Permagate) >  ArIO Gateway
? Enter your domain for this gateway (e.g. <my-gateway>.com) >  ar-io.dev
? Enter the amount of tokens you want to stake against your gateway (min 10,000 IO) >  10000
? Enter port used for this gateway >  443
? Enter protocol used for this gateway >  https
? Enter gateway properties (optional - use default if not sure) >  FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44
? Enter short note to further describe this gateway >  Operated by the ar.io team
? Enter the observer wallet public address >  QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ
? Enable or disable delegated staking? >  Yes
? Enter the percent of gateway and observer rewards given to delegates >  25
? Enter the minimum stake in IO a delegate must use for this for this gateway >  500
? CONFIRM GATEWAY DETAILS? {"label":"ArIO Gateway","fqdn":"ar-io.dev","qty":10000,"port":443,"protocol":"https","properties":"FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44","note":"Operated by the ar.io team","observerWallet":"QGWqtJdLLgm2
ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ","allowDelegatedStaking":true,"delegateRewardShareRatio":25,"minDelegatedStake":500} > (Y/n)
```

- `yarn update-gateway-settings` - [update-gateway-settings] - modify the settings of an existing registered Gateway record in the Gateway Address Registry, like the friendly name, fully qualified domain name, port, protocol, status, properties, and note.

```shell
❯ yarn update-gateway-settings
? Enter your a friendly name for your gateway >  Test Gateway
? Enter your domain for this gateway >  permanence-testing.org
? Enter port used for this gateway >  443
? Enter protocol used for this gateway >  https
? Enter gateway properties (use default if not sure) >  raJgvbFU-YAnku-WsupIdbTsqqGLQiYpGzoqk9SCVgY
? Enter short note to further describe this gateway >  Test Gateway operated by PDS for the AR.IO ecosystem.
? Enter the observer wallet public address >  IPdwa3Mb_9pDD8c2IaJx6aad51Ss-_TfStVwBuhtXMs
? Enable or disable delegated staking? >  Yes
? Enter the percent of gateway and observer rewards given to delegates >  30
? Enter the minimum stake in IO a delegate must use for this for this gateway >  100000000
? CONFIRM UPDATED GATEWAY DETAILS? {"label":"Test Gateway","fqdn":"permanence-testing.org","port":443,"protocol":"https","properties":"raJgvbFU-YAnku-WsupIdbTsqqGLQiYpGzoqk9SCVgY","note":"Test Gateway operated by PDS for the AR.IO ecosys
tem.","observerWallet":"IPdwa3Mb_9pDD8c2IaJx6aad51Ss-_TfStVwBuhtXMs","allowDelegatedStaking":true,"delegateRewardShareRatio":30,"minDelegatedStake":100000000} > Yes
```

- `yarn delegate-stake` - [delegate-stake] - delegate stake a to a gateway that allows delegation - you will receive rewards for their work - based on their delegation settings.

```shell
❯ yarn delegate-stake
? Enter the target gateway you want to delegate to >  1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo
? Enter Stake Quantity (in IO) >  100
? CONFIRM DELEGATION DETAILS? {"target":"1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo","qty":100} > (Y/n)
```

- `yarn increase-operator-stake` - [increase-operator-stake] - increase the token amount staked for an existing registered Gateway.

```shell
❯ yarn increase-operator-stake
? Enter the additional operator stake amount in IO (current balance: 714667588.589208) IO >  100
? CONFIRM INCREASE OPERATOR STAKE DETAILS? {"qty":100} > (Y/n)
```

### Scripts

#### Arweave Name System (ArNS)

The following tools can be used to perform basic ArNS operations such as name purchase, ANT creation, and ANT transfer.

- [buy-arns-name] - purchases a new ArNS Name in the registry (if available) and adds the reference to an existing ANT Smartweave Contract ID

  ```shell
  yarn ts-node tools/buy-arns-name.ts
  ```

- [buy-arns-name-atomic-ant] - "atomically" registers an ArNS name, which includes the generation of a new ANT within the same transaction as the ArNS Name registration.
  pointer and the ANT Smartweave Contract Source Transaction ID. Please note that only the `@` sub domain will work at this time, and it is hard-coded into the script.

  ```shell
  yarn ts-node tools/buy-arns-name-atomic-ant.ts
  ```

#### AR.IO Testnet Network

The following tools can be used to perform basic AR.IO Network operations, such as joining and leaving the network, along with managing the onchain settings of a Gateway.

- [transfer-tokens] - transfer tokens from one wallet to another.

  ```shell
  yarn ts-node tools/transfer-tokens.ts
  ```

- [decrease-operator-stake] - decrease stake for an existing registered Gateway. Tokens are put into a vault and then returned to the gateway address after the specified duration.

  ```shell
  yarn ts-node tools/decrease-operator-stake.ts
  ```

- [get-prescribed-observers] - returns the array of prescribed observers for the current epoch and their weights.

  ```shell
  yarn ts-node tools/get-prescribed-observers.ts
  ```

- [leave-network] - remove a registered Gateway from the Gateway Address Registry and return all gateway operator stakes. Tokens are put into a vault and then returned to the gateway address after the specified duration.

  ```shell
  yarn ts-node tools/leave-network.ts
  ```

[get-balance]: tools/cli/get-balance.ts
[join-network]: tools/cli/join-network.ts
[update-gateway-settings]: tools/cli/update-gateway-settings.ts
[increase-operator-stake]: tools/cli/increase-operator-stake.ts
[decrease-operator-stake]: tools/decrease-operator-stake.ts
[delegate-stake]: tools/cli/delegate-stake.ts
[get-prescribed-observers]: tools/get-prescribed-observers.ts
[leave-network]: tools/leave-network.ts
[buy-arns-name]: tools/buy-arns-name.ts
[buy-arns-name-atomic-ant]: /tools/buy-arns-name-atomic-ant.ts
[tests/unit]: /tests/unit
[src]: /src
[tests]: /tests
[Warp SDK]: https://github.com/warp-contracts/warp
[Jest]: https://jestjs.io/
