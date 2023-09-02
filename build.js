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
  commonDefinitions,
} = require('./schemas');

// build our validation source code
const ajv = new Ajv({
  code: { source: true, esm: true },
  allErrors: true,
});

// Explicitly add common definitions and main schemas
ajv.addSchema(commonDefinitions, 'common');
ajv.addSchema(auctionBidSchema, 'auctionBid');
ajv.addSchema(buyRecordSchema, 'buyRecord');
ajv.addSchema(extendRecordSchema, 'extendRecord');
ajv.addSchema(increaseUndernameCountSchema, 'increaseUndernameCount');

const moduleCode = standaloneCode(ajv, {
  validateBuyRecord: 'buyRecord',
  validateAuctionBid: 'auctionBid',
  validateExtendRecord: 'extendRecord',
  validateIncreaseUndernameCount: 'increaseUndernameCount',
});

// Now you can write the module code to file
fs.writeFileSync(path.join(__dirname, '/src/validations.mjs'), moduleCode);

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
