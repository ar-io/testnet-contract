import { Gateway } from '@ar.io/sdk';
import { QuestionCollection } from 'inquirer';

import { isArweaveAddress } from '../utilities';

export default {
  gatewaySettings: (
    address?: string,
    gateway?: Gateway,
  ): QuestionCollection => {
    const questionList: QuestionCollection = [
      {
        name: 'label',
        type: 'input',
        message: 'Enter your a friendly name for your gateway > ',
        default: gateway ? gateway.settings.label : '',
        validate: (value: string) =>
          value.length > 0 ? true : 'Please Enter Valid Name',
      },
      {
        name: 'fqdn',
        type: 'input',
        message: 'Enter your domain for this gateway > ',
        default: gateway ? gateway.settings.fqdn : '',
        validate: (value: string) => {
          const regexDomainValidation: RegExp = new RegExp(
            '^(?!-)[A-Za-z0-9-]+([\\-\\.]{1}[a-z0-9]+)*\\.[A-Za-z]{2,6}$',
          );
          return regexDomainValidation.test(value)
            ? true
            : 'Please Enter Valid Domain';
        },
      },
      !gateway
        ? {
            name: 'qty',
            type: 'number',
            message:
              'Enter the amount of tokens you want to stake against your gateway - min 10,000 IO > ',
            default: 10000,
            validate: (value: number) =>
              value >= 10000 ? true : 'Please Enter Valid Amount',
          }
        : undefined,
      {
        name: 'port',
        type: 'number',
        message: 'Enter port used for this gateway > ',
        default: gateway ? gateway.settings.port : 443,
        validate: (value: number) => {
          return value >= 0 && value <= 65535
            ? true
            : 'Please Enter Valid Port Number';
        },
      },
      {
        name: 'protocol',
        type: 'list',
        message: 'Enter protocol used for this gateway > ',
        default: gateway ? gateway.settings.protocol : 'https',
        choices: ['https'],
      },
      {
        name: 'properties',
        type: 'input',
        message:
          'Enter gateway properties transaction ID (use default if not sure) > ',
        default: gateway
          ? gateway.settings.properties
          : 'FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44',
        validate: (value: string) =>
          isArweaveAddress(value) ? true : 'Please Enter Valid Address',
      },
      {
        name: 'note',
        type: 'input',
        message: 'Enter short note to further describe this gateway > ',
        default: gateway
          ? gateway.settings.note
          : `Owned and operated by ${address}`,
      },
      {
        name: 'observerWallet',
        type: 'input',
        default: gateway ? gateway.observerWallet : address,
        message: 'Enter the observer wallet public address > ',
      },
      {
        name: 'autoStake',
        type: 'confirm',
        default: gateway ? gateway.settings.autoStake : true,
        message: 'Enable or disable auto staking? > ',
      },
      {
        name: 'allowDelegatedStaking',
        type: 'confirm',
        default: gateway ? gateway.settings.allowDelegatedStaking : true,
        message: 'Enable or disable delegated staking? > ',
      },
      {
        name: 'delegateRewardShareRatio',
        type: 'number',
        message:
          'Enter the percent of gateway and observer rewards given to delegates > ',
        default: gateway ? gateway.settings.delegateRewardShareRatio : 10,
        validate: (value: number) =>
          value >= 0 && value <= 100 ? true : 'Please Enter Valid Percentage',
      },
      {
        name: 'minDelegatedStake',
        type: 'number',
        message: 'Enter the minimum delegate stake for this gateway (in IO) > ',
        default: gateway ? gateway.settings.minDelegatedStake / 1_000_000 : 100,
        validate: (value: number) =>
          value > 0 ? true : 'Please Enter Valid Amount',
      },
    ].filter((question) => !!question);
    return questionList;
  },
  getBalance: (address?: string): QuestionCollection => {
    const questionList: QuestionCollection = [
      {
        name: 'address',
        type: 'input',
        message: 'Enter the address you want to check the balance > ',
        default: address ? address : '',
        validate: (value: string) =>
          isArweaveAddress(value) ? true : 'Please Enter Valid Address',
      },
    ];
    return questionList;
  },
  increaseOperatorStake: (balance?: number): QuestionCollection => {
    const questionList: QuestionCollection = [
      {
        name: 'qty',
        type: 'number',
        message: `Enter the additional operator stake amount in IO (current balance: ${
          balance || 0
        } IO) > `,
        default: 100,
        validate: (value: number) =>
          value > 0 && (balance ? value <= balance : true)
            ? true
            : 'Please Enter Valid Amount',
      },
    ];
    return questionList;
  },
  delegateStake: (balance?: number): QuestionCollection => {
    const questionList: QuestionCollection = [
      {
        name: 'target',
        type: 'input',
        message: 'Enter the target gateway address you want to delegate to > ',
        validate: (value: string) =>
          isArweaveAddress(value) ? true : 'Please Enter Valid Address',
      },
      {
        name: 'qty',
        type: 'number',
        message: `Enter stake quantity (current balance: ${balance || 0})  > `,
        default: 100,
        validate: (value: number) =>
          value > 0 && (balance ? value <= balance : true)
            ? true
            : 'Please Enter Valid Amount',
      },
    ];
    return questionList;
  },
};
