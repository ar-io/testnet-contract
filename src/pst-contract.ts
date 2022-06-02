import Arweave from "arweave";
import { SmartWeave, SmartWeaveWebFactory } from "redstone-smartweave";

export const arweave: Arweave = Arweave.init({
  //host: "testnet.redstone.tools",
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

export const smartweave: SmartWeave = SmartWeaveWebFactory.memCachedBased(
  arweave
)
  .useArweaveGateway()
  .build();
