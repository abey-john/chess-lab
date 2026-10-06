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
          <span className="graph-title">Evaluation</span>
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
  const paddingLeft = 76;
  const paddingRight = 32;
  const paddingY = 28;

  const maxPly = Math.max(1, points[points.length - 1].ply);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - 2 * paddingY;

  // Score scale: +10 (top) down to -10 (bottom), with 0 exactly centered
  const MAX_SCORE = 10;
  const MIN_SCORE = -10;

  const getX = (ply: number) => paddingLeft + (ply / maxPly) * chartWidth;
  const getY = (score: number) => {
    const clamped = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
    const fraction = (MAX_SCORE - clamped) / (MAX_SCORE - MIN_SCORE);
    return paddingY + fraction * chartHeight;
  };

  const y10 = getY(10);
  const y5 = getY(5);
  const y0 = getY(0);
  const ym5 = getY(-5);
  const ym10 = getY(-10);

  // Build SVG polyline path based on White's evaluation score
  const pathD = points
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(pt.ply).toFixed(1)} ${getY(pt.score).toFixed(1)}`
    )
    .join(' ');

  const xFirst = getX(points[0].ply);
  const xLast = getX(points[points.length - 1].ply);

  // Area path closed against the zero reference line (y0)
  const zeroAreaD = `${pathD} L ${xLast.toFixed(1)} ${y0.toFixed(1)} L ${xFirst.toFixed(1)} ${y0.toFixed(1)} Z`;

  const selectedPoint = points.find((p) => p.ply === currentPly);

  const hasSlips = points.some((p) => p.slip !== undefined);

  const getReadoutText = (pt: ReviewGraphPoint) => {
    const movePrefix = pt.ply === 0 ? 'Start Position' : `Ply ${pt.ply}${pt.san ? ` (${pt.san})` : ''}`;
    const slipExtra = pt.slip ? ` · Bot Slip (${pt.slip.requestedSeverity})` : '';

    if (pt.scoreDisplay === '#' || pt.scoreDisplay.startsWith('+M')) {
      return `${movePrefix}: White ${pt.scoreDisplay}${slipExtra}`;
    }
    if (pt.scoreDisplay === '-#' || pt.scoreDisplay.startsWith('-M')) {
      return `${movePrefix}: Black ${pt.scoreDisplay}${slipExtra}`;
    }
    if (pt.score > 0) {
      return `${movePrefix}: White ${pt.scoreDisplay}${slipExtra}`;
    }
    if (pt.score < 0) {
      return `${movePrefix}: Black ${pt.scoreDisplay}${slipExtra}`;
    }
    return `${movePrefix}: Equal 0.0${slipExtra}`;
  };

  return (
    <div className="eval-graph-container">
      <div className="eval-graph-header">
        <div className="graph-header-left">
          <span className="graph-title">Evaluation</span>
          {selectedPoint && (
            <span className="graph-active-readout">
              {getReadoutText(selectedPoint)}
            </span>
          )}
        </div>
        <div className="graph-legend">
          {hasSlips && (
            <span className="legend-item">
              <span className="legend-dot slip" /> Bot Slip
            </span>
          )}
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
            {/* White advantage area clip (above center zero line) */}
            <clipPath id="aboveZero">
              <rect x={0} y={0} width={width} height={y0} />
            </clipPath>

            {/* Black advantage area clip (below center zero line) */}
            <clipPath id="belowZero">
              <rect x={0} y={y0} width={width} height={height - y0} />
            </clipPath>

            <linearGradient id="whiteAdvantageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(241, 245, 249, 0.4)" />
              <stop offset="100%" stopColor="rgba(241, 245, 249, 0.05)" />
            </linearGradient>

            <linearGradient id="blackAdvantageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.05)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.35)" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={paddingLeft}
            y1={y10}
            x2={width - paddingRight}
            y2={y10}
            className="grid-line"
            strokeDasharray="4"
          />
          <line
            x1={paddingLeft}
            y1={y5}
            x2={width - paddingRight}
            y2={y5}
            className="grid-line faint"
            strokeDasharray="2 4"
          />
          <line
            x1={paddingLeft}
            y1={y0}
            x2={width - paddingRight}
            y2={y0}
            className="grid-line mid-line"
          />
          <line
            x1={paddingLeft}
            y1={ym5}
            x2={width - paddingRight}
            y2={ym5}
            className="grid-line faint"
            strokeDasharray="2 4"
          />
          <line
            x1={paddingLeft}
            y1={ym10}
            x2={width - paddingRight}
            y2={ym10}
            className="grid-line"
            strokeDasharray="4"
          />

          {/* Y Axis score labels (+ White / - Black / 0 Even) */}
          <text x={8} y={y10 + 4} className="axis-label font-bold">
            +10 White
          </text>
          <text x={8} y={y5 + 4} className="axis-label">
            +5
          </text>
          <text x={8} y={y0 + 4} className="axis-label font-bold mid">
            0.0 Even
          </text>
          <text x={8} y={ym5 + 4} className="axis-label">
            -5
          </text>
          <text x={8} y={ym10 + 4} className="axis-label font-bold">
            -10 Black
          </text>

          {/* Area fills relative to center zero line */}
          <path d={zeroAreaD} fill="url(#whiteAdvantageGrad)" clipPath="url(#aboveZero)" />
          <path d={zeroAreaD} fill="url(#blackAdvantageGrad)" clipPath="url(#belowZero)" />

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
            const cy = getY(pt.score);
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

                {pt.slip ? (
                  <polygon
                    points={`${cx},${cy - (isSelected ? 8.5 : 7)} ${cx + (isSelected ? 8.5 : 7)},${cy} ${cx},${cy + (isSelected ? 8.5 : 7)} ${cx - (isSelected ? 8.5 : 7)},${cy}`}
                    className="node-marker slip-marker"
                  />
                ) : hasSevereQuality ? (
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
