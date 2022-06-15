# Arweave Name Service Registry Pilot

## Project setup
```
yarn add arweave@1.10.23 arlocal@1.1.30 redstone-smartweave@0.5.6
```

### Compiles and minifies for production
```
yarn build
```

### Tests contracts with arlocal
```
yarn test
```

### Tools
In order to deploy contracts and use the Arweave Name Service Registry (along with creating Arweave Name Tokens) the following tools are available to be used. 

Make sure to update the variables at the top of each tool's `.ts` file, as well as the local wallet file in `constants.ts`  

- `buy-record` purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Address  
- `create-ant-and-buy-record` creates a new ANT with arweave data pointer and purchases a new ArNS Name in the registry (if available) and adds the reference to the ANT Smartweave Address  
- `create-ant` creates a new ANT with arweave data pointer  
- `transfer-ant` transfers a ANT to another wallet  
- `transfer-tokens` transfers ArNS tokens to another wallet  
- `buy-test-record` uses the Redstone Testnet and purchases a new ArNS Name in the registry (if availabile) and adds the reference to the ANT Smartweave Address  
- `deploy-contract` deploys a new ArNS Contract to mainnet  
- `deploy-test-contract` deploys a new ArNS Contract to Redstone Testnet  

Run an above script using yarn  
`yarn ts-node .\src\tools\buy-record.ts`