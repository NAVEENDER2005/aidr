import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'New Analysis',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18h8"/>
        <path d="M3 22h18"/>
        <path d="M14 22a7 7 0 1 0-7-7"/>
        <path d="M9 14h2"/>
        <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/>
        <path d="M12 6V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/>
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History & Reports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/>
        <path d="M12 11h4"/>
        <path d="M12 16h4"/>
        <path d="M8 11h.01"/>
        <path d="M8 16h.01"/>
      </svg>
    ),
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const userRaw  = localStorage.getItem('user')
  const user     = userRaw ? JSON.parse(userRaw) : { full_name: 'Dr. Specialist', role: 'Doctor' }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DR'

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <h1>AI<span>DR</span></h1>
            <p>Retinopathy Detection</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Medical Screening</span>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.full_name || user.username}</div>
              <div className="user-role">{user.role || 'Practitioner'}</div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Logout" aria-label="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
