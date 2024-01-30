import { Contract, JWKInterface } from 'warp-contracts';

import {
  Gateway,
  IOState,
  ObserverWeights,
  WalletAddress,
  WeightedObserver,
} from '../src/types';
import {
  CONTRACT_SETTINGS,
  DEFAULT_GATEWAY_PERFORMANCE_STATS,
  GATEWAY_LEAVE_BLOCK_LENGTH,
  MIN_DELEGATED_STAKE,
  NETWORK_JOIN_STATUS,
  NETWORK_LEAVING_STATUS,
  WALLET_FUND_AMOUNT,
} from './utils/constants';
import {
  createLocalWallet,
  getCurrentBlock,
  getLocalArNSContractKey,
  getLocalWallet,
  mineBlocks,
} from './utils/helper';
import { arweave, warp } from './utils/services';

describe('Network', () => {
  let nonGatewayOperator: JWKInterface;
  let contract: Contract<IOState>;
  let owner: JWKInterface;
  let ownerAddress: string;
  let srcContractId: string;

  beforeAll(async () => {
    srcContractId = getLocalArNSContractKey('id');
  });

  describe('valid gateway operator', () => {
    let newGatewayOperator: JWKInterface;
    let newGatewayOperatorAddress: string;

    beforeAll(async () => {
      owner = getLocalWallet(0);
      newGatewayOperator = getLocalWallet(15);
      newGatewayOperatorAddress = await arweave.wallets.getAddress(
        newGatewayOperator,
      );
      contract = warp
        .contract<IOState>(srcContractId)
        .connect(newGatewayOperator);
    });

    describe('join network', () => {
      it.each([
        'blah',
        500,
        '%dZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
        'NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g-NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
      ])(
        'should fail network join with invalid observer wallet address',
        async (badObserverWallet) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const joinGatewayPayload = {
            observerWallet: badObserverWallet,
            qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
            label: 'Test Gateway', // friendly label
            fqdn: 'jest.io',
            port: '443',
            protocol: 'https',
            properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
            note: 'Our gateway is the best test gateway. Contact bob@ar.io for more.',
          };
          const writeInteraction = await contract.writeInteraction({
            function: 'joinNetwork',
            ...joinGatewayPayload,
          });
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction?.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

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

      it.each([
        '',
        undefined,
        1,
        'SUUUUUUUUUUUUUUUUUUUUUUUUUUPER LONG LABEL LONGER THAN 64 CHARS!!!!!!!!!',
      ])('should fail for invalid label', async (badLabel) => {
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
          writeInteraction?.originalTxId,
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
        'https://full-domain.net',
        undefined,
        'abcde',
        'test domain.com',
        'jons.cool.site.',
        'a-very-really-long-domain-name-that-is-longer-than-63-characters.com',
        'website.a-very-really-long-top-level-domain-name-that-is-longer-than-63-characters',
        '-startingdash.com',
        'trailingdash-.com',
        '---.com',
        ' ',
        100,
        '%percent.com',
      ])('should fail for invalid fqdn', async (badFqdn) => {
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
          writeInteraction?.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it.each([
        '',
        undefined,
        100,
        'this note is way too long.  please ignore this very long note. this note is way too long.  please ignore this very long note. this note is way too long.  please ignore this very long note. this note is way too long.  please ignore this very long note. this note is way too long.  please ignore this very long note.',
      ])('should fail for invalid note', async (badNote) => {
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
          writeInteraction?.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it.each([
        '',
        undefined,
        100,
        'not a tx',
        'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY4*',
      ])('should fail for invalid properties', async (badProperties) => {
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
          writeInteraction?.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it.each([
        CONTRACT_SETTINGS.minNetworkJoinStakeAmount - 1,
        100000000000000000000,
        -1,
        CONTRACT_SETTINGS.minNetworkJoinStakeAmount.toString,
      ])('should fail for invalid qty', async (badQty) => {
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
          writeInteraction?.originalTxId,
        );
        expect(newCachedValue.state).toEqual(prevCachedValue.state);
      });

      it('should join the network with correct parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const allowedDelegates: string[] = [];
        const prevBalance =
          prevCachedValue.state.balances[newGatewayOperatorAddress];
        const joinGatewayPayload = {
          observerWallet: newGatewayOperatorAddress,
          qty: CONTRACT_SETTINGS.minNetworkJoinStakeAmount, // must meet the minimum
          label: 'Test Gateway', // friendly label
          fqdn: 'jest.io',
          port: 3000,
          protocol: 'http',
          properties: 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
          note: 'Our gateway is the best test gateway. Contact bob@ar.io for more.',
          allowDelegatedStaking: false,
          allowedDelegates,
          delegateRewardShareRatio: 0,
          minDelegatedStake: MIN_DELEGATED_STAKE,
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'joinNetwork',
          ...joinGatewayPayload,
        });
        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction?.originalTxId,
        );
        expect(newState.balances[newGatewayOperatorAddress]).toEqual(
          prevBalance - joinGatewayPayload.qty,
        );
        expect(newState.gateways[newGatewayOperatorAddress]).toEqual({
          operatorStake: joinGatewayPayload.qty,
          delegatedStake: 0,
          status: NETWORK_JOIN_STATUS,
          start: (await getCurrentBlock(arweave)).valueOf(),
          end: 0,
          observerWallet: newGatewayOperatorAddress,
          vaults: {},
          delegates: {},
          stats: DEFAULT_GATEWAY_PERFORMANCE_STATS,
          settings: {
            label: joinGatewayPayload.label,
            fqdn: joinGatewayPayload.fqdn,
            port: joinGatewayPayload.port,
            protocol: joinGatewayPayload.protocol,
            properties: joinGatewayPayload.properties,
            note: joinGatewayPayload.note,
            allowDelegatedStaking: false,
            allowedDelegates,
            delegateRewardShareRatio: 0,
            minDelegatedStake: MIN_DELEGATED_STAKE,
          },
        });
      });
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
        expect(
          newState.gateways[newGatewayOperatorAddress].vaults[
            writeInteraction?.originalTxId
          ],
        ).toEqual({
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
        const observerWallet = 'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA';
        const allowedDelegates: string[] = [];
        const updatedGatewaySettings = {
          label: 'Updated Label', // friendly label
          port: 80,
          protocol: 'http',
          fqdn: 'back-to-port-80.com',
          properties: 'WRONg6rQ9Py7L8j4CkS8jn818gdXW25Oofg0q2E58ro',
          note: 'a new note',
          allowDelegatedStaking: true,
          delegateRewardShareRatio: Math.floor((1 - 0.9) * 100),
          allowedDelegates,
          minDelegatedStake: MIN_DELEGATED_STAKE + 1,
        };
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
          observerWallet,
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
        expect(
          newState.gateways[newGatewayOperatorAddress].observerWallet,
        ).toEqual(observerWallet);
      });

      it.each([
        'blah',
        500,
        '%dZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
        'NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g-NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
      ])(
        'should not modify gateway settings with incorrect observer wallet address',
        async (badObserverWallet) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            observerWallet: badObserverWallet,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(Object.keys(newCachedValue.errorMessages)).toContain(
            writeInteraction?.originalTxId,
          );
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([
        '',
        1,
        'SUUUUUUUUUUUUUUUUUUUUUUUUUUPER LONG LABEL LONGER THAN 64 CHARS!!!!!!!!!',
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

      it.each(['', '443', 12345678, false])(
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
        'https://full-domain.net',
        undefined,
        'abcde',
        'test domain.com',
        'jons.cool.site.',
        'a-very-really-long-domain-name-that-is-longer-than-63-characters.com',
        'website.a-very-really-long-top-level-domain-name-that-is-longer-than-63-characters',
        '-startingdash.com',
        'trailingdash-.com',
        '---.com',
        ' ',
        100,
        '%percent.com',
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

      it.each(['false', 0])(
        'should not modify gateway settings with invalid allowDelegatedStaking',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            allowDelegatedStaking: badProperties,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([-1, 1.5, 101, '50'])(
        'should not modify gateway settings with invalid delegateRewardShareRatio',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            delegateRewardShareRatio: badProperties,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([
        1,
        'string',
        'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
        ['%KryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA'],
        [
          'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
          'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
        ],
        [
          'iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
          '%KryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA',
        ],
        ['iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA', 1],
      ])(
        'should not modify gateway settings with invalid allowedDelegates',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            allowedDelegates: badProperties,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it.each([MIN_DELEGATED_STAKE - 1, '1000', MIN_DELEGATED_STAKE + 0.1])(
        'should not modify gateway settings with invalid minDelegatedStake',
        async (badProperties) => {
          const { cachedValue: prevCachedValue } = await contract.readState();
          const writeInteraction = await contract.writeInteraction({
            function: 'updateGatewaySettings',
            minDelegatedStake: badProperties,
          });
          expect(writeInteraction?.originalTxId).not.toBe(undefined);
          const { cachedValue: newCachedValue } = await contract.readState();
          expect(newCachedValue.state).toEqual(prevCachedValue.state);
        },
      );

      it('should not modify gateway settings with invalid parameters', async () => {
        const { cachedValue: prevCachedValue } = await contract.readState();
        const status = 'leavingNetwork';
        const writeInteraction = await contract.writeInteraction({
          function: 'updateGatewaySettings',
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
        const { cachedValue: prevCachedValue } = await contract.readState();
        const prevState = prevCachedValue.state as IOState;
        const prevOperatorStake =
          prevState.gateways[newGatewayOperatorAddress].operatorStake;
        await mineBlocks(arweave, CONTRACT_SETTINGS.minGatewayJoinLength);
        const writeInteraction = await contract.writeInteraction({
          function: 'leaveNetwork',
        });

        expect(writeInteraction?.originalTxId).not.toBe(undefined);
        const { cachedValue: newCachedValue } = await contract.readState();
        const newState = newCachedValue.state as IOState;
        newState.gateways[newGatewayOperatorAddress].vaults;
        const expectedEndBlock =
          (await getCurrentBlock(arweave)).valueOf() +
          GATEWAY_LEAVE_BLOCK_LENGTH;
        expect(Object.keys(newCachedValue.errorMessages)).not.toContain(
          writeInteraction.originalTxId,
        );
        expect(newState.gateways[newGatewayOperatorAddress].status).toEqual(
          NETWORK_LEAVING_STATUS,
        );
        expect(newState.gateways[newGatewayOperatorAddress].end).toEqual(
          expectedEndBlock,
        );
        // confirm the vault with the operator balance was created
        expect(
          newState.gateways[newGatewayOperatorAddress].vaults[
            writeInteraction.originalTxId
          ],
        ).toEqual({
          balance: prevOperatorStake,
          start: expect.any(Number),
          end: expectedEndBlock,
        });
      });
    });
  });

  describe('non-valid gateway operator', () => {
    beforeAll(async () => {
      owner = getLocalWallet(0);
      ownerAddress = await arweave.wallets.getAddress(owner);
      nonGatewayOperator = getLocalWallet(16);
      contract = warp
        .contract<IOState>(srcContractId)
        .connect(nonGatewayOperator);
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
          vaults: expect.any(Object),
          settings: expect.any(Object),
          weights: expect.any(Object),
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
          'No gateway found with wallet address non-existent-gateway.',
        );
      });

      it('should return the observer weights if the caller is valid gateway', async () => {
        const { result }: { result: WeightedObserver } =
          await contract.viewState({
            function: 'gateway',
            target: ownerAddress,
          });
        expect(result).toEqual(
          expect.objectContaining({
            // other gateway information here
            weights: {
              stakeWeight: expect.any(Number),
              tenureWeight: expect.any(Number),
              gatewayRewardRatioWeight: expect.any(Number),
              observerRewardRatioWeight: expect.any(Number),
              compositeWeight: expect.any(Number),
              normalizedCompositeWeight: expect.any(Number),
            },
          }),
        );
      });

      it('should return an error if the gateway is not in the registry', async () => {
        const notJoinedGateway = await createLocalWallet(arweave);
        const error = await contract.viewState({
          function: 'gateway',
          target: notJoinedGateway.address,
        });
        expect(error.type).toEqual('error');
        expect(error.errorMessage).toEqual(
          expect.stringContaining(
            `No gateway found with wallet address ${notJoinedGateway.address}.`,
          ),
        );
      });

      it('should be able to fetch gateway address registry with weights via view state', async () => {
        const { cachedValue } = await contract.readState();
        const fullState = cachedValue.state as IOState;
        const {
          result: gateways,
        }: {
          result: Record<WalletAddress, Gateway & { weights: ObserverWeights }>;
        } = await contract.viewState({
          function: 'gateways',
        });
        expect(gateways).not.toBe(undefined);
        for (const address of Object.keys(gateways)) {
          expect(gateways[address]).toEqual({
            ...fullState.gateways[address],
            stats: {
              passedEpochCount: 0,
              failedConsecutiveEpochs: 0,
              submittedEpochCount: 0,
              totalEpochsPrescribedCount: 0,
              totalEpochParticipationCount: 0,
            },
            weights: expect.objectContaining({
              stakeWeight: expect.any(Number),
              tenureWeight: expect.any(Number),
              gatewayRewardRatioWeight: expect.any(Number),
              observerRewardRatioWeight: expect.any(Number),
              compositeWeight: expect.any(Number),
              normalizedCompositeWeight: expect.any(Number),
            }),
          });
        }
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
          fqdn: 'test.com',
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
