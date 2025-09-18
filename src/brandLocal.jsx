// Local simple brand-like icons (stylized, not official logo paths)
// Colors: Word #2B579A, Excel #217346, PowerPoint #D24726, WinRAR #7D3F98/#2B579A/#217346 accents

const DocBase = ({ color = '#999', letter = 'W', size = 16, title }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={title}>
    <title>{title}</title>
    <path fill="#ffffff" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Z"/>
    <path fill="#e6e6e6" d="M14 2v6h6Z"/>
    <rect x="7" y="10" width="10" height="7" rx="2" fill={color}/>
    <text x="12" y="15.5" textAnchor="middle" fontSize="6" fill="#fff" fontFamily="Segoe UI, Roboto, Arial">{letter}</text>
  </svg>
);

export const WordLocalIcon = (props) => <DocBase color="#2B579A" letter="W" title="Word" {...props} />;
export const ExcelLocalIcon = (props) => <DocBase color="#217346" letter="X" title="Excel" {...props} />;
export const PowerPointLocalIcon = (props) => <DocBase color="#D24726" letter="P" title="PowerPoint" {...props} />;

export const WinRARLocalIcon = ({ size = 16, title = 'WinRAR' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={title}>
    <title>{title}</title>
    <rect x="5" y="5" width="14" height="4" rx="1" fill="#7D3F98"/>
    <rect x="5" y="10" width="14" height="4" rx="1" fill="#2B579A"/>
    <rect x="5" y="15" width="14" height="4" rx="1" fill="#217346"/>
    <rect x="11" y="5" width="2" height="14" fill="#ffffff" opacity="0.5"/>
  </svg>
);
