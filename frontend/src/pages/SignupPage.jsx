import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function SignupPage() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '', fullName: '', email: '', password: '',
  });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const result = await signup(form);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Create your account</h2>
        <p>Start your free SaaS demo — a new tenant workspace will be created for your company.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company name</label>
            <input
              type="text" name="companyName" required
              placeholder="Acme Corp"
              value={form.companyName} onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Your full name</label>
            <input
              type="text" name="fullName" required
              placeholder="Jane Smith"
              value={form.fullName} onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Work email</label>
            <input
              type="email" name="email" required
              placeholder="jane@acme.com"
              value={form.email} onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" name="password" required
              placeholder="At least 8 characters"
              value={form.password} onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating workspace…' : 'Create workspace'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        {/* Architecture callout */}
        <div style={{
          marginTop: 24, padding: 14,
          background: '#eff6ff', borderRadius: 8,
          fontSize: 12, color: '#1e40af', lineHeight: 1.6
        }}>
          <strong>Multi-tenancy demo:</strong> Submitting this form creates a new row in the
          <code style={{ margin: '0 4px', background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>tenants</code>
          table and scopes your user to that tenant ID. All data you create is isolated by
          <code style={{ margin: '0 4px', background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>tenant_id</code>
          at the database query level.
        </div>
      </div>
    </div>
  );
}
