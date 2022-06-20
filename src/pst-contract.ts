import Arweave from "arweave";
import { Warp, WarpWebFactory } from "warp-contracts";

export const arweave: Arweave = Arweave.init({
  //host: "testnet.redstone.tools",
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

export const smartweave: Warp = WarpWebFactory.memCachedBased(
  arweave
)
  .useArweaveGateway()
  .build();
