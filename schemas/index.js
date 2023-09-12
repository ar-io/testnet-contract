const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema, getAuctionSchema } = require('./auction');
const { increaseUndernameCountSchema } = require('./undernames');
const { extendRecordSchema } = require('./extend');
const { joinNetworkSchema } = require('./network');
const { transferTokensSchema } = require('./transfer');

module.exports = {
  auctionBidSchema,
  getAuctionSchema,
  buyRecordSchema,
  extendRecordSchema,
  increaseUndernameCountSchema,
  joinNetworkSchema,
  transferTokensSchema,
};
