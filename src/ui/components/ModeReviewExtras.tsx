import type { ModeId } from '../../game/types';

interface ModeReviewExtrasProps {
  mode: ModeId;
}

/**
 * Extension slot for mode-specific review extras (Section B7).
 * Renders nothing for 'standard' mode in v1.
 * Reserved for slip mode review metadata in v2.
 */
export function ModeReviewExtras({ mode }: ModeReviewExtrasProps) {
  if (mode === 'standard') {
    return null;
  }

  return null;
}
