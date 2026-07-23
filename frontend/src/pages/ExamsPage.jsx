import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';

const EXAM_TYPES = ['internal', 'midterm', 'final'];

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '', exam_type: 'internal', date: '',
    department: '', subject: '', max_score: '100',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [e, d, s] = await Promise.all([
        api.get('exams/'),
        api.get('departments/'),
        api.get('subjects/'),
      ]);
      setExams(e.data);
      setDepartments(d.data);
      setSubjects(s.data);
    } catch {
      setError('Failed to load exams.');
    } finally {
      setLoading(false);
    }
  }

  function getDeptName(id) {
    if (!id) return '—';
    return departments.find(d => String(d.id) === String(id))?.name || '—';
  }

  function typeBadge(type) {
    const map = { internal: 'badge-blue', midterm: 'badge-yellow', final: 'badge-red' };
    return `badge ${map[type] || 'badge-gray'}`;
  }

  // When department changes, clear subject selection
  function handleDeptChange(deptId) {
    setForm(f => ({ ...f, department: deptId, subject: '' }));
  }

  // Subjects filtered to selected department
  const filteredSubjects = form.department
    ? subjects.filter(s => String(s.department) === String(form.department))
    : subjects;

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Exam title is required.'); return; }
    if (!form.subject)      { setFormError('Please select a subject for this exam.'); return; }
    if (!form.max_score || parseFloat(form.max_score) <= 0) {
      setFormError('Max score must be greater than 0.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('exams/', {
        title:      form.title,
        exam_type:  form.exam_type,
        date:       form.date || null,
        max_score:  parseFloat(form.max_score),
        subject:    form.subject,
        department: form.department || null,
      });
      setShowAdd(false);
      setForm({ title: '', exam_type: 'internal', date: '', department: '', subject: '', max_score: '100' });
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to add exam.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`exams/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete exam.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="page-sub">Create exams, set the subject and max marks for each.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + Add Exam
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Max Score</th>
              <th>Date</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : exams.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <p>No exams scheduled yet. Add one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : exams.map((ex, i) => (
              <tr key={ex.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{ex.title}</td>
                <td><span className={typeBadge(ex.exam_type)}>{ex.exam_type}</span></td>
                <td>
                  {ex.subject_name
                    ? <span className="badge badge-green">{ex.subject_name}</span>
                    : <span className="badge badge-gray">—</span>}
                </td>
                <td>
                  <span className="badge badge-blue" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {ex.max_score ?? 100} pts
                  </span>
                </td>
                <td>{ex.date || '—'}</td>
                <td>{getDeptName(ex.department)}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ex)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Exam Modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Exam">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-group">
            <label className="form-label">Exam Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Unit Test 1"
            />
          </div>

          {/* Department → filters subject list */}
          <div className="form-group">
            <label className="form-label">
              Department <span style={{ opacity: 0.5 }}>(optional — filters subject list)</span>
            </label>
            <select
              className="form-select"
              value={form.department}
              onChange={e => handleDeptChange(e.target.value)}
            >
              <option value="">— All Departments —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Subject — required */}
          <div className="form-group">
            <label className="form-label">
              Subject <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
            </label>
            <select
              className="form-select"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            >
              <option value="">— Select Subject —</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code || 'no code'})</option>
              ))}
            </select>
            {form.department && filteredSubjects.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                No subjects in this department yet. Add subjects first.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Exam Type</label>
              <select
                className="form-select"
                value={form.exam_type}
                onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}
              >
                {EXAM_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Max Score <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
              </label>
              <input
                className="form-input"
                type="number"
                min="1"
                step="0.5"
                value={form.max_score}
                onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Delete exam <strong>{deleteTarget?.title}</strong>?
          {deleteTarget?.subject_name && (
            <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}> ({deleteTarget.subject_name})</span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
