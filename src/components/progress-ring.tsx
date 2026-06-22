interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  color = "var(--primary)",
  label,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = c * (1 - clamped);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(clamped * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label ? (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fontWeight={700} fill="var(--foreground)">
          {label}
        </text>
      ) : null}
    </svg>
  );
}
