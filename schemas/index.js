const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernamesSchema } = require('./undernames');
module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  increaseUndernamesSchema,
};
