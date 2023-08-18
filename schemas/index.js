const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernamesSchema } = require('./increaseUndernames');
module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  increaseUndernamesSchema,
};
