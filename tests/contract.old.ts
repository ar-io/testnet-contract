import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import {
  PstContract,
  Warp,
} from 'warp-contracts';

import { IOState } from '../src/contracts/types/types';

describe('Testing the ArNS Registry Contract', () => {
  let wallet: JWKInterface;
  let wallet2: JWKInterface;
  let walletAddress2: string;
  let arweave: Arweave;
  let pst: PstContract;

  jest.setTimeout(20000);

  it('should not extend record with not enough balance or invalid parameters', async () => {
    pst.connect(wallet2);
    const PREVIOUS_BALANCE = (await pst.currentBalance(walletAddress2)).balance;
    const PREVIOUS_END_TIMESTAMP = ((await pst.currentState()) as IOState)
      .records['vile'].endTimestamp;
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'doesnt-exist', // This name doesnt exist so it shouldnt be created
      years: 5,
    });
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'expired', // is already expired, so it should not be extendable
      years: 1,
    });
    await mineBlock(arweave);
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'microsoft', // should cost 1000000 tokens
      years: 1000, // too many years
    });
    await mineBlock(arweave);
    const newWallet = await arweave.wallets.generate();
    pst.connect(newWallet);
    await pst.writeInteraction({
      function: 'extendRecord',
      name: 'vile', // should cost too many tokens to extend this existing name with this empty wallet
      years: 50,
    });
    await mineBlock(arweave);
    const currentState = (await pst.currentState()) as IOState;
    expect(currentState.balances[walletAddress2]).toEqual(PREVIOUS_BALANCE);
    expect(currentState.records['vile'].endTimestamp).toEqual(
      PREVIOUS_END_TIMESTAMP,
    );
  });
});
