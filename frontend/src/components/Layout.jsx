import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/upload',    icon: '🔬', label: 'New Analysis' },
  { to: '/history',   icon: '📋', label: 'History' },
]

export default function Layout() {
  const navigate = useNavigate()
  const userRaw  = localStorage.getItem('user')
  const user     = userRaw ? JSON.parse(userRaw) : { full_name: 'User', role: 'doctor' }

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
          <div className="sidebar-logo-icon">👁️</div>
          <div className="sidebar-logo-text">
            <h1>AIDR</h1>
            <p>Retinopathy Detection</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.full_name || user.username}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Logout">⏻</button>
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
