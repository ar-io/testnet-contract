const buyRecordSchema = {
  $id: 'buyRecord', // Removed '#/definitions/' to align with how you add it to AJV
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'buyRecord',
    },
    name: { $ref: 'common#/$defs/name' }, // Updated $ref
    contractTxId: { $ref: 'common#/$defs/contractTxId' }, // Updated $ref
    years: { $ref: 'common#/$defs/years' }, // Updated $ref
    type: { $ref: 'common#/$defs/type' }, // Updated $ref
    auction: {
      type: 'boolean',
    },
  },
  required: ['name', 'function'],
  additionalProperties: true,
};

module.exports = {
  buyRecordSchema,
};
