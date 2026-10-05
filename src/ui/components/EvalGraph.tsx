import type { ReviewGraphPoint } from '../../review/reviewModel';

interface EvalGraphProps {
  points: ReviewGraphPoint[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export function EvalGraph({ points, currentPly, onSelectPly }: EvalGraphProps) {
  if (points.length === 0) {
    return (
      <div className="eval-graph-container">
        <div className="eval-graph-header">
          <span className="graph-title">Evaluation & Win Probability</span>
        </div>
        <div className="eval-graph-loading-placeholder">
          <span className="spinner" />
          <span>Analyzing game positions with Stockfish... Graph will appear shortly.</span>
        </div>
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const paddingLeft = 72;
  const paddingRight = 32;
  const paddingY = 28;

  const maxPly = Math.max(1, points[points.length - 1].ply);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - 2 * paddingY;

  const getX = (ply: number) => paddingLeft + (ply / maxPly) * chartWidth;
  const getY = (winProb: number) =>
    paddingY + (1 - Math.max(0, Math.min(100, winProb)) / 100) * chartHeight;

  // Build SVG polyline path based on player's win probability
  const pathD = points
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(pt.ply).toFixed(1)} ${getY(pt.playerWinProb).toFixed(1)}`
    )
    .join(' ');

  // Gradient area path closed to bottom
  const areaD = `${pathD} L ${getX(points[points.length - 1].ply).toFixed(1)} ${height - paddingY} L ${getX(points[0].ply).toFixed(1)} ${height - paddingY} Z`;

  const y100 = getY(100);
  const y75 = getY(75);
  const y50 = getY(50);
  const y25 = getY(25);
  const y0 = getY(0);

  const selectedPoint = points.find((p) => p.ply === currentPly);

  return (
    <div className="eval-graph-container">
      <div className="eval-graph-header">
        <div className="graph-header-left">
          <span className="graph-title">Evaluation & Win Probability</span>
          {selectedPoint && (
            <span className="graph-active-readout">
              {selectedPoint.ply === 0
                ? 'Start Position: 50% (Equal)'
                : `Ply ${selectedPoint.ply}${selectedPoint.san ? ` (${selectedPoint.san})` : ''}: ${selectedPoint.playerWinProb.toFixed(0)}% Your Win Probability${selectedPoint.playerWinProb < 50 ? ` (${(100 - selectedPoint.playerWinProb).toFixed(0)}% Bot)` : ''}`}
            </span>
          )}
        </div>
        <div className="graph-legend">
          <span className="legend-item">
            <span className="legend-dot inaccuracy" /> Inaccuracy
          </span>
          <span className="legend-item">
            <span className="legend-dot mistake" /> Mistake
          </span>
          <span className="legend-item">
            <span className="legend-dot blunder" /> Blunder
          </span>
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
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.45)" />
              <stop offset="50%" stopColor="rgba(99, 102, 241, 0.1)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={paddingLeft}
            y1={y100}
            x2={width - paddingRight}
            y2={y100}
            className="grid-line"
            strokeDasharray="4"
          />
          <line
            x1={paddingLeft}
            y1={y75}
            x2={width - paddingRight}
            y2={y75}
            className="grid-line faint"
            strokeDasharray="2 4"
          />
          <line
            x1={paddingLeft}
            y1={y50}
            x2={width - paddingRight}
            y2={y50}
            className="grid-line mid-line"
          />
          <line
            x1={paddingLeft}
            y1={y25}
            x2={width - paddingRight}
            y2={y25}
            className="grid-line faint"
            strokeDasharray="2 4"
          />
          <line
            x1={paddingLeft}
            y1={y0}
            x2={width - paddingRight}
            y2={y0}
            className="grid-line"
            strokeDasharray="4"
          />

          {/* Y Axis percentage labels (Player Perspective) */}
          <text x={8} y={y100 + 4} className="axis-label font-bold">
            100% You
          </text>
          <text x={8} y={y75 + 4} className="axis-label">
            75%
          </text>
          <text x={8} y={y50 + 4} className="axis-label font-bold mid">
            50%
          </text>
          <text x={8} y={y25 + 4} className="axis-label">
            25%
          </text>
          <text x={8} y={y0 + 4} className="axis-label font-bold">
            0% Bot
          </text>

          {/* Area fill */}
          <path d={areaD} fill="url(#evalGrad)" opacity="0.65" />

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
            const cy = getY(pt.playerWinProb);
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
                <circle cx={cx} cy={cy} r={14} fill="transparent" />

                {isSelected && <circle cx={cx} cy={cy} r={9} className="node-active-ring" />}

                {hasSevereQuality ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6.5 : 5}
                    className={`node-marker ${pt.quality}`}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5.5 : 3}
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
