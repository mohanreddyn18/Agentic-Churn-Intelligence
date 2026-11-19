import { motion } from 'framer-motion';
import type { RiskLevel } from '../types';
import { AnimatedNumber } from './AnimatedNumber';

interface RadialRiskGaugeProps {
  probability: number; // 0 to 1
  riskLevel: RiskLevel;
  confidenceLow?: number;
  confidenceHigh?: number;
  size?: number;
  label?: string;
}

export function RadialRiskGauge({
  probability,
  riskLevel,
  confidenceLow,
  confidenceHigh,
  size = 188,
  label = 'Ensemble Risk',
}: RadialRiskGaugeProps) {
  const pct = Math.max(0, Math.min(100, probability * 100));
  const strokeWidth = 11;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270-degree precision dial
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * (pct / 100);

  const colorMap: Record<RiskLevel, { stroke: string; text: string; labelText: string }> = {
    High: { stroke: '#EF4444', text: 'text-red-400', labelText: 'Critical Risk' },
    Medium: { stroke: '#F59E0B', text: 'text-amber-400', labelText: 'Elevated Risk' },
    Low: { stroke: '#10B981', text: 'text-emerald-400', labelText: 'Nominal Risk' },
  };

  const theme = colorMap[riskLevel];

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label={`${label}: ${pct.toFixed(1)}%`}
      >
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          {/* Background dial track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Subtle tick marks along inner arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 13}
            fill="none"
            stroke="#334155"
            strokeWidth={1.5}
            strokeDasharray="2 12"
            opacity={0.6}
          />

          {/* Animated value arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filledLength} ${circumference}` }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          />
        </g>
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <div className={`text-3xl font-semibold tracking-tight ${theme.text}`}>
          <AnimatedNumber value={pct} decimals={1} suffix="%" />
        </div>
        <span className="mt-0.5 text-xs font-medium text-slate-300">{theme.labelText}</span>
        {confidenceLow !== undefined && confidenceHigh !== undefined && (
          <span className="mt-1 text-[11px] font-mono-num text-slate-500">
            CI {(confidenceLow * 100).toFixed(0)}–{(confidenceHigh * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
