const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const standaloneCode = require('ajv/dist/standalone').default;
const { build } = require('esbuild');
const replace = require('replace-in-file');
const { buyRecordSchema } = require('./schemas');
// build our validation source code
const ajv = new Ajv({
  schemas: [buyRecordSchema],
  code: { source: true, esm: true },
});

const moduleCode = standaloneCode(ajv, {
  validateBuyRecord: '#/definitions/buyRecord',
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
