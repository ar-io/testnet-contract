import Arweave from "arweave";
import { Warp, WarpFactory, defaultCacheOptions } from "warp-contracts";

export const arweave: Arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

export const warpTestnet: Warp = WarpFactory.forTestnet(
  {
    ...defaultCacheOptions,
    inMemory: true,
  },
  true
);

export const warpMainnet: Warp = WarpFactory.forMainnet(
  {
    ...defaultCacheOptions,
    inMemory: true,
  },
  true
);
