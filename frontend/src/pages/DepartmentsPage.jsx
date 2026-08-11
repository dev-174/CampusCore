import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [blockedModalData, setBlockedModalData] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('departments/');
      setDepartments(res.data);
    } catch {
      setError('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Department name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: name.trim() };
      if (code.trim()) {
        payload.code = code.trim();
      }
      await api.post('departments/', payload);
      setShowAdd(false);
      setName('');
      setCode('');
      fetchAll();
    } catch (e) {
      const data = e.response?.data;
      if (typeof data === 'object' && data !== null) {
        const msg = Object.entries(data)
          .map(([k, v]) => `${k !== 'detail' ? `${k}: ` : ''}${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ');
        setFormError(msg || 'Failed to add department.');
      } else {
        setFormError(e.response?.data?.detail || 'Failed to add department.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`departments/${deleteTarget.id}/`);
      setDeleteTarget(null);
      setError('');
      fetchAll();
    } catch (e) {
      const data = e.response?.data;
      const deptName = deleteTarget?.name || 'Department';

      let formattedDeps = [];
      if (data?.dependencies) {
        const { students, faculty, batches, subjects, exams, resources } = data.dependencies;
        if (students) formattedDeps.push(`${students} Student${students > 1 ? 's' : ''}`);
        if (faculty) formattedDeps.push(`${faculty} Faculty`);
        if (batches) formattedDeps.push(`${batches} Batch${batches > 1 ? 'es' : ''}`);
        if (subjects) formattedDeps.push(`${subjects} Subject${subjects > 1 ? 's' : ''}`);
        if (exams) formattedDeps.push(`${exams} Exam${exams > 1 ? 's' : ''}`);
        if (resources) formattedDeps.push(`${resources} Resource${resources > 1 ? 's' : ''}`);
      }

      setBlockedModalData({
        deptName,
        dependenciesList: formattedDeps.length > 0 ? formattedDeps.join(' • ') : null,
      });
      setError('');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-sub">Manage university departments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); setName(''); setCode(''); }}>
          + Add Department
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Department Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <div className="empty-icon">🏛️</div>
                    <p>No departments yet. Add one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : departments.map((d, i) => (
              <tr key={d.id}>
                <td>{i + 1}</td>
                <td>
                  <span className="badge badge-purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {d.code || '--'}
                  </span>
                </td>
                <td>{d.name}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(d)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Department">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Department Name</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Computer Science"
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Department Code (2 Digits)</label>
            <input
              className="form-input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. 01 (leave blank to auto-assign)"
              maxLength={2}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
              2-digit numeric code embedded in student enrollment IDs (e.g. 01, 02). Auto-assigned if left blank.
            </small>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Delete department <strong>{deleteTarget?.name}</strong>? This may affect students and faculty linked to it.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Blocked Deletion Info Modal */}
      <Modal isOpen={!!blockedModalData} onClose={() => setBlockedModalData(null)} title="Cannot Delete Department">
        <div style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text, #0f172a)', marginBottom: '16px', lineHeight: 1.4 }}>
            &quot;{blockedModalData?.deptName}&quot; cannot be deleted because it is currently in use.
          </p>

          {blockedModalData?.dependenciesList && (
            <div style={{
              background: 'var(--accent-soft, #f0eefd)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent-h, #5b4bd6)',
              marginBottom: '24px',
              display: 'inline-block'
            }}>
              {blockedModalData.dependenciesList}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '8px 28px', fontSize: '0.9rem' }}
              onClick={() => setBlockedModalData(null)}
            >
              OK
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
