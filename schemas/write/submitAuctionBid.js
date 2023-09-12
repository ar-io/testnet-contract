const submitAuctionBidSchema = {
  $id: '#/definitions/submitAuctionBid',
  "$registry-validationFunctionName": "validateSubmitAuctionBid",
  type: 'object',
  properties: {
    function: {
      type: 'string',
      pattern: '^(submitAuctionBid|buyRecord)$',
    },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    qty: {
      type: 'number',
      minimum: 0,
    },
    type: {
      type: 'string',
      pattern: '^(lease|permabuy)$',
    },
    contractTxId: {
      type: 'string',
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
  },
  required: ['name', 'contractTxId'],
  additionalProperties: true,
};

module.exports = {
  submitAuctionBidSchema,
};
