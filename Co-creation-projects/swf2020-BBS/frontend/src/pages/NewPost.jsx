import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NewPost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const post = await api.createPost({ title, content, category });
      navigate(`/post/${post.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1 style={{ marginBottom: 20 }}>Create New Post</h1>
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="post-title" style={{ display: 'block', marginBottom: 4 }}>Title</label>
          <input id="post-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="post-category" style={{ display: 'block', marginBottom: 4 }}>Category</label>
          <select id="post-category" value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }}>
            <option value="general">General</option>
            <option value="tech">Tech</option>
            <option value="life">Life</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="post-content" style={{ display: 'block', marginBottom: 4 }}>Content</label>
          <textarea id="post-content" value={content} onChange={e => setContent(e.target.value)} required rows={10}
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: 4 }} />
        </div>
        <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>
          Publish
        </button>
      </form>
    </div>
  );
}
