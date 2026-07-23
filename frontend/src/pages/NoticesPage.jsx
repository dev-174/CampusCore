import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function NoticesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('notices/');
      setNotices(res.data);
    } catch {
      setError('Failed to load notices.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('notices/', form);
      setShowAdd(false);
      setForm({ title: '', content: '', is_pinned: false });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add notice.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`notices/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete notice.');
    } finally {
      setDeleting(false);
    }
  }

  function truncate(str, n = 80) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Notices</h1>
          <p className="page-sub">University announcements and notices.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
            + Post Notice
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Content</th>
              <th>Pinned</th>
              <th>Date</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty">
                    <div className="empty-icon">📢</div>
                    <p>No notices available.</p>
                  </div>
                </td>
              </tr>
            ) : notices.map((n, i) => (
              <tr key={n.id}>
                <td>{i + 1}</td>
                <td><strong>{n.title}</strong></td>
                <td style={{ maxWidth: '320px' }}>{truncate(n.content)}</td>
                <td>
                  {n.is_pinned ? (
                    <span className="badge badge-yellow">📌 Pinned</span>
                  ) : (
                    <span className="badge badge-gray">—</span>
                  )}
                </td>
                <td>{n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}</td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(n)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Post Notice">
            <form onSubmit={handleAdd}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notice title" />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="Notice details…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={form.is_pinned}
                  onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <label htmlFor="is_pinned" className="form-label" style={{ margin: 0 }}>Pin this notice</label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Post Notice'}
                </button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
            <p>Delete notice <strong>{deleteTarget?.title}</strong>?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="spinner" /> : 'Delete'}
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
