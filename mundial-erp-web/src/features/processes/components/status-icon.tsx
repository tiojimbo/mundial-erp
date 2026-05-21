'use client';

type StatusType = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

export function StatusIcon({
  type,
  color,
  size = 12,
}: {
  type: StatusType;
  color: string;
  size?: number;
}) {
  const half = size / 2;
  const r = half - 1;

  if (type === 'NOT_STARTED') {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill='none'
        className='shrink-0'
      >
        <circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray='2.5 2'
          fill='none'
        />
      </svg>
    );
  }

  if (type === 'ACTIVE') {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill='none'
        className='shrink-0'
      >
        <circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={1.5}
          fill='none'
        />
        <path
          d={`M ${half} ${half - r} A ${r} ${r} 0 0 1 ${half} ${half + r}`}
          fill={color}
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill='none'
      className='shrink-0'
    >
      <circle cx={half} cy={half} r={r} fill={color} />
      <path
        d={`M ${size * 0.3} ${half} L ${size * 0.45} ${size * 0.62} L ${size * 0.72} ${size * 0.35}`}
        stroke='white'
        strokeWidth={1.5}
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
    </svg>
  );
}
