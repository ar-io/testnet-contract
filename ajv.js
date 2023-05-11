const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const standaloneCode = require('ajv/dist/standalone').default;

const buyRecordSchema = {
  $id: '#/definitions/buyRecord',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'buyRecord',
    },
    name: {
      type: 'string',
      pattern: '^(?!-)[a-zA-Z0-9-]{1,32}$',
    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    years: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
    },
    tierNumber: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
    },
  },
  required: ['name'],
  additionalProperties: false,
};

// The generated code will have a default export:
// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
const ajv = new Ajv({
  schemas: [buyRecordSchema],
  code: { source: true, esm: true },
});

const moduleCode = standaloneCode(ajv, {
  validateBuyRecord: '#/definitions/buyRecord',
});

// Now you can write the module code to file
fs.writeFileSync(path.join(__dirname, '/src/validations-mjs.mjs'), moduleCode);
