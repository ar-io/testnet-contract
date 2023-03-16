# Arweave Name Service Registry Pilot

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
yarn test -t='Records'
```

### Tools

In order to deploy contracts and use the Arweave Name Service Registry (along with creating Arweave Name Tokens) the following tools are available to be used.

Make sure to update the variables at the top of each tool's `.ts` file, as well as the local wallet file in `constants.ts`

- `buy-arns-name` purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Contract ID. Requires the name you wish to purchase, the existing ANT Smartweave Contract ID that will be added to the registry, and the ArNS Registry Smartcontract ID.
- `create-ant` creates a new ANT with arweave data pointer. Requires a short token ticker, a friendly token name, an Arweave Transaction ID as the data pointer, and the ANT Smartweave Contract Source Transaction ID. Please note that only the `@` sub domain will work at this time, and it is hard-coded into the script.
- `create-ant-and-buy-arns-name` creates a new ANT with arweave data pointer and then registers it in the ArNS Registry. Also this script will not check if the ANT was successfully created and mined before adding to the ArNS Registry. Requires a short token ticker, a friendly token name and an Arweave Transaction ID as the data pointer and the ANT Smartweave Contract Source Transaction ID. Please note that only the `@` sub domain will work at this time, and it is hard-coded into the script.
- `transfer-ant` transfers a ANT to another wallet. Requires the recipient target to transfer the ANT to, and the ANT Smartweave Contract ID that is to be transfered.
- `transfer-tokens` transfers ArNS tokens to another wallet. Requires the recipient target to transfer the tokens to.
- `buy-test-arns-name` uses the Redstone Testnet and purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Address
- `deploy-contract` deploys a new ArNS Contract to mainnet
- `deploy-test-contract` deploys a new ArNS Contract to Redstone Testnet

The above scripts must have their variables updated in the script, and can be run like the following example
`yarn ts-node .\src\tools\buy-arns-name.ts`

## TODO

- procotocal balances
- auction handling
- permabuy purchase logic
