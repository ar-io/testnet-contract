# AR.IO Network Test SmartWeave Contract

## Project setup

Clone this repository and install the dependencies.

```shell
yarn install
```

### Compiles and minifies for production

```shell
yarn build
```

### Tests contracts with arlocal

```shell
yarn test
```

To test a specific suite

```shell
yarn jest test FILENAME
```

## Tools

In order to deploy contracts and use the functions within the AR.IO Network, like Arweave Name System and the Gateway Address Registry, the following tools are available to be used.

Make sure to update the variables at the top of each tool's `.ts` file, as well as the local wallet file in `constants.ts`

They can be run using the following example
`yarn ts-node .\tools\buy-arns-name.ts`

### Arweave Name System

The following tools can be used to perform basic ArNS operations such as name purchase, ANT creation, and ANT transfer.

- `buy-arns-name` purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Contract ID. Requires the name you wish to purchase, the existing ANT Smartweave Contract ID that will be added to the registry, and the ArNS Registry Smartcontract ID. Can also "atomically" register ArNS names, which includes the generation of a new ANT within the same transaction as the ArNS Name registration.
- `create-ant` creates a new ANT with arweave data pointer. Requires a short token ticker, a friendly token name, an Arweave Transaction ID as the data pointer, and the ANT Smartweave Contract Source Transaction ID. Please note that only the `@` sub domain will work at this time, and it is hard-coded into the script.
- `create-ant-and-buy-arns-name` creates a new ANT with arweave data pointer and then registers it in the ArNS Registry. Also this script will not check if the ANT was successfully created and mined before adding to the ArNS Registry. Requires a short token ticker, a friendly token name and an Arweave Transaction ID as the data pointer and the ANT Smartweave Contract Source Transaction ID. Please note that only the `@` sub domain will work at this time, and it is hard-coded into the script.
- `transfer-ant` transfers a ANT to another wallet. Requires the recipient target to transfer the ANT to, and the ANT Smartweave Contract ID that is to be transfered.
- `buy-test-arns-name` uses the Redstone Testnet and purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Address

### AR.IO Network Operations

The following tools can be used to perform basic AR.IO Network operations, such as joining and leaving the network, along with managing the onchain settings of a Gateway.

- `join-network` Stakes a Gateway into the ar.io network and adds the Gatway into the Gateway Address Registry. This detail includes the Gateway Operator’s public wallet address, fully qualified domain name, port, protocol, properties and friendly note.
- `update-gateway-settings` Modifies the settings of an existing registered Gateway record in the Gateway Address Registry, like the friendly name, fully qualified domain name, port, protocol, status, properties, and note.
- `increase-operator-stake` Increase the token amount staked for an existing registered Gateway.
- `initiate-operator-stake-decrease` Begins stake withdraw period to decrease the token amount staked for an existing registered Gateway.
- `finalize-operator-stake-decrease` After stake withdraw period, this completes the operator stake decrease and returns the specific amount back to the operator.
- `initiate-leave-network` Begins network withdraw period to remove a registered Gateway from the Gateway Address Registry and return all gateway opertor stakes.
- `finalize-leave-network` After network withdraw period completes, this will finish removing the gateway from the Gateway Address Registry and returns all stakes back to the operator.

### Token Operations

The following tools can be used to transfer test IO tokens between Arweave wallets.

- `transfer-tokens` transfers test IO tokens to another wallet. Requires the recipient target to transfer the tokens to.

### Development

The following tools can be used to deploy new versions of this contract on both Warp Testnet and Arweave Mainnet

- `deploy-contract` deploys a new contract to Arweave mainnet
- `deploy-test-contract` deploys a new contract to Warp Testnet
