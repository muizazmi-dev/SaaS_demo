import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { tenantApi } from '../services/api';

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenantApi.info()
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Tenant: <strong>{tenant?.name}</strong>
            <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
            ID: <code style={{ fontSize: 11 }}>{tenant?.id}</code>
          </p>
        </div>
        <span className="badge badge-green">{tenant?.plan} plan</span>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Customers</div>
            <div className="value">{loading ? '—' : stats?.total_customers ?? 0}</div>
            <div className="sub">Scoped to your tenant</div>
          </div>
          <div className="stat-card">
            <div className="label">Users</div>
            <div className="value">{loading ? '—' : stats?.total_users ?? 0}</div>
            <div className="sub">In your workspace</div>
          </div>
          <div className="stat-card">
            <div className="label">Your role</div>
            <div className="value" style={{ fontSize: 20, textTransform: 'capitalize' }}>
              {user?.role}
            </div>
            <div className="sub">Workspace admin</div>
          </div>
          <div className="stat-card">
            <div className="label">Plan</div>
            <div className="value" style={{ fontSize: 20, textTransform: 'capitalize' }}>
              {tenant?.plan}
            </div>
            <div className="sub">Current subscription</div>
          </div>
        </div>

        {/* Architecture summary */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
              Multi-tenant architecture demo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { layer: 'Client layer', desc: 'React SPA — this UI. JWT stored in localStorage, attached to every API call.', color: '#eff6ff', border: '#bfdbfe' },
                { layer: 'API gateway', desc: 'Helmet + CORS + rate limiting on Express. Auth middleware validates JWT before any handler.', color: '#f0fdf4', border: '#bbf7d0' },
                { layer: 'Application layer', desc: 'Node.js / Express. Every route reads req.tenantId — injected by auth middleware from the JWT.', color: '#fdf4ff', border: '#e9d5ff' },
                { layer: 'Data layer', desc: 'Azure SQL. Every table has tenant_id. Queries always include WHERE tenant_id = @tenantId — no cross-tenant leakage.', color: '#fff7ed', border: '#fed7aa' },
              ].map(({ layer, desc, color, border }) => (
                <div key={layer} style={{
                  padding: 14, borderRadius: 8,
                  background: color, border: `1px solid ${border}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{layer}</div>
                  <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/customers" className="btn btn-primary">
            Manage customers
          </Link>
          <Link to="/tenant" className="btn btn-secondary">
            View audit log
          </Link>
        </div>
      </div>
    </>
  );
}
