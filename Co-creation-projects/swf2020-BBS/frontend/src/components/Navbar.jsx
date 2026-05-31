import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ background: '#1e293b', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', textDecoration: 'none' }}>BBS</Link>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {user ? (
          <>
            <Link to="/new" style={{ color: '#94a3b8', textDecoration: 'none' }}>New Post</Link>
            <Link to="/profile" style={{ color: '#94a3b8', textDecoration: 'none' }}>{user.username}</Link>
            {isAdmin && <Link to="/admin" style={{ color: '#fbbf24', textDecoration: 'none' }}>Admin</Link>}
            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Login</Link>
            <Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
