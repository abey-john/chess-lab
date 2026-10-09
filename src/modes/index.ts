import type { BotStrategy, ModeId } from '../game/types';
import { redemptionStrategy } from './redemption/strategy';
import { slipStrategy } from './slip/strategy';
import { standardStrategy } from './standard/strategy';

export interface ModeDefinition {
  id: ModeId;
  name: string;
  // oxlint-disable-next-line no-explicit-any
  strategy: BotStrategy<any>;
}

export const MODES: Record<ModeId, ModeDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    strategy: standardStrategy,
  },
  slip: {
    id: 'slip',
    name: 'Slip Mode',
    strategy: slipStrategy,
  },
  redemption: {
    id: 'redemption',
    name: 'Redemption',
    strategy: redemptionStrategy,
  },
};

export function getModeDefinition(modeId: ModeId): ModeDefinition {
  const mode = MODES[modeId];
  if (!mode) {
    throw new Error(`Unsupported mode: ${modeId}`);
  }
  return mode;
}

export { redemptionStrategy, slipStrategy, standardStrategy };
