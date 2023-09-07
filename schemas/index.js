const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernameCountSchema } = require('./undernames');
const { extendRecordSchema } = require('./extend');

module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  extendRecordSchema,
  increaseUndernameCountSchema,
};
