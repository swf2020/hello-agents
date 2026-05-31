import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';

  useEffect(() => {
    setLoading(true);
    api.getPosts({ page, limit: 20, ...(category && { category }) })
      .then(data => {
        setPosts(data.posts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError('');
      })
      .catch(err => setError(err.message || 'Failed to load posts'))
      .finally(() => setLoading(false));
  }, [page, category]);

  const categories = ['', 'general', 'tech', 'life', 'other'];

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => { setSearchParams(c ? { category: c } : {}); setPage(1); }}
            style={{
              padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 20,
              background: category === c ? '#2563eb' : '#fff', color: category === c ? '#fff' : '#333', cursor: 'pointer'
            }}>
            {c || 'All'}
          </button>
        ))}
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : posts.length === 0 ? (
        <p>No posts yet. <Link to="/new">Create the first post!</Link></p>
      ) : (
        <>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', padding: 20, marginBottom: 12, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {post.pinned ? <span style={{ background: '#fbbf24', color: '#000', padding: '2px 8px', borderRadius: 4, fontSize: 12, marginRight: 8 }}>Pinned</span> : null}
              <span style={{ color: '#6b7280', fontSize: 12 }}>{post.category}</span>
              <Link to={`/post/${post.id}`} style={{ display: 'block', fontSize: 18, fontWeight: 600, marginTop: 4, textDecoration: 'none' }}>
                {post.title}
              </Link>
              <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>{post.content.substring(0, 200)}{post.content.length > 200 ? '...' : ''}</p>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
                by {post.authorName} · {new Date(post.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Prev</button>
              <span style={{ padding: '6px 12px' }}>Page {page} / {totalPages} ({total} posts)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
