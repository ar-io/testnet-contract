const auctionBidSchema = {
  $id: '#/definitions/auctionBid',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      pattern: '^(submitAuctionBid|buyRecord)$',
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
      pattern: '^(atomic|[a-zA-Z0-9-_]{43})$',
    },
    auction: {
      type: 'boolean',
    },
  },
  required: ['name', 'contractTxId'],
  additionalProperties: true,
};

module.exports = {
  auctionBidSchema,
};
