import type { ModeId } from '../../game/types';
import type { RedemptionReviewSummary, SlipReviewSummary } from '../../review/reviewModel';

interface ModeReviewExtrasProps {
  mode: ModeId;
  slipSummary?: SlipReviewSummary;
  redemptionSummary?: RedemptionReviewSummary;
  onSelectPly: (ply: number) => void;
  selectedPly?: number;
}

export function ModeReviewExtras({
  mode,
  slipSummary,
  redemptionSummary,
  onSelectPly,
  selectedPly,
}: ModeReviewExtrasProps) {
  if (mode === 'redemption' && redemptionSummary) {
    const {
      totalBlunders,
      solved,
      accepted,
      failed,
      timedOut,
      livesRemaining,
      startingLives,
      items,
    } = redemptionSummary;

    return (
      <section className="redemption-review-card">
        <div className="redemption-review-header">
          <div className="redemption-review-title-group">
            <h2 className="redemption-review-title">🔥 Redemption Mode Breakdown</h2>
            <p className="redemption-review-subtitle">
              Tactical puzzle QTEs triggered on player blunders and how you handled them.
            </p>
          </div>
        </div>

        <div className="redemption-stats-grid">
          <div className="redemption-stat-box total">
            <span className="stat-num">{totalBlunders}</span>
            <span className="stat-label">Total Blunders</span>
          </div>
          <div className="redemption-stat-box solved">
            <span className="stat-num">{solved}</span>
            <span className="stat-label">Puzzles Solved ✨</span>
            <span className="stat-desc">Blunder undone (0 lives lost)</span>
          </div>
          <div className="redemption-stat-box accepted">
            <span className="stat-num">{accepted}</span>
            <span className="stat-label">Accepted ⚡</span>
            <span className="stat-desc">Saved lives (0 lives lost)</span>
          </div>
          <div className="redemption-stat-box failed">
            <span className="stat-num">{failed + timedOut}</span>
            <span className="stat-label">Failed / Timeout ✖</span>
            <span className="stat-desc">1 life deducted each</span>
          </div>
          <div className="redemption-stat-box lives">
            <span className="stat-num">
              {livesRemaining === 'unlimited' ? '∞' : livesRemaining}
            </span>
            <span className="stat-label">Lives Remaining</span>
            <span className="stat-desc">
              {livesRemaining === 'unlimited' ? 'Unlimited mode' : `Started with ${startingLives}`}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="redemption-empty-state">
            No blunders were committed during this game! Clean play. 🎯
          </div>
        ) : (
          <div className="redemption-table-wrapper">
            <table className="redemption-table">
              <thead>
                <tr>
                  <th className="col-ply">Move</th>
                  <th className="col-elo">Puzzle ELO</th>
                  <th className="col-outcome">Outcome</th>
                  <th className="col-impact">Lives Impact</th>
                  <th className="col-time">Time</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedPly === item.blunderPly;
                  return (
                    <tr
                      key={item.blunderPly}
                      className={`redemption-table-row ${isSelected ? 'active-redemption-row' : ''}`}
                      onClick={() => onSelectPly(item.blunderPly)}
                    >
                      <td className="col-ply font-bold">
                        {item.moveNumber}. {item.san}
                      </td>
                      <td className="col-elo font-mono font-bold">
                        {item.puzzleRating}
                      </td>
                      <td className="col-outcome">
                        <span className={`verdict-pill ${item.outcome}`}>
                          {item.outcome === 'solved' && 'Solved ✨'}
                          {item.outcome === 'accepted' && 'Accepted ⚡'}
                          {item.outcome === 'failed' && 'Failed ✖'}
                          {item.outcome === 'timeout' && 'Timeout ⏱'}
                        </span>
                      </td>
                      <td className="col-impact">
                        {item.outcome === 'solved' || item.outcome === 'accepted' ? (
                          <span className="lives-impact zero">0 Lives</span>
                        ) : (
                          <span className="lives-impact lost">-1 Life</span>
                        )}
                      </td>
                      <td className="col-time font-mono">
                        {item.timeSpentMs !== undefined
                          ? `${(item.timeSpentMs / 1000).toFixed(1)}s`
                          : '—'}
                      </td>
                      <td className="col-action">
                        <button
                          type="button"
                          className="redemption-jump-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPly(item.blunderPly);
                          }}
                          title="Jump to position at blunder"
                        >
                          Inspect 🔍
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  if (mode !== 'slip' || !slipSummary) {
    return null;
  }

  const { totalSlips, capitalized, missed, squandered, items } = slipSummary;

  return (
    <section className="slip-review-card">
      <div className="slip-review-header">
        <div className="slip-review-title-group">
          <h2 className="slip-review-title">🎯 Slip Mode Analysis</h2>
          <p className="slip-review-subtitle">
            Deliberate MultiPV mistakes introduced by the bot and how you capitalized on them.
          </p>
        </div>
      </div>

      <div className="slip-stats-grid">
        <div className="slip-stat-box total">
          <span className="stat-num">{totalSlips}</span>
          <span className="stat-label">Deliberate Slips</span>
        </div>
        <div className="slip-stat-box capitalized">
          <span className="stat-num">{capitalized}</span>
          <span className="stat-label">Capitalized 🎯</span>
          <span className="stat-desc">Punished within tolerance</span>
        </div>
        <div className="slip-stat-box missed">
          <span className="stat-num">{missed}</span>
          <span className="stat-label">Missed ⚠</span>
          <span className="stat-desc">Maintained equality</span>
        </div>
        <div className="slip-stat-box squandered">
          <span className="stat-num">{squandered}</span>
          <span className="stat-label">Squandered ✖</span>
          <span className="stat-desc">Worsened position</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="slip-empty-state">
          No deliberate slips were triggered during this game (game ended before opening grace period or positions were forced).
        </div>
      ) : (
        <div className="slip-table-wrapper">
          <table className="slip-table">
            <thead>
              <tr>
                <th className="col-ply">Move</th>
                <th className="col-req">Requested</th>
                <th className="col-drop">Measured Drop</th>
                <th className="col-fallback">Fallback</th>
                <th className="col-reply">Your Reply</th>
                <th className="col-verdict">Verdict</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = selectedPly === item.ply || selectedPly === item.ply - 1;
                return (
                  <tr
                    key={item.ply}
                    className={`slip-table-row ${isSelected ? 'active-slip-row' : ''}`}
                    onClick={() => onSelectPly(item.ply - 1)}
                  >
                    <td className="col-ply font-bold">
                      {item.moveNumber}.{item.color === 'black' ? '..' : ''} {item.san}
                    </td>
                    <td className="col-req capitalize">
                      <span className={`pill ${item.tag.requestedSeverity}`}>
                        {item.tag.requestedSeverity}
                      </span>
                    </td>
                    <td className="col-drop">
                      <span className="drop-value">-{item.tag.measuredDrop}%</span>
                      <span className="drop-actual capitalize">({item.tag.measuredSeverity})</span>
                    </td>
                    <td className="col-fallback">
                      {item.tag.fallbackUsed === 'none' && <span className="fallback-tag none">Direct</span>}
                      {item.tag.fallbackUsed === 'widened' && (
                        <span className="fallback-tag widened" title="Search band widened by 3 win% points">
                          Widened (±3%)
                        </span>
                      )}
                      {item.tag.fallbackUsed === 'smaller' && (
                        <span className="fallback-tag smaller" title="Fell back to smaller error to avoid over-blundering">
                          Smaller error
                        </span>
                      )}
                    </td>
                    <td className="col-reply font-mono font-bold">
                      {item.playerReply ? item.playerReply.san : <span className="text-muted">—</span>}
                    </td>
                    <td className="col-verdict">
                      <span className={`verdict-pill ${item.verdict}`}>
                        {item.verdict === 'capitalized' && 'Capitalized 🎯'}
                        {item.verdict === 'missed' && 'Missed ⚠'}
                        {item.verdict === 'squandered' && 'Squandered ✖'}
                        {item.verdict === 'n/a' && 'N/A'}
                      </span>
                    </td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="slip-jump-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPly(item.ply - 1);
                        }}
                        title="Jump to position before slip"
                      >
                        Inspect 🔍
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
