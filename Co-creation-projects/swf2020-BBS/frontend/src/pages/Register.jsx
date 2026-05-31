import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await register(username, password, email);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <h1 style={{ marginBottom: 20 }}>Register</h1>
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="reg-username" style={{ display: 'block', marginBottom: 4 }}>Username</label>
          <input id="reg-username" type="text" value={username} onChange={e => setUsername(e.target.value)} required
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="reg-email" style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="reg-password" style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>
          Register
        </button>
      </form>
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/api/auth/github" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: '#24292e', color: '#fff', borderRadius: 4, textDecoration: 'none', fontSize: 14
        }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign up with GitHub
        </a>
      </div>
    </div>
  );
}
