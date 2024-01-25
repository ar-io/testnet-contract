import {
  ANNUAL_PERCENTAGE_FEE,
  AUCTION_SETTINGS,
  GENESIS_FEES,
} from '../../constants';
import { getBaselineState, stubbedAuctionData } from '../../tests/stubs';
import { IOState } from '../../types';
import { getAuction } from './auctions';

describe('getAuction', () => {
  const stubbedAuctionHeight = AUCTION_SETTINGS.auctionDuration / 2;

  beforeAll(() => {
    // stub a height in the middle of the auction
    SmartWeave.block.height = stubbedAuctionHeight;
  });

  afterAll(() => {
    // reset the block height
    SmartWeave.block.height = 1;
    jest.resetAllMocks();
  });

  it.each([
    [
      'should return details and correct price for an existing auction',
      {
        ...getBaselineState(),
        auctions: {
          'existing-auction': stubbedAuctionData,
        },
      },
      {
        isActive: true,
        isAvailableForAuction: false,
        isRequiredToBeAuctioned: false,
        currentPrice: expect.any(Number), // this is a dynamic value, so we can't test it directly
        name: 'existing-auction',
        prices: expect.any(Object),
        ...stubbedAuctionData,
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
        currentPrice: expect.any(Number), // this is a dynamic value, so we can't test it directly
        name: 'new-auction',
        prices: expect.any(Object),
        years: 1,
        type: 'lease',
        startHeight: stubbedAuctionHeight,
        endHeight: stubbedAuctionHeight + AUCTION_SETTINGS.auctionDuration,
        // the name is 11 characters long
        startPrice:
          GENESIS_FEES['11'] *
          AUCTION_SETTINGS.startPriceMultiplier *
          (1 + ANNUAL_PERCENTAGE_FEE),
        floorPrice:
          GENESIS_FEES['11'] *
          AUCTION_SETTINGS.floorPriceMultiplier *
          (1 + ANNUAL_PERCENTAGE_FEE),
        initiator: '',
        contractTxId: '',
        settings: AUCTION_SETTINGS,
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
