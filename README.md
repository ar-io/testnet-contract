# gnsr-beta-contract

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
In order to deploy contracts and use the Gateway Name Service Registry (along with creating Gateway Name Tokens) the following tools are available to be used. 

Make sure to update the variables at the top of each tool's `.ts` file, as well as the local wallet file in `constants.ts`  

- `buy-record` purchases a new GNS Name in the registry (if availabile) and adds the reference to the GNT Smartweave Address  
- `create-gnt-and-buy-record` creates a new GNT with arweave data pointer and purchases a new GNS Name in the registry (if available) and adds the reference to the GNT Smartweave Address  
- `create-gnt` creates a new GNT with arweave data pointer  
- `transfer-gnt` transfers a GNT to another wallet  
- `transfer-tokens` transfers GNSR tokens to another wallet  
- `buy-test-record` uses the Redstone Testnet and purchases a new GNS Name in the registry (if availabile) and adds the reference to the GNT Smartweave Address  
- `deploy-contract` deploys a new GNSR Contract to mainnet  
- `deploy-test-contract` deploys a new GNSR Contract to Redstone Testnet  

