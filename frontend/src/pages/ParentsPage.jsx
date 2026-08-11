import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import QuickPreviewModal from '../components/QuickPreviewModal';
import { IconSearch } from '../components/Icons';

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', student_roll_no: '' });
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
      const res = await api.get('parents/');
      setParents(res.data);
    } catch {
      setError('Failed to load parents.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = parents.filter(p => {
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

  function toggleRow(id) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.email) {
      setFormError('Name and email are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('parents/', form);
      setShowAdd(false);
      setForm({ name: '', email: '', student_roll_no: '' });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add parent.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`parents/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch (e) {
      const serverMsg = e.response?.data?.detail || e.response?.data?.error || 'Failed to delete parent.';
      setError(serverMsg);
      setDeleteTarget(null);
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
      const res = await api.post('parents/bulk-upload/', formData, {
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

  function getChildren(parent) {
    return parent.children || parent.students || [];
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Parents</h1>
          <p className="page-sub">Manage all registered parents.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + Add Parent
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
        <IconSearch className="search-icon" width={18} height={18} />
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
              <th>Status</th>
              <th>Children</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <div className="empty-icon">👨‍👩‍👧</div>
                    <p>No parents found.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((p, i) => (
              <>
                 <tr key={p.id}>
                   <td>{i + 1}</td>
                   <td>
                     <button
                       onClick={() => setPreviewTarget(p)}
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
                       {p.name}
                     </button>
                   </td>
                  <td>{p.email}</td>
                  <td>
                    <span className={`badge ${p.is_verified ? 'badge-green' : 'badge-yellow'}`}>
                      {p.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {getChildren(p).length > 0 ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleRow(p.id)}>
                        {getChildren(p).length} child{getChildren(p).length > 1 ? 'ren' : ''} {expandedRows[p.id] ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span className="badge badge-gray">None</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(p)}>Delete</button>
                  </td>
                </tr>
                 {expandedRows[p.id] && getChildren(p).length > 0 && (
                  <tr key={`${p.id}-children`} style={{ background: '#f8fafc' }}>
                    <td colSpan={6} style={{ paddingLeft: '2.5rem' }}>
                      <strong>Children:</strong>{' '}
                      {getChildren(p).map((c, ci) => (
                        <span key={ci} className="badge badge-blue" style={{ marginRight: '0.4rem' }}>
                          {c.name ? `${c.name} (${c.enrollment_number && String(c.enrollment_number).trim() ? c.enrollment_number : 'Not Assigned'})` : (c.enrollment_number || c.roll_no || c)}
                        </span>
                      ))}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Parent">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vikram Patel" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vikram.patel@mail.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Child's Roll Number <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input className="form-input" value={form.student_roll_no} onChange={e => setForm({ ...form, student_roll_no: e.target.value })} placeholder="CS2021001" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Parent'}
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
        role="parent"
      />
    </div>
  );
}
