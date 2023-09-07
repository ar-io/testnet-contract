const { buyRecordSchema } = require('./buyRecord');
const { submitAuctionBidSchema } = require('./submitAuctionBid');
const { increaseUndernameCountSchema } = require('./increaseUndernameCount');
const { extendRecordSchema } = require('./extendRecord');

module.exports = {
  submitAuctionBidSchema,
  buyRecordSchema,
  extendRecordSchema,
  increaseUndernameCountSchema,
};
