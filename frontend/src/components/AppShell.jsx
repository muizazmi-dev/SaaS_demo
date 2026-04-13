import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AppShell() {
  const { user, tenant, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>SaaS Demo</h1>
          <p className="tenant-badge">{tenant?.name}</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard"
            className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
          <NavLink to="/customers"
            className={({ isActive }) => isActive ? 'active' : ''}>
            Customers
          </NavLink>
          <NavLink to="/tenant"
            className={({ isActive }) => isActive ? 'active' : ''}>
            Tenant &amp; Audit
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div>{user?.fullName}</div>
          <div style={{ fontSize: 11, marginTop: 2, opacity: .7 }}>{user?.email}</div>
          <div style={{ marginTop: 4 }}>
            <span className="badge badge-gray">{user?.role}</span>
            <span className="badge badge-green" style={{ marginLeft: 4 }}>{tenant?.plan}</span>
          </div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
