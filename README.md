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

- `JWK` - the stringified JWK you want to use when writing interactions or deploying contracts
- `ARNS_CONTRACT_TX_ID` - the IO Testnet contract ID (defaulted to `bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U`)

You can copy [.env.sample](./env.sample) to `.env` and fill in the values before executing any scripts.

### Arweave Name System (ArNS)

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

### AR.IO Testnet Network

The following tools can be used to perform basic AR.IO Network operations, such as joining and leaving the network, along with managing the onchain settings of a Gateway.

- [join-network] - takes a Gateway into the ar.io network and adds the Gateway into the Gateway Address Registry. This detail includes the Gateway Operator’s public wallet address, fully qualified domain name, port, protocol, properties and friendly note.

  ```shell
  yarn ts-node tools/join-network.ts
  ```

- [update-gateway-settings] - modify the settings of an existing registered Gateway record in the Gateway Address Registry, like the friendly name, fully qualified domain name, port, protocol, status, properties, and note.

  ```shell
  yarn ts-node tools/update-gateway-settings.ts
  ```

- [increase-operator-stake] - increase the token amount staked for an existing registered Gateway.

  ```shell
  yarn ts-node tools/increase-operator-stake.ts
  ```

- [decrease-operator-stake] - decrease stake for an existing registered Gateway. Tokens are put into a vault and then returned to the gateway address after the specified duration.

  ```shell
  yarn ts-node tools/decrease-operator-stake.ts
  ```

- [leave-network] - remove a registered Gateway from the Gateway Address Registry and return all gateway operator stakes. Tokens are put into a vault and then returned to the gateway address after the specified duration.

  ```shell
  yarn ts-node tools/leave-network.ts
  ```

[join-network]: tools/join-network.ts
[update-gateway-settings]: tools/update-gateway-settings.ts
[increase-operator-stake]: tools/increase-operator-stake.ts
[decrease-operator-stake]: tools/decrease-operator-stake.ts
[leave-network]: tools/leave-network.ts
[buy-arns-name]: tools/buy-arns-name.ts
[buy-arns-name-atomic-ant]: /tools/buy-arns-name-atomic-ant.ts
[tests/unit]: /tests/unit
[src]: /src
[tests]: /tests
[Warp SDK]: https://github.com/warp-contracts/warp
[Jest]: https://jestjs.io/
