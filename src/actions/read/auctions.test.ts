import { baselineAuctionData, getBaselineState } from '../../tests/stubs';
import { IOState } from '../../types';
import { getAuction } from './auctions';

describe('getAuction', () => {
  const stubbedBlockHeight = 50;

  beforeAll(() => {
    // stub a height in the middle of the auction
    SmartWeave.block.height = stubbedBlockHeight;
  });

  afterAll(() => {
    // reset the block height
    SmartWeave.block.height = 1;
  });

  it.each([
    [
      'should return details and correct price for an existing auction',
      {
        ...getBaselineState(),
        auctions: {
          'existing-auction': baselineAuctionData,
        },
      },
      {
        isActive: true,
        isAvailableForAuction: false,
        isRequiredToBeAuctioned: false,
        currentPrice: 605.069371,
        name: 'existing-auction',
        prices: {
          [baselineAuctionData.startHeight]: baselineAuctionData.startPrice,
          [baselineAuctionData.startHeight + 30]: 737.424127,
          [baselineAuctionData.startHeight + 60]: 538.615114,
          [baselineAuctionData.startHeight + 90]: 389.416118,
        },
        ...baselineAuctionData,
      },
    ],
    [
      'should return details and floor price for a new auction',
      {
        ...getBaselineState(),
      },
      {
        isActive: false,
        isAvailableForAuction: true,
        isRequiredToBeAuctioned: false,
        currentPrice: 540000,
        name: 'new-auction',
        prices: {
          [50]: 54000000,
          [80]: 39820902.852326,
          [110]: 29085216.161125,
          [140]: 21028470.378378,
        },
        years: 1,
        type: 'lease',
        startHeight: stubbedBlockHeight,
        endHeight:
          stubbedBlockHeight +
          getBaselineState().settings.auctions.auctionDuration,
        startPrice: 54000000,
        floorPrice: 540000,
        initiator: '',
        contractTxId: '',
        settings: getBaselineState().settings.auctions,
      },
    ],
  ])(`%s`, (_: string, inputState: IOState, expectedReadResult: any) => {
    const { result } = getAuction(inputState, {
      caller: 'test-caller',
      input: {
        name: expectedReadResult.name,
      },
    });
    expect(result).toEqual(expectedReadResult);
  });
});
