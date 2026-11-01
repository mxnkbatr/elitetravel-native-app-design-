import type { ReactNode } from "react";

/** Line icons in the same style as the site's mobile dock; `active` fills them softly. */
function Icon({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const soft = (active?: boolean) => ({ fill: active ? "currentColor" : "none", fillOpacity: active ? 0.18 : 0 });

export type IconProps = { active?: boolean };

export const TicketIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" {...soft(active)} />
    <path d="M14 6v12" strokeDasharray="1.5 2" />
  </Icon>
);

export const CardIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <rect x="3.5" y="6" width="17" height="12" rx="2.5" {...soft(active)} />
    <path d="M3.5 10h17M7 14.5h3" />
  </Icon>
);

export const PlaneIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M10.5 13.5 4 11l1.5-1.5 7 1 3.8-3.8a1.8 1.8 0 0 1 2.5 2.5L15 13l1 7-1.5 1.5-2.5-6.5" {...soft(active)} />
  </Icon>
);

export const CompassIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="m14.8 9.2-1.6 4.6-4.6 1.6 1.6-4.6 4.6-1.6Z" {...soft(active)} />
  </Icon>
);

export const GridIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" {...soft(active)} />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" {...soft(active)} />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" {...soft(active)} />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" {...soft(active)} />
  </Icon>
);

export const ChartIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M4 20h16" />
    <rect x="6" y="11" width="3" height="6.5" rx="1" {...soft(active)} />
    <rect x="10.5" y="6.5" width="3" height="11" rx="1" {...soft(active)} />
    <rect x="15" y="9" width="3" height="8.5" rx="1" {...soft(active)} />
  </Icon>
);

export const NewsIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <rect x="4" y="4.5" width="16" height="15" rx="2.5" {...soft(active)} />
    <path d="M8 9h8M8 12.5h8M8 16h5" />
  </Icon>
);

export const ChatIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12Z" {...soft(active)} />
  </Icon>
);

export const ImageIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <rect x="4" y="4.5" width="16" height="15" rx="2.5" {...soft(active)} />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m5 17 4.5-4.5 3 3 2.5-2.5L19 17" />
  </Icon>
);

export const UsersIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <circle cx="9" cy="8.5" r="3.2" {...soft(active)} />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14a5.5 5.5 0 0 1 3 5" />
  </Icon>
);

export const ListIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <rect x="4" y="4.5" width="16" height="15" rx="2.5" {...soft(active)} />
    <path d="M8 9h8M8 12.5h8M8 16h6" />
  </Icon>
);

export const AlertIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M10.3 4.6a2 2 0 0 1 3.4 0l7 12A2 2 0 0 1 19 19.6H5a2 2 0 0 1-1.7-3l7-12Z" {...soft(active)} />
    <path d="M12 9.5v4M12 16.5h.01" />
  </Icon>
);

export const BellIcon = ({ active }: IconProps) => (
  <Icon active={active}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" {...soft(active)} />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);

export const ExternalIcon = () => (
  <Icon>
    <path d="M14 5h5v5M19 5l-8 8M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V7.5A1.5 1.5 0 0 1 6.5 6H10" />
  </Icon>
);

export const LogoutIcon = () => (
  <Icon>
    <path d="M14 8V6a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 14 18v-2M10 12h10M17 9l3 3-3 3" />
  </Icon>
);
