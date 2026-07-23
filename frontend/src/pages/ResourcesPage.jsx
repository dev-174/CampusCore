import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function ResourcesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '', department: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [r, d] = await Promise.all([api.get('resources/'), api.get('departments/')]);
      setResources(r.data);
      setDepartments(d.data);
    } catch {
      setError('Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }

  function getDeptName(id) {
    if (!id) return '—';
    return departments.find(d => String(d.id) === String(id))?.name || id;
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      setFormError('Title and URL are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('resources/', form);
      setShowAdd(false);
      setForm({ title: '', url: '', description: '', department: '' });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add resource.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`resources/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete resource.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-sub">Useful links and learning resources.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
            + Add Resource
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
              <th>URL</th>
              <th>Description</th>
              <th>Department</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty">
                    <div className="empty-icon">📂</div>
                    <p>No resources available.</p>
                  </div>
                </td>
              </tr>
            ) : resources.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><strong>{r.title}</strong></td>
                <td>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="badge badge-blue"
                    style={{ textDecoration: 'none' }}
                  >
                    Open ↗
                  </a>
                </td>
                <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.description || '—'}
                </td>
                <td>{getDeptName(r.department)}</td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Resource">
            <form onSubmit={handleAdd}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Resource title" />
              </div>
              <div className="form-group">
                <label className="form-label">URL</label>
                <input className="form-input" type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <select className="form-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  <option value="">— All Departments —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Add Resource'}
                </button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
            <p>Delete resource <strong>{deleteTarget?.title}</strong>?</p>
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
