// Lightweight inline SVG icon set (stroke-based, 20x20 default).
// No external dependency — keeps bundle size and install steps unchanged.
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

const make = (path) => (props) => (
  <svg {...base} {...props}>{path}</svg>
);

export const IconDashboard = make(<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>);
export const IconBuilding   = make(<><path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15"/><path d="M14 21V10a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v11"/><path d="M4 21h17"/><path d="M8 8h1M8 12h1M8 16h1"/><path d="M17 13h1M17 17h1"/></>);
export const IconCalendar   = make(<><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4M16 2.5v4"/></>);
export const IconBook       = make(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z"/></>);
export const IconFileText   = make(<><path d="M6 2.5h9l5 5v14H6z"/><path d="M15 2.5v5h5"/><path d="M9 13h6M9 17h6M9 9.5h2"/></>);
export const IconUsers      = make(<><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="8.5" r="2.6"/><path d="M15.7 14.2c2.9.4 5.3 2.5 5.3 5.8"/></>);
export const IconTeacher    = make(<><circle cx="12" cy="8" r="3.2"/><path d="M5 20.5c0-4 3.1-6.8 7-6.8s7 2.8 7 6.8"/><path d="M4 6.5 12 3l8 3.5-8 3.5z"/></>);
export const IconFamily     = make(<><circle cx="8" cy="8" r="2.6"/><circle cx="17" cy="9" r="2.2"/><path d="M2.8 20c0-3.3 2.4-5.6 5.2-5.6s5.2 2.3 5.2 5.6"/><path d="M13.5 20c.2-2.6 1.9-4.4 3.9-4.4 2.2 0 4 2 4 4.4"/></>);
export const IconMegaphone  = make(<><path d="M3 11v2a2 2 0 0 0 2 2h1l2 5h2l-1.2-5H12l7 4V6l-7 4H6a2 2 0 0 0-2 2Z"/><path d="M12 10V6"/></>);
export const IconLink       = make(<><path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 13 4.6a3.5 3.5 0 0 1 5 5L16 11.5"/><path d="M13 17.5 11 19.4a3.5 3.5 0 0 1-5-5L8 12.5"/></>);
export const IconTrend      = make(<><path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/></>);
export const IconBot        = make(<><rect x="4" y="8" width="16" height="11" rx="2.5"/><circle cx="9" cy="13.5" r="1.3"/><circle cx="15" cy="13.5" r="1.3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.2" r="1.2"/><path d="M2.5 12v3M21.5 12v3"/></>);
export const IconEdit       = make(<><path d="M4 20h4.2L20 8.2a2.1 2.1 0 0 0 0-3L19 4a2.1 2.1 0 0 0-3 0L4.2 15.8Z"/><path d="M14.5 6.5l3 3"/></>);
export const IconCheckSq    = make(<><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.2l2.6 2.6L16.5 9"/></>);
export const IconEye       = make(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>);
export const IconEyeOff    = make(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>);
export const IconLogout    = make(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>);
export const IconSearch    = make(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>);
export const IconChevronDn = make(<path d="m6 9 6 6 6-6"/>);
export const IconWarning   = make(<><path d="M12 3.5 22 20.5H2Z"/><path d="M12 10v4"/><circle cx="12" cy="17.3" r=".4" fill="currentColor"/></>);
export const IconGraduate  = make(<><path d="M2 9.5 12 5l10 4.5-10 4.5Z"/><path d="M6.5 11.8v4.7c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.7"/><path d="M21 10.3V16"/></>);
export const IconIdCard    = make(<><rect x="2.5" y="5" width="19" height="14" rx="2.2"/><circle cx="8.5" cy="12" r="2"/><path d="M6 16.3c.5-1.4 1.5-2 2.5-2s2 .6 2.5 2"/><path d="M14.5 9.5h4M14.5 12.5h4M14.5 15.5h2.5"/></>);
export const IconTrash     = make(<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></>);
export const IconMenu      = make(<><path d="M4 6h16M4 12h16M4 18h16"/></>);
export const IconClose     = make(<><path d="M18 6L6 18M6 6l12 12"/></>);