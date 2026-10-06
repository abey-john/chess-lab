import type { ModeId } from '../../game/types';
import type { SlipReviewSummary } from '../../review/reviewModel';

interface ModeReviewExtrasProps {
  mode: ModeId;
  slipSummary?: SlipReviewSummary;
  onSelectPly: (ply: number) => void;
  selectedPly?: number;
}

export function ModeReviewExtras({
  mode,
  slipSummary,
  onSelectPly,
  selectedPly,
}: ModeReviewExtrasProps) {
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
