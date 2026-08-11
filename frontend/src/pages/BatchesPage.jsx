import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { IconEdit, IconTrash } from '../components/Icons';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', year: '', department: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', year: '', department: '' });
  const [editFormError, setEditFormError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [blockedModalData, setBlockedModalData] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [bRes, dRes] = await Promise.all([
        api.get('batches/'),
        api.get('departments/'),
      ]);
      setBatches(bRes.data);
      setDepartments(dRes.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function getDeptName(id) {
    const d = departments.find(x => x.id === id);
    return d ? d.name : id;
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.department) {
      setFormError('Name and Department are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('batches/', {
        name: form.name.trim(),
        year: form.year ? parseInt(form.year, 10) : new Date().getFullYear(),
        department: parseInt(form.department, 10),
      });
      setShowAdd(false);
      setForm({ name: '', year: '', department: '' });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.name?.[0] || e.response?.data?.detail || 'Failed to add batch.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(b) {
    setEditTarget(b);
    setEditForm({
      name: b.name || '',
      year: b.year || '',
      department: b.department || ''
    });
    setEditFormError('');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.department) {
      setEditFormError('Name and Department are required.');
      return;
    }
    setEditSaving(true);
    setEditFormError('');
    try {
      await api.patch(`batches/${editTarget.id}/`, {
        name: editForm.name.trim(),
        year: editForm.year ? parseInt(editForm.year, 10) : new Date().getFullYear(),
        department: parseInt(editForm.department, 10),
      });
      setEditTarget(null);
      fetchAll();
    } catch (err) {
      setEditFormError(
        err.response?.data?.department?.[0] ||
        err.response?.data?.department ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.name ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to update batch.'
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`batches/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch (e) {
      const serverMsg = e.response?.data?.detail || e.response?.data?.error || 'Failed to delete batch.';
      setBlockedModalData({
        itemName: deleteTarget?.name || 'this batch',
        message: serverMsg,
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="page-sub">Manage student batches per department.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + Add Batch
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Batch Name</th>
              <th>Year</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <div className="empty-icon">📅</div>
                    <p>No batches found. Add one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : batches.map((b, i) => (
              <tr key={b.id}>
                <td>{i + 1}</td>
                <td>{b.name}</td>
                <td>{b.year || '—'}</td>
                <td>{getDeptName(b.department)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px', borderRadius: '8px', color: 'var(--accent)' }}
                      title="Edit batch"
                      onClick={() => openEdit(b)}
                    >
                      <IconEdit width={16} height={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px', borderRadius: '8px', color: '#dc2626' }}
                      title="Delete batch"
                      onClick={() => setDeleteTarget(b)}
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Batch Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Batch">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Batch Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2021-25" />
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <input className="form-input" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2021" min="2000" max="2099" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Batch">
        <form onSubmit={handleSaveEdit}>
          {editFormError && <div className="alert alert-error">{editFormError}</div>}
          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={editForm.department}
              onChange={e => setEditForm({ ...editForm, department: e.target.value })}
            >
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Batch Name</label>
            <input
              className="form-input"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. 2021-25"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <input
              className="form-input"
              type="number"
              value={editForm.year}
              onChange={e => setEditForm({ ...editForm, year: e.target.value })}
              placeholder="e.g. 2021"
              min="2000"
              max="2099"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={editSaving}>
              {editSaving ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Delete batch <strong>{deleteTarget?.name}</strong>?</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Blocked Deletion Info Modal */}
      <Modal isOpen={!!blockedModalData} onClose={() => setBlockedModalData(null)} title="Cannot Delete Batch">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '1rem',
            color: '#991b1b',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b' }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span> Deletion Blocked
            </div>
            <p style={{ margin: 0 }}>{blockedModalData?.message}</p>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            To safely delete batch <strong>{blockedModalData?.itemName}</strong>, please first reassign or remove its associated students or teaching assignments.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={() => setBlockedModalData(null)}>
              OK
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
