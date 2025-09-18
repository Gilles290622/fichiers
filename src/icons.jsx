// Minimal set of inline SVG icons with universal look
export const Icon = ({ children, size = 16, title, className }) => (
  <span className={className} role={title ? 'img' : undefined} aria-label={title} style={{ display: 'inline-flex', width: size, height: size }}>
    {children}
  </span>
);

export const EmailIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/>
    </svg>
  </Icon>
);

export const WhatsAppIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M20 3.5A10 10 0 0 0 4 17.7L3 21l3.4-1A10 10 0 1 0 20 3.5ZM7 17l-.4.2-.5.1.2-.5.2-.4a7.8 7.8 0 1 1 2.9 2L9 18a6.1 6.1 0 0 0 8.2-4.3c.1-.3-.1-.6-.4-.7l-2.1-.7c-.3-.1-.5 0-.7.2l-1 .9a.6.6 0 0 1-.7.1c-1.3-.7-2.3-1.7-3-3a.6.6 0 0 1 .1-.7l.8-1c.2-.2.3-.5.2-.8l-.7-2.1a.6.6 0 0 0-.7-.4A6.1 6.1 0 0 0 7 9c-.1.2 0 .5.2.6l.9.9c.1.1.1.3 0 .5-.4 1.1-.3 2.4.2 3.5.1.2.3.3.5.2l.5-.2c.2-.1.4 0 .5.2.4.7 1 1.4 1.6 1.9.2.2.2.4 0 .6-.5.5-1 .9-1.6 1.1-.2.1-.4 0-.5-.2L7 17Z"/>
    </svg>
  </Icon>
);

export const PdfIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
      <text x="8" y="17" fontSize="6" fill="currentColor" fontFamily="Arial, sans-serif">PDF</text>
    </svg>
  </Icon>
);

export const WordIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
      <text x="7" y="17" fontSize="6" fill="currentColor" fontFamily="Arial, sans-serif">W</text>
    </svg>
  </Icon>
);

export const ExcelIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
      <text x="7" y="17" fontSize="6" fill="currentColor" fontFamily="Arial, sans-serif">X</text>
    </svg>
  </Icon>
);

export const PsdIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
      <text x="6.5" y="17" fontSize="6" fill="currentColor" fontFamily="Arial, sans-serif">PSD</text>
    </svg>
  </Icon>
);

export const ImageIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M21 5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5Z"/>
    </svg>
  </Icon>
);

export const VideoIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M17 10V7a2 2 0 0 0-2-2H5C3.9 5 3 5.9 3 7v8c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-3l4 3V7l-4 3Z"/>
    </svg>
  </Icon>
);

export const AudioIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M12 3v12.6a3.5 3.5 0 1 1-2-3.2V6h8V3h-6Z"/>
    </svg>
  </Icon>
);

export const ArchiveIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm1-4h16l2 3H2l2-3Zm5 7h6v2H9v-2Z"/>
    </svg>
  </Icon>
);

export const TextIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M4 4h16v3H14v11h-4V7H4V4Z"/>
    </svg>
  </Icon>
);

export const DefaultFileIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm8 1.5V8h4.5L14 3.5Z"/>
    </svg>
  </Icon>
);

export const DownloadIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1Z"/>
      <path d="M5 18a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5v-2Z"/>
    </svg>
  </Icon>
);

export const UploadIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M12 21a1 1 0 0 1-1-1v-8.59l-2.3 2.3a1 1 0 0 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 1 1-1.4 1.42L13 11.41V20a1 1 0 0 1-1 1Z"/>
      <path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5V6Z"/>
    </svg>
  </Icon>
);

export const InfoIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM10.75 10.5h2.5c.41 0 .75.34.75.75v6c0 .41-.34.75-.75.75h-2.5a.75.75 0 0 1-.75-.75v-6c0-.41.34-.75.75-.75Z"/>
    </svg>
  </Icon>
);

export const DashboardIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h5v8H3v-8Zm7 0h11v8H10v-8Z"/>
    </svg>
  </Icon>
);

export const FolderIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M10 4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6Z"/>
    </svg>
  </Icon>
);

export const SettingsGearIcon = (props) => (
  <Icon {...props}>
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.94L14.4 2.4a.5.5 0 0 0-.49-.4h-3.82a.5.5 0 0 0-.49.4l-.37 2.42c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.68 8.24a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.37 2.42c.04.24.25.4.49.4h3.82c.24 0 .45-.16.49-.4l.37-2.42c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"/>
    </svg>
  </Icon>
);
