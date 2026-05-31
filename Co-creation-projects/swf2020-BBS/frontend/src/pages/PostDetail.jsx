import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPost = () => {
    setLoading(true);
    api.getPost(id)
      .then(setPost)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPost(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.createComment(id, { content: comment });
      setComment('');
      fetchPost();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.deletePost(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container" style={{ color: '#dc2626' }}>{error}</div>;
  if (!post) return <div className="container">Post not found</div>;

  const canEdit = user && (user.id === post.authorId || user.role === 'admin');

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Link to="/" style={{ color: '#6b7280', fontSize: 14 }}>← Back to posts</Link>
      <article style={{ background: '#fff', padding: 24, marginTop: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <span style={{ color: '#6b7280', fontSize: 12 }}>{post.category}</span>
            <h1 style={{ marginTop: 4 }}>{post.title}</h1>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={`/post/${id}/edit`} style={{ color: '#2563eb', fontSize: 14 }}>Edit</Link>
              <button onClick={handleDelete} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Delete</button>
            </div>
          )}
        </div>
        <div style={{ marginTop: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.content}</div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 16 }}>
          by {post.author?.username || 'Unknown'} · {new Date(post.createdAt).toLocaleString()}
        </div>
      </article>

      <section style={{ marginTop: 32 }}>
        <h2>Comments ({post.comments?.length || 0})</h2>
        {post.comments?.map(c => (
          <div key={c.id} style={{ background: '#fff', padding: 16, marginTop: 8, borderRadius: 8 }}>
            <p>{c.content}</p>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
              {c.author?.username || 'Unknown'} · {new Date(c.createdAt).toLocaleString()}
            </div>
          </div>
        ))}

        {user ? (
          <form onSubmit={handleComment} style={{ marginTop: 16 }}>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..."
              style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 4, minHeight: 80 }} />
            <button type="submit" style={{ marginTop: 8, padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Submit
            </button>
          </form>
        ) : (
          <p style={{ marginTop: 16, color: '#6b7280' }}><Link to="/login">Login</Link> to leave a comment.</p>
        )}
      </section>
    </div>
  );
}
