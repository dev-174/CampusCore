import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import QuickPreviewModal from '../components/QuickPreviewModal';

export default function FacultyPage() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: '', designation: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [f, d] = await Promise.all([api.get('faculty/'), api.get('departments/')]);
      setFaculty(f.data);
      setDepartments(d.data);
    } catch {
      setError('Failed to load faculty.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    return (
      (f.name || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q)
    );
  });

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.email) {
      setFormError('Name and email are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('faculty/', form);
      setShowAdd(false);
      setForm({ name: '', email: '', department: '', designation: '' });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add faculty.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`faculty/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete faculty.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkMsg('');
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const res = await api.post('faculty/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkMsg(res.data?.message || 'Bulk upload successful.');
      fetchAll();
    } catch (e) {
      setBulkMsg(e.response?.data?.error || e.response?.data?.detail || 'Bulk upload failed.');
    } finally {
      setBulkLoading(false);
      setBulkFile(null);
    }
  }

  function getDeptName(id) {
    return departments.find(d => String(d.id) === String(id))?.name || id || '—';
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Faculty</h1>
          <p className="page-sub">Manage all faculty members.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + Add Faculty
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p className="form-label" style={{ marginBottom: '0.5rem' }}>Bulk Upload (CSV)</p>
        <form onSubmit={handleBulkUpload} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv"
            className="form-input"
            style={{ flex: 1, minWidth: '200px' }}
            onChange={e => setBulkFile(e.target.files[0])}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={bulkLoading || !bulkFile}>
            {bulkLoading ? <span className="spinner" /> : 'Upload CSV'}
          </button>
        </form>
        {bulkMsg && (
          <p style={{ marginTop: '0.5rem', color: bulkMsg.toLowerCase().includes('fail') ? 'var(--error)' : 'var(--success)' }}>
            {bulkMsg}
          </p>
        )}
      </div>

      <div className="search-wrap" style={{ marginBottom: '1rem' }}>
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon">👨‍🏫</div>
                    <p>No faculty members found.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((f, i) => (
              <tr key={f.id}>
                <td>{i + 1}</td>
                <td>
                  <button
                    onClick={() => setPreviewTarget(f)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'var(--accent)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {f.name}
                  </button>
                </td>
                <td>{f.email}</td>
                <td>{getDeptName(f.department)}</td>
                <td>{f.designation || '—'}</td>
                <td>
                  <span className={`badge ${f.is_verified ? 'badge-green' : 'badge-yellow'}`}>
                    {f.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(f)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Faculty">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@university.edu" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Professor, Lecturer" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Faculty'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Delete'}
          </button>
        </div>
      </Modal>

      <QuickPreviewModal
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        personId={previewTarget?.id}
        role="faculty"
      />
    </div>
  );
}
