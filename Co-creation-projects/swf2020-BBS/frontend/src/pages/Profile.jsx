import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setEmail(user.email || '');
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.updateProfile({ email });
      setMessage('Profile updated!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 500, marginTop: 40 }}>
      <h1 style={{ marginBottom: 20 }}>My Profile</h1>
      {message && <div style={{ background: '#dcfce7', color: '#16a34a', padding: 10, borderRadius: 4, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 4, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <strong>Username:</strong> {user?.username}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>Role:</strong> {user?.role}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>Joined:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
        </div>

        <form onSubmit={handleUpdate}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="profile-email" style={{ display: 'block', marginBottom: 4 }}>Email</label>
            <input id="profile-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
          </div>
          <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}
