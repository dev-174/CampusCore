import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconDashboard, IconBuilding, IconCalendar, IconBook, IconFileText,
  IconUsers, IconTeacher, IconFamily, IconMegaphone, IconLink, IconTrend,
  IconBot, IconEdit, IconCheckSq, IconLogout, IconChevronDn, IconMenu, IconClose,
} from './Icons';

const NAV = {
  admin: [
    { to: '/dashboard',   icon: IconDashboard, label: 'Dashboard' },
    { section: 'Academics' },
    { to: '/departments', icon: IconBuilding,  label: 'Departments' },
    { to: '/batches',     icon: IconCalendar,  label: 'Batches' },
    { to: '/subjects',    icon: IconBook,      label: 'Subjects' },
    { to: '/teaching-assignments', icon: IconTeacher, label: 'Teaching Assignments' },
    { to: '/exams',       icon: IconFileText,  label: 'Exams' },
    { section: 'People' },
    { to: '/students',    icon: IconUsers,     label: 'Students' },
    { to: '/faculty',     icon: IconTeacher,   label: 'Faculty' },
    { to: '/parents',     icon: IconFamily,    label: 'Parents' },
    { section: 'Content' },
    { to: '/notices',     icon: IconMegaphone, label: 'Notices' },
    { to: '/resources',   icon: IconLink,      label: 'Resources' },
    { section: 'Insights' },
    { to: '/analytics',   icon: IconTrend,     label: 'Analytics' },
    { to: '/ml',          icon: IconBot,       label: 'Risk Forecast' },
  ],
  faculty: [
    { to: '/dashboard',       icon: IconDashboard, label: 'Dashboard' },
    { to: '/marks/add',       icon: IconEdit,      label: 'Add Marks' },
    { to: '/attendance/mark', icon: IconCheckSq,   label: 'Attendance' },
    { section: 'Common' },
    { to: '/notices',         icon: IconMegaphone, label: 'Notices' },
    { to: '/resources',       icon: IconLink,      label: 'Resources' },
  ],
  student: [
    { to: '/dashboard',    icon: IconDashboard, label: 'Dashboard' },
    { to: '/my-marks',     icon: IconFileText,  label: 'My Marks' },
    { to: '/my-attendance',icon: IconCheckSq,   label: 'My Attendance' },
    { section: 'Common' },
    { to: '/notices',      icon: IconMegaphone, label: 'Notices' },
    { to: '/resources',    icon: IconLink,      label: 'Resources' },
  ],
  parent: [
    { to: '/dashboard',       icon: IconDashboard, label: 'Dashboard' },
    { to: '/child-marks',     icon: IconFileText,  label: "Child's Marks" },
    { to: '/child-attendance',icon: IconCheckSq,   label: "Child's Attendance" },
    { section: 'Common' },
    { to: '/notices',         icon: IconMegaphone, label: 'Notices' },
    { to: '/resources',       icon: IconLink,      label: 'Resources' },
  ],
};

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const items = NAV[user?.role] || [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const activeLabel = items.find(i => i.to && location.pathname.startsWith(i.to))?.label || 'Dashboard';

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-is-open' : ''}`}>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark">🎓</span>
          <span>CampusCore</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: '8px', paddingBottom: '8px' }}>
          {items.map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section">{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials(user?.name)}</div>
            <div style={{ minWidth: 0 }}>
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="topbar-mobile-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <IconMenu width={20} height={20} />
            </button>
            <span className="topbar-title">{activeLabel}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-user" ref={menuRef} onClick={() => setMenuOpen(o => !o)}>
              <div className="topbar-user-avatar">{initials(user?.name)}</div>
              <div className="topbar-user-info">
                <strong>{user?.name}</strong>
                <span>{user?.role}</span>
              </div>
              <IconChevronDn width={16} height={16} style={{ color: 'var(--text-3)' }} />
              {menuOpen && (
                <div className="topbar-dropdown">
                  <NavLink to="/profile" className="topbar-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    My Profile
                  </NavLink>
                  <button className="topbar-dropdown-item danger" onClick={logout}>
                    <IconLogout width={16} height={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}