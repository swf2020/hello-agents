import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export default function Admin() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [adminComments, setAdminComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(() => {
    setLoading(true);
    api.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const fetchAdminPosts = useCallback(() => {
    setLoading(true);
    api.getAdminPosts().then(d => setAdminPosts(d.posts)).finally(() => setLoading(false));
  }, []);

  const fetchAdminComments = useCallback(() => {
    setLoading(true);
    api.getAdminComments().then(d => setAdminComments(d.comments)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'stats') fetchStats();
    else if (tab === 'users') fetchUsers();
    else if (tab === 'posts') fetchAdminPosts();
    else if (tab === 'comments') fetchAdminComments();
  }, [tab, fetchStats, fetchUsers, fetchAdminPosts, fetchAdminComments]);

  const handleBan = async (userId, banned) => {
    await api.banUser(userId, banned);
    fetchUsers();
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await api.deleteAdminPost(postId);
    fetchAdminPosts();
  };

  const handlePinPost = async (postId, pinned) => {
    await api.pinPost(postId, pinned);
    fetchAdminPosts();
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    await api.deleteAdminComment(commentId);
    fetchAdminComments();
  };

  const tabs = ['stats', 'users', 'posts', 'comments'];

  return (
    <div className="container">
      <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 4, cursor: 'pointer',
              background: tab === t ? '#2563eb' : '#e5e7eb', color: tab === t ? '#fff' : '#333',
            }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {tab === 'stats' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#2563eb' }}>{stats.userCount}</div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Users</div>
              </div>
              <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#16a34a' }}>{stats.postCount}</div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Posts</div>
              </div>
              <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#dc2626' }}>{stats.commentCount}</div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Comments</div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse', borderRadius: 8 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Username</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Role</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12 }}>{u.id}</td>
                    <td style={{ padding: 12 }}>{u.username}</td>
                    <td style={{ padding: 12 }}>{u.email}</td>
                    <td style={{ padding: 12 }}>{u.role}</td>
                    <td style={{ padding: 12 }}>{u.banned ? <span style={{ color: '#dc2626' }}>Banned</span> : <span style={{ color: '#16a34a' }}>Active</span>}</td>
                    <td style={{ padding: 12 }}>
                      <button onClick={() => handleBan(u.id, !u.banned)}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', background: u.banned ? '#16a34a' : '#dc2626', color: '#fff' }}>
                        {u.banned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'posts' && (
            <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse', borderRadius: 8 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Title</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Author</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Category</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Pinned</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12 }}>{p.id}</td>
                    <td style={{ padding: 12 }}>{p.title}</td>
                    <td style={{ padding: 12 }}>{p.authorName}</td>
                    <td style={{ padding: 12 }}>{p.category}</td>
                    <td style={{ padding: 12 }}>{p.pinned ? 'Yes' : 'No'}</td>
                    <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                      <button onClick={() => handlePinPost(p.id, !p.pinned)}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', background: '#f59e0b', color: '#fff' }}>
                        {p.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button onClick={() => handleDeletePost(p.id)}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', background: '#dc2626', color: '#fff' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'comments' && (
            <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse', borderRadius: 8 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Content</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Author</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Post ID</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminComments.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12 }}>{c.id}</td>
                    <td style={{ padding: 12 }}>{c.content.substring(0, 50)}{c.content.length > 50 ? '...' : ''}</td>
                    <td style={{ padding: 12 }}>{c.authorName}</td>
                    <td style={{ padding: 12 }}>{c.postId}</td>
                    <td style={{ padding: 12 }}>
                      <button onClick={() => handleDeleteComment(c.id)}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', background: '#dc2626', color: '#fff' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
