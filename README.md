# AR.IO Network Test SmartWeave Contract

## Project setup

Clone this repository and install the dependencies.

- `nvm use`
- `yarn install`
- `yarn build`

## Testing

Unit tests and integration tests are located in the [tests] directory. Both unit and integration tests are written using [Jest].

### Integration Tests

Runs integration tests against deployed Smartweave contract using [Warp SDK].

- `yarn test:integration` - runs full test suite
- `yarn test:integration -t 'auctions'` - runs tests that match this spec name (e.g. `auctions.test.ts`)

### Unit Tests

Runs unit tests against contract source code located in [src] directory.

- `yarn test:unit` - runs full unit test suite located in [tests/unit]
- `yarn test:unit -t 'auctions'` - runs unit tests that match this spec name (e.g. `auctions.test.ts`)

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

- [initiate-operator-stake-decrease] - initiate a stake decrease for an existing registered Gateway

  ```shell
  yarn ts-node tools/initiate-operator-stake-decrease.ts
  ```

- [finalize-operator-stake-decrease] - after stake withdraw period, this completes the operator stake decrease and returns the specific amount back to the operator.

  ```shell
  yarn ts-node tools/finalize-operator-stake-decrease.ts
  ```

- [initiate-leave-network] - initiate network withdraw period to remove a registered Gateway from the Gateway Address Registry and return all gateway operator stakes.

  ```shell
  yarn ts-node tools/initiate-leave-network.ts
  ```

- [finalize-leave-network] - finalize network withdraw period completes, this will finish removing the gateway from the Gateway Address Registry and returns all stakes back to the operator.

  ```shell
  yarn ts-node tools/finalize-leave-network.ts
  ```

[join-network]: tools/join-network.ts
[update-gateway-settings]: tools/update-gateway-settings.ts
[increase-operator-stake]: tools/increase-operator-stake.ts
[initiate-operator-stake-decrease]: tools/initiate-operator-stake-decrease.ts
[finalize-operator-stake-decrease]: tools/finalize-operator-stake-decrease.ts
[initiate-leave-network]: tools/initiate-leave-network.ts
[finalize-leave-network]: tools/finalize-leave-network.ts
[buy-arns-name]: tools/buy-arns-name.ts
[buy-arns-name-atomic-ant]: /tools/buy-arns-name-atomic-ant.ts
[tests/unit]: /tests/unit
[src]: /src
[tests]: /tests
[Warp SDK]: https://github.com/warp-contracts/warp
[Jest]: https://jestjs.io/
