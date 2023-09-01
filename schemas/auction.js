const auctionBidSchema = {
  $id: '#/definitions/auctionBid',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      pattern: '^(submitAuctionBid|buyRecord)$',
    },
    name: { $ref: 'common#/$defs/name' },
    type: { $ref: 'common#/$defs/type' },
    contractTxId: { $ref: 'common#/$defs/contractTxId' },
    qty: {
      type: 'number',
      minimum: 0,
    },
  },
  required: ['name', 'contractTxId'],
  additionalProperties: true,
};

module.exports = {
  auctionBidSchema,
};
