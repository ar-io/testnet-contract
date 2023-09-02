const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernameCountSchema } = require('./undernames');
const { commonDefinitions } = require('./common');
const { extendRecordSchema } = require('./extend');

module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  extendRecordSchema,
  increaseUndernameCountSchema,
  commonDefinitions,
};
