import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = params.get('code');
    const errMsg = params.get('error');

    if (errMsg) {
      setError(errMsg);
      return;
    }

    if (!code) {
      navigate('/login');
      return;
    }

    api.exchangeGithubCode(code)
      .then(({ token }) => {
        localStorage.setItem('token', token);
        window.location.href = '/';
      })
      .catch((err) => {
        setError(err.message || 'OAuth login failed');
      });
  }, [params, navigate]);

  if (error) {
    return (
      <div className="container" style={{ maxWidth: 400, marginTop: 60, textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626', marginBottom: 16 }}>Login Failed</h2>
        <p style={{ marginBottom: 20, color: '#666' }}>{error}</p>
        <a href="/login" style={{ color: '#2563eb' }}>Back to Login</a>
      </div>
    );
  }

  return <div className="container" style={{ textAlign: 'center', marginTop: 60 }}>Signing in...</div>;
}
