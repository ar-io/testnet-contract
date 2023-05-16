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
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    qty: {
      type: 'number',
      minimum: 0,
    },
    details: {
      $id: '#/definitions/auctionDetails',
      type: 'object',
      properties: {
        contractTxId: {
          type: 'string',
          pattern: '^[a-zA-Z0-9-]{43}$',
        },
        years: {
          type: 'integer',
          minimum: 1,
        },
        tier: {
            type: 'string',
            pattern: '^[a-zA-Z0-9-]{43}$',
        },
      },
      required: ['contractTxId'],
      additionalProperties: false,
    },
  },
  required: ['name', 'details'],
  additionalProperties: false,
};

module.exports = {
  auctionBidSchema,
};
