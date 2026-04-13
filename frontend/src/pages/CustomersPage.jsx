import { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers.js';

function AddCustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const result = await onSave(form);
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Add customer</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name *</label>
            <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Jane Smith" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="jane@example.com" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+65 9123 4567" />
          </div>
          <div className="form-group">
            <label>Company</label>
            <input type="text" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { customers, loading, error, createCustomer, deleteCustomer } = useCustomers();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteCustomer(deleteId);
    setDeleteId(null);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            All records are scoped to your tenant — other tenants cannot see this data.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add customer
        </button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <h3>No customers yet</h3>
              <p>Add your first customer to see multi-tenant isolation in action.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.company || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => setDeleteId(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tenant isolation callout */}
        <div style={{
          marginTop: 20, padding: 14, borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534'
        }}>
          <strong>Isolation demo:</strong> Each row in the <code>customers</code> table has a
          <code style={{ margin: '0 4px' }}>tenant_id</code> column. The API query is:
          <code style={{ display: 'block', marginTop: 6, padding: '6px 10px', background: '#dcfce7', borderRadius: 4 }}>
            SELECT * FROM customers WHERE tenant_id = '{'{your-tenant-id}'}'
          </code>
          Sign up with a second account to see that tenants are completely isolated.
        </div>
      </div>

      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onSave={createCustomer}
        />
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete customer?</h3>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              This action cannot be undone. The record will be permanently removed from your tenant.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
