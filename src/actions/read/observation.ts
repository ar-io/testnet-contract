import {
  DEFAULT_EPOCH_BLOCK_LENGTH,
  DEFAULT_START_HEIGHT,
} from '../../constants';

declare const ContractError;

export function getEpochEnd(height: number): number {
  return (
    DEFAULT_START_HEIGHT +
    DEFAULT_EPOCH_BLOCK_LENGTH *
      (Math.floor(
        (height - DEFAULT_START_HEIGHT) / DEFAULT_EPOCH_BLOCK_LENGTH,
      ) +
        1) -
    1
  );
}

export function getEpochStart(height: number): number {
  return getEpochEnd(height) + 1 - DEFAULT_EPOCH_BLOCK_LENGTH;
}
