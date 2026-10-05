import type { BotStrategy, ModeId } from '../game/types';
import { standardStrategy } from './standard/strategy';

export interface ModeDefinition {
  id: ModeId;
  name: string;
  strategy: BotStrategy;
}

export const MODES: Record<ModeId, ModeDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    strategy: standardStrategy,
  },
};

export function getModeDefinition(modeId: ModeId): ModeDefinition {
  const mode = MODES[modeId];
  if (!mode) {
    throw new Error(`Unsupported mode: ${modeId}`);
  }
  return mode;
}
