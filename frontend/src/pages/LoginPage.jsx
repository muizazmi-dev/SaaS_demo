import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p>Sign in to your tenant workspace.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          No account yet? <Link to="/signup">Create a workspace</Link>
        </p>
      </div>
    </div>
  );
}
