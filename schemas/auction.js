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
      pattern: '^(?!-)[a-zA-Z0-9-]{1,32}$',
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
          pattern: '^([a-zA-Z0-9-_]{43})$',
        },
        years: {
          type: 'integer',
          minimum: 1, // TODO: these validations should pull from state
          maximum: 3, // TODO: these validations should pull from state
        },
        tierNumber: {
          type: 'integer',
          minimum: 1, // TODO: these validations should pull from state
          maximum: 3, // TODO: these validations should pull from state
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
