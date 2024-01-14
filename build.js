const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const standaloneCode = require('ajv/dist/standalone').default;
const { build } = require('esbuild');
const replace = require('replace-in-file');
const {
  auctionBidSchema,
  buyRecordSchema,
  extendRecordSchema,
  increaseUndernameCountSchema,
  joinNetworkSchema,
  transferTokensSchema,
  transferTokensLockedSchema,
  createVaultSchema,
  extendVaultSchema,
  increaseVaultSchema,
  saveObservationsSchema,
  updateGatewaySchema,
  delegateStakeSchema,
} = require('./schemas');

// build our validation source code
const ajv = new Ajv({
  schemas: [
    auctionBidSchema,
    buyRecordSchema,
    extendRecordSchema,
    increaseUndernameCountSchema,
    joinNetworkSchema,
    transferTokensSchema,
    transferTokensLockedSchema,
    createVaultSchema,
    extendVaultSchema,
    increaseVaultSchema,
    saveObservationsSchema,
    updateGatewaySchema,
    delegateStakeSchema,
  ],
  code: { source: true, esm: true },
  allErrors: true,
});

const moduleCode = standaloneCode(ajv, {
  validateAuctionBid: '#/definitions/auctionBid',
  validateBuyRecord: '#/definitions/buyRecord',
  validateExtendRecord: '#/definitions/extendRecord',
  validateIncreaseUndernameCount: '#/definitions/increaseUndernameCount',
  validateJoinNetwork: '#/definitions/joinNetwork',
  validateTransferToken: '#/definitions/transferTokens',
  validateTransferTokensLocked: '#/definitions/transferTokensLocked',
  validateCreateVault: '#/definitions/createVault',
  validateExtendVault: '#/definitions/extendVault',
  validateIncreaseVault: '#/definitions/increaseVault',
  validateSaveObservations: '#/definitions/saveObservations',
  validateUpdateGateway: '#/definitions/updateGateway',
  validateDelegateStake: '#/definitions/delegateStake',
});

// Now you can write the module code to file
fs.writeFileSync(path.join(__dirname, '/src/validations.js'), moduleCode);

const contract = ['/contract.ts'];

build({
  entryPoints: contract.map((source) => {
    return `./src${source}`;
  }),
  outdir: './dist',
  minify: false,
  bundle: true,
  format: 'iife',
  packages: 'external',
  tsconfig: 'tsconfig.json',
})
  .catch(() => process.exit(1))
  // note: SmartWeave SDK currently does not support files in IIFE bundle format, so we need to remove the "iife" part ;-)
  // update: it does since 0.4.31, but because viewblock.io is still incompatibile with this version, leaving as is for now.
  .finally(() => {
    const files = contract.map((source) => {
      return `./dist${source}`.replace('.ts', '.js');
    });
    replace.sync({
      files: files,
      from: [/\(\(\) => {/g, /}\)\(\);/g],
      to: '',
      countMatches: true,
    });
  });
