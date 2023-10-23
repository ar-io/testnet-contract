import ArLocal from 'arlocal';
import Arweave from 'arweave';
import {
  LoggerFactory,
  WarpFactory,
  defaultCacheOptions,
} from 'warp-contracts';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

// Arlocal
export const arlocal = new ArLocal(1820, false);
// Arweave
export const arweave = Arweave.init({
  host: 'localhost',
  port: 1820,
  protocol: 'http',
});
// Warp
export const warp = WarpFactory.forLocal(1820, arweave, {
  ...defaultCacheOptions,
  inMemory: true,
}).use(new DeployPlugin());
// disable logging in warp
LoggerFactory.INST.logLevel('none');
