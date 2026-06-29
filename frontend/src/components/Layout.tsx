import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Sessions', icon: '◉' },
  { to: '/login', label: 'Đăng nhập mới', icon: '＋' },
]

export function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">TG</div>
          <div>
            <p className="brand-title">Telegram Manager</p>
            <p className="brand-sub">FastAPI Dashboard</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link--active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <p>Backend: <code>backend/</code></p>
          <p>Proxy → <code>127.0.0.1:8001</code></p>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}