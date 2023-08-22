const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernameCountSchema } = require('./undernames');
module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  increaseUndernameCountSchema,
};
