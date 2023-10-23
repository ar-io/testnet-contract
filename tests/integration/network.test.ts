import { Contract, JWKInterface, PstState } from 'warp-contracts';

import { IOState } from '../../src/types';
import {
  CONTRACT_SETTINGS,
  NETWORK_HIDDEN_STATUS,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
  WALLET_FUND_AMOUNT,
} from '../utils/constants';
import {
  getCurrentBlock,
  getLocalArNSContractId,
  getLocalWallet,
  mineBlocks,
} from '../utils/helper';
import { arweave, warp } from '../utils/services';

describe('Network', () => {
  let contract: Contract<PstState>;
  let owner: JWKInterface;
  let ownerAddress: string;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractId();
  });

  describe('valid gateway operator', () => {
    let newGatewayOperator: JWKInterface;
    let newGatewayOperatorAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      newGatewayOperator = getLocalWallet(5);
      newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      contract = warp.pst(srcContractId).connect(newGatewayOperator);
    });

    describe('join network', () => {
      it('should join the network with correct parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevBalance =
          prevCachedValue.state.balances[newGatewayOperatorAddress];
        const joinGatewayPayload = {
          qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount + 1, // must meet the minimum
          label: 'Test Gateway', // friendly label
          fqdn: 'jest.io',
          port: 3000,
          protocol: 'http',
          properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
          note: 'Our gateway is the best test gateway. Contact bob@ar.io for more.',
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'joinNetwork',
          ...joinGatewayPayload,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newState.balances[newGatewayOperatorAddress]).toEqual(
          prevBalance - joinGatewayPayload.qty,
        );
        expect(newState.gateways[newGatewayOperatorAddress]).toEqual({
          operatorStake: joinGatewayPayload.qty,
          status: NETWORK_JOIN_STATUS,
          start: (await getCurrentBlock(arweave)).valueOf(),
          end: 0,
          vaults: [],
          settings: {
            label: joinGatewayPayload.label,
            fqdn: joinGatewayPayload.fqdn,
            port: joinGatewayPayload.port,
            protocol: joinGatewayPayload.protocol,
            properties: joinGatewayPayload.properties,
            note: joinGatewayPayload.note,
          },
        });
      });

      it.each(['', undefined, -1, 100_000])(
        'should fail for invalid ports',
        async (badPort) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'Test Gateway', // friendly label
            fqdn: 'jest.io',
            port: badPort,
            protocol: 'http',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'Our gateway is the best test gateway. Contact bob@ar.io for more.',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['bad', undefined, 1, 'httpsp'])(
        'should fail for invalid protocol',
        async (badProtocol) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'Test Gateway', // friendly label
            fqdn: 'jest.io',
            port: 3000,
            protocol: badProtocol,
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'Our gateway is the best test gateway. Contact bob@ar.io for more.',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['', undefined, 1])(
        'should fail for invalid label',
        async (badLabel) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: badLabel, // friendly label
            fqdn: 'jest.io',
            port: 3000,
            protocol: 'http',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'The best test gateway',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['https://full-domain.net', undefined, 'abcde', 100])(
        'should fail for invalid fqdn',
        async (badFqdn) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'test gateway', // friendly label
            fqdn: badFqdn,
            port: 3000,
            protocol: 'http',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'The best test gateway',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['', undefined, 100])(
        'should fail for invalid note',
        async (badNote) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'test gateway', // friendly label
            fqdn: 'testnet.com',
            port: 3000,
            protocol: 'http',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: badNote,
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['', undefined, 100])(
        'should fail for invalid properties',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'test gateway', // friendly label
            fqdn: 'testnet.com',
            port: 3000,
            protocol: 'http',
            properties: badProperties,
            note: 'test note',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([CONTRACT_SETTINGS.minNetworkJoinStakeAmount - 1])(
        'should fail for invalid qty',
        async (badQty) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            qty: badQty, // must meet the minimum
            label: 'test gateway', // friendly label
            fqdn: 'testnet.com',
            port: 3000,
            protocol: 'http',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'test note',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );
    });

    describe('operator stake', () => {
      it('should increase operator stake with correct parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[newGatewayOperatorAddress];
        const prevGatewayOperatorBalance =
          prevState.gateways[newGatewayOperatorAddress].operatorStake;
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseOperatorStake',
          qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newState.balances[newGatewayOperatorAddress]).toEqual(
          prevBalance - CONTRACT_SETTINGS.minNetworkJoinStakeAmount,
        );
        expect(
          newState.gateways[newGatewayOperatorAddress].operatorStake,
        ).toEqual(
          prevGatewayOperatorBalance +
            CONTRACT_SETTINGS.minNetworkJoinStakeAmount,
        );
      });

      it('should not increase operator stake without correct funds', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevBalance = prevState.balances[newGatewayOperatorAddress];
        const prevGatewayOperatorBalance =
          prevState.gateways[newGatewayOperatorAddress].operatorStake;
        const qty = 1_000_000_000_000_000_000_000; // a ridiculous amount of funds that this user does not have
        const writeInteraction = await contract.writeInteraction({
          function: 'increaseOperatorStake',
          qty,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        ); // this interaction should return an error since its not valid
        expect(newState.balances[newGatewayOperatorAddress]).toEqual(
          prevBalance,
        );
        expect(
          newState.gateways[newGatewayOperatorAddress].operatorStake,
        ).toEqual(prevGatewayOperatorBalance);
      });

      it('should decrease operator stake and create new vault', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const qty = CONTRACT_SETTINGS.minNetworkJoinStakeAmount; // This vault should still have enough tokens left
        const writeInteraction = await contract.writeInteraction({
          function: 'decreaseOperatorStake',
          qty,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const expectedStartBlock = (await getCurrentBlock(arweave)).valueOf();
        const expectedEndBlock =
          expectedStartBlock.valueOf() +
          CONTRACT_SETTINGS.operatorStakeWithdrawLength;
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(
          newState.gateways[newGatewayOperatorAddress].operatorStake,
        ).toEqual(
          prevState.gateways[newGatewayOperatorAddress].operatorStake - qty,
        );
        expect(newState.gateways[newGatewayOperatorAddress].vaults[0]).toEqual({
          balance: qty,
          end: expectedEndBlock,
          start: expectedStartBlock,
        });
      });

      it('should not decrease operator stake decrease if it brings the gateway below the minimum', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'decreaseOperatorStake',
          qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });

    describe('gateway settings', () => {
      it('should modify gateway settings with correct parameters', async () => {
        const updatedGatewaySettings = {
          label: 'Updated Label', // friendly label
          port: 80,
          protocol: 'http',
          fqdn: 'back-to-port-80.com',
          properties: 'WRONg6rQ9Py7L8j4CkS8jn818gdXW25Oofg0q2E58ro',
          note: '',
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          ...updatedGatewaySettings,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newState.gateways[newGatewayOperatorAddress].settings).toEqual(
          updatedGatewaySettings,
        );
      });

      it('should modify gateway settings with correct status', async () => {
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          status: NETWORK_HIDDEN_STATUS,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        const newGateway = newState.gateways[newGatewayOperatorAddress];
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newGateway.status).toEqual(NETWORK_HIDDEN_STATUS);
      });

      it('should not modify gateway settings with incorrect status', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          status: 'OOPSIE',
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();

        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it.each([
        'SUUUUUUUUUUUUUUUUUUUUUUUUUUPER LONG LABEL LONGER THAN 64 CHARS!!!!!!!!!',
        0,
        '',
      ])(
        'should not modify gateway settings with invalid label',
        async (badLabel) => {
          const { cachedValue: prevCachedValue } = await contract.readState();

          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            label: badLabel,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each(['', '443', 12345678, 0])(
        'should not modify gateway settings with invalid port',
        async (badPort) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            port: badPort,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it('should not modify gateway settings with invalid protocol', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const protocol = 'ipfs';
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          protocol,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it.each([
        '',
        '*&*##$%#',
        '-leading',
        'trailing-',
        'bananas.one two three',
        'this-is-a-looong-name-a-verrrryyyyy-loooooong-name-that-is-too-long',
        '192.168.1.1',
        12345,
      ])(
        'should not modify gateway settings with invalid fqdn',
        async (badFQDN) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            fqdn: badFQDN,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([
        'arweave',
        'nVmehvHGVGJaLC8mrOn6H3N3BWiquXKZ33_z6i2fnK/',
        12345678,
        0,
      ])(
        'should not modify gateway settings with invalid properties',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            properties: badProperties,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([
        'This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.  This note is way too long.',
        0,
      ])(
        'should not modify gateway settings with invalid note',
        async (badNote) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            note: badNote,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it('should not modify gateway settings with invalid parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const label = 'SUUUUUUUUUUUUUUUUUUUUUUUUUUPER LONG LABEL!!!!!!!!!'; // friendly label
        const port = 'string';
        const protocol = 'ipfs';
        const fqdn = 'fake_url.com';
        const properties = 12345;
        const note = 12345;
        const status = 'leavingNetwork';
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          label,
          port,
          protocol,
          fqdn,
          properties,
          note,
          status,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });

    describe('leaveNetwork', () => {
      it('should set the gateway status as leaving and create a new vault when the gateway has been joined for the minimum join length', async () => {
        // mine the required number of blocks
        await mineBlocks(arweave, CONTRACT_SETTINGS.minGatewayJoinLength);
        const writeInteraction = await contract.writeInteraction({
          function: 'leaveNetwork',
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        const vaultsForOperator =
          newState.gateways[newGatewayOperatorAddress].vaults;
        const expectedEndBlock =
          (await getCurrentBlock(arweave)).valueOf() +
          CONTRACT_SETTINGS.gatewayLeaveLength;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newState.gateways[newGatewayOperatorAddress].status).toEqual(
          NETWORK_LEAVING_STATUS,
        );
        expect(newState.gateways[newGatewayOperatorAddress].end).toEqual(
          expectedEndBlock,
        );
        // confirm all vaults get updated
        for (const vault of vaultsForOperator) {
          expect(vault).toEqual({
            balance: expect.any(Number),
            start: expect.any(Number),
            end: expectedEndBlock,
          });
        }
      });
    });
  });

  describe('non-valid gateway operator', () => {
    let nonGatewayOperator: JWKInterface;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      ownerAddress = await arweave.wallets.getAddress(owner);
      nonGatewayOperator = getLocalWallet(6);
      contract = warp.pst(srcContractId).connect(nonGatewayOperator);
    });

    describe('read interactions', () => {
      it('should be able to fetch gateway details via view state', async () => {
        const { result: gateway } = await contract.viewState({
          function: 'gateway',
          target: ownerAddress,
        });
        const expectedGatewayObj = expect.objectContaining({
          operatorStake: expect.any(Number),
          status: expect.any(String),
          vaults: expect.any(Array),
          settings: expect.any(Object),
        });
        expect(gateway).not.toBe(undefined);
        expect(gateway).toEqual(expectedGatewayObj);
      });

      it('should be return an error when fetching a non-existent gateway via viewState', async () => {
        const response = await contract.viewState({
          function: 'gateway',
          target: 'non-existent-gateway',
        });
        expect(response).not.toBe(undefined);
        expect(response?.errorMessage).toEqual(
          'This target does not have a registered gateway.',
        );
      });

      it('should be able to fetch gateways total stake', async () => {
        const { cachedValue } = await contract.readState();
        const fullState = cachedValue.state as IOState;
        const { result: gatewayTotalStake } = await contract.viewState({
          function: 'gatewayTotalStake',
          target: ownerAddress,
        });
        expect(gatewayTotalStake).toEqual(
          fullState.gateways[ownerAddress].operatorStake,
        );
      });

      it('should be able to fetch gateway address registry via view state', async () => {
        const { cachedValue } = await contract.readState();
        const fullState = cachedValue.state as IOState;
        const { result: gateways } = await contract.viewState({
          function: 'gatewayRegistry',
        });
        expect(gateways).not.toBe(undefined);
        expect(gateways).toEqual(fullState.gateways);
      });

      it('should be able to fetch stake ranked, active gateway address registry via view state', async () => {
        const { result: rankedGateways } = await contract.viewState({
          function: 'rankedGatewayRegistry',
        });
        expect(rankedGateways).not.toBe(undefined); // TODO, make this more specific
      });
    });

    describe('write interactions', () => {
      it('should not join the network without right amount of funds', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const qty = WALLET_FUND_AMOUNT * 2; // This user should not have this much
        const label = 'Invalid Gateway'; // friendly label
        const fqdn = 'invalid.io';
        const port = 3000;
        const protocol = 'http';
        const note = 'Invalid gateway';
        const properties = 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44';
        const writeInteraction = await contract.writeInteraction({
          function: 'joinNetwork',
          qty,
          label,
          fqdn,
          port,
          protocol,
          properties,
          note,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it('should not modify gateway settings without already being in GAR', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          status: NETWORK_HIDDEN_STATUS,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        expect(Object.keys(newCachedValue.errorMessages)).toContain(
          writeInteraction.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });
    });
  });
});
