const getAuctionSchema = {
  $id: '#/definitions/getAuction',
  '$registry-validationFunctionName': 'validateGetAuction',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'getAuction',
    },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
  },
  required: ['name'],
  additionalProperties: false, // allows for auction properties to be provided to buy record
};

module.exports = {
  getAuctionSchema,
};
