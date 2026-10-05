import type { Color } from '../../game/types';

interface PromotionDialogProps {
  color: Color;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; label: string; symbol: string }> = [
    { type: 'q', label: 'Queen', symbol: color === 'white' ? '♕' : '♛' },
    { type: 'r', label: 'Rook', symbol: color === 'white' ? '♖' : '♜' },
    { type: 'b', label: 'Bishop', symbol: color === 'white' ? '♗' : '♝' },
    { type: 'n', label: 'Knight', symbol: color === 'white' ? '♘' : '♞' },
  ];

  return (
    <div className="promotion-overlay" onClick={onCancel}>
      <div className="promotion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="promotion-title">Promote Pawn</div>
        <div className="promotion-options">
          {pieces.map((p) => (
            <button
              key={p.type}
              className="promotion-btn"
              onClick={() => onSelect(p.type)}
              title={p.label}
              aria-label={p.label}
            >
              <span className="promotion-symbol">{p.symbol}</span>
              <span className="promotion-name">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
