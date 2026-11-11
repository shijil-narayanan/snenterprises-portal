// Small inline SVG icons (stroke = currentColor)
const Svg = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const TrashIcon = (p) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></Svg>;
export const EditIcon = (p) => <Svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
export const EyeIcon = (p) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const CopyIcon = (p) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>;
export const PrintIcon = (p) => <Svg {...p}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></Svg>;
export const SearchIcon = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const ArrowLeftIcon = (p) => <Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>;
export const DownloadIcon = (p) => <Svg {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Svg>;
export const CloseIcon = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const FileIcon = (p) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Svg>;
export const BoxIcon = (p) => <Svg {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></Svg>;
export const SidebarIcon = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Svg>;
export const LogoutIcon = (p) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>;
export const MenuIcon = (p) => <Svg {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Svg>;
export const MailIcon = (p) => <Svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></Svg>;
export const PaperclipIcon = (p) => <Svg {...p}><path d="m21 12-8.6 8.6a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.9-2.9L15 6.6" /></Svg>;
