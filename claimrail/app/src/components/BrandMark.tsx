type Props = { className?: string; dark?: boolean };

export default function BrandMark({ className = "w-10 h-10", dark = false }: Props) {
  const ink  = dark ? "#ffffff" : "#000000";
  const fill = "#2D5BFF";
  const bg   = dark ? "#000000" : "#f1f1f1";
  return (
    <svg viewBox="0 0 160 160" className={className} aria-label="Claimrail mark" fill="none">
      {/* outer border */}
      <rect x="2" y="2" width="156" height="156" stroke={ink} strokeWidth="4" fill="none"/>
      {/* vertical divider */}
      <line x1="80" y1="2" x2="80" y2="158" stroke={ink} strokeWidth="4"/>
      {/* horizontal divider */}
      <line x1="2" y1="80" x2="158" y2="80" stroke={ink} strokeWidth="4"/>
      {/* top-right cell — blue fill */}
      <rect x="80" y="2" width="78" height="78" fill={fill}/>
      {/* bottom-left cell — applicant dot */}
      <circle cx="40" cy="120" r="11" fill={ink}/>
    </svg>
  );
}
