import { useState, useEffect } from 'react';
import { tenantApi } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';

export default function TenantPage() {
  const { tenant } = useAuth();
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tenantApi.info(), tenantApi.auditLog()])
      .then(([infoRes, auditRes]) => {
        setData(infoRes.data);
        setAudit(auditRes.data.entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Tenant &amp; Audit</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Workspace settings and activity log
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Tenant details */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Tenant details</h3>
            {loading ? <p>Loading…</p> : data && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Tenant ID', data.tenant.id],
                  ['Name', data.tenant.name],
                  ['Slug', data.tenant.slug],
                  ['Plan', data.tenant.plan],
                  ['Status', data.tenant.status],
                  ['Created', new Date(data.tenant.created_at).toLocaleString()],
                  ['Total users', data.stats.total_users],
                  ['Total customers', data.stats.total_customers],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500, marginTop: 2, wordBreak: 'break-all' }}>
                      {value ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit log */}
        <div className="card">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Audit log</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              All write operations on your tenant data are recorded here.
            </p>
          </div>
          {loading ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : audit.length === 0 ? (
            <div className="empty-state">
              <h3>No activity yet</h3>
              <p>Create or delete a customer to see entries appear here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                    <th>User</th>
                    <th>IP</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span className={`badge ${
                          entry.action === 'DELETE' ? 'badge-red' :
                          entry.action === 'POST'   ? 'badge-green' : 'badge-gray'
                        }`}>{entry.action}</span>
                      </td>
                      <td>{entry.resource_type || '—'}</td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>
                        {entry.resource_id ? entry.resource_id.slice(0, 8) + '…' : '—'}
                      </td>
                      <td>{entry.user_email || '—'}</td>
                      <td>{entry.ip_address || '—'}</td>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
