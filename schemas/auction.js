const auctionBidSchema = {
  $id: '#/definitions/auctionBid',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'submitAuctionBid',
    },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]{1})$',
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
      pattern: '^[a-zA-Z0-9-]{43}$',
    },
  },
  required: ['name', 'contractTxId'],
  additionalProperties: false,
};

module.exports = {
  auctionBidSchema,
};
