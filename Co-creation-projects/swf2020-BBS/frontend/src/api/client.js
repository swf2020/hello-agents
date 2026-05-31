const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error = new Error(data?.error || 'Request failed');
    error.status = res.status;
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  exchangeGithubCode: (code) => request('/auth/github/exchange', { method: 'POST', body: JSON.stringify({ code }) }),

  // Posts
  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? '?' + qs : ''}`);
  },
  getPost: (id) => request(`/posts/${id}`),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  updatePost: (id, body) => request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

  // Comments
  createComment: (postId, body) => request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body) }),

  // User
  getProfile: () => request('/user/profile'),
  updateProfile: (body) => request('/user/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Admin
  getStats: () => request('/admin/stats'),
  getUsers: () => request('/admin/users'),
  banUser: (id, banned) => request(`/admin/users/${id}/ban`, { method: 'PUT', body: JSON.stringify({ banned }) }),
  getAdminPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/posts${qs ? '?' + qs : ''}`);
  },
  deleteAdminPost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
  pinPost: (id, pinned) => request(`/admin/posts/${id}/pin`, { method: 'PUT', body: JSON.stringify({ pinned }) }),
  getAdminComments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/comments${qs ? '?' + qs : ''}`);
  },
  deleteAdminComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
};
