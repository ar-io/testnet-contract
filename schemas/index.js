const writeSchemas = require('./write');
const readSchemas = require('./read');
const contractSchema = require('./contract-state.json');

module.exports = {
  ...writeSchemas,
  ...readSchemas,
  contractSchema,
};
