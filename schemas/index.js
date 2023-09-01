const { buyRecordSchema } = require('./buyRecord');
const { auctionBidSchema } = require('./auction');
const { increaseUndernameCountSchema } = require('./undernames');
const { commonDefinitions } = require('./common');

module.exports = {
  auctionBidSchema,
  buyRecordSchema,
  increaseUndernameCountSchema,
  commonDefinitions,
};
