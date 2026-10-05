import type { ReviewGraphPoint } from '../../review/reviewModel';

interface EvalGraphProps {
  points: ReviewGraphPoint[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export function EvalGraph({ points, currentPly, onSelectPly }: EvalGraphProps) {
  if (points.length === 0) {
    return null;
  }

  const width = 600;
  const height = 180;
  const paddingX = 30;
  const paddingY = 24;

  const maxPly = Math.max(1, points[points.length - 1].ply);
  const chartWidth = width - 2 * paddingX;
  const chartHeight = height - 2 * paddingY;

  const getX = (ply: number) => paddingX + (ply / maxPly) * chartWidth;
  const getY = (winProb: number) => paddingY + (1 - Math.max(0, Math.min(100, winProb)) / 100) * chartHeight;

  // Build SVG path
  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.ply).toFixed(1)} ${getY(pt.whiteWinProb).toFixed(1)}`)
    .join(' ');

  // Gradient area path closed to bottom
  const areaD = `${pathD} L ${getX(points[points.length - 1].ply).toFixed(1)} ${height - paddingY} L ${getX(points[0].ply).toFixed(1)} ${height - paddingY} Z`;

  const midY = getY(50);

  return (
    <div className="eval-graph-container">
      <div className="eval-graph-header">
        <span className="graph-title">Evaluation & Win Probability</span>
        <div className="graph-legend">
          <span className="legend-item"><span className="legend-dot inaccuracy" /> Inaccuracy</span>
          <span className="legend-item"><span className="legend-dot mistake" /> Mistake</span>
          <span className="legend-item"><span className="legend-dot blunder" /> Blunder</span>
        </div>
      </div>

      <div className="eval-graph-svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="eval-graph-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="evalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.4)" />
              <stop offset="50%" stopColor="rgba(99, 102, 241, 0.1)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            className="grid-line"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={midY}
            x2={width - paddingX}
            y2={midY}
            className="grid-line mid-line"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            className="grid-line"
            strokeDasharray="4"
          />

          {/* Y Axis percentage labels */}
          <text x={8} y={paddingY + 4} className="axis-label">100%</text>
          <text x={8} y={midY + 4} className="axis-label">50%</text>
          <text x={8} y={height - paddingY + 4} className="axis-label">0%</text>

          {/* Area fill */}
          <path d={areaD} fill="url(#evalGrad)" opacity="0.6" />

          {/* Eval line */}
          <path d={pathD} className="eval-line" fill="none" />

          {/* Active ply vertical cursor */}
          {points.some((p) => p.ply === currentPly) && (
            <line
              x1={getX(currentPly)}
              y1={paddingY}
              x2={getX(currentPly)}
              y2={height - paddingY}
              className="active-ply-line"
            />
          )}

          {/* Markers on notable moves & clickable nodes */}
          {points.map((pt) => {
            const cx = getX(pt.ply);
            const cy = getY(pt.whiteWinProb);
            const isSelected = pt.ply === currentPly;
            const hasSevereQuality =
              pt.quality === 'inaccuracy' || pt.quality === 'mistake' || pt.quality === 'blunder';

            return (
              <g
                key={pt.ply}
                className={`graph-node ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectPly(pt.ply)}
                style={{ cursor: 'pointer' }}
              >
                {/* Touch/click target area */}
                <circle cx={cx} cy={cy} r={12} fill="transparent" />

                {isSelected && (
                  <circle cx={cx} cy={cy} r={8} className="node-active-ring" />
                )}

                {hasSevereQuality ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4.5}
                    className={`node-marker ${pt.quality}`}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5 : 2.5}
                    className="node-marker normal"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
