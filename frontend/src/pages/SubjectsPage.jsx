import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', department: '', faculty: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // For assigning faculty to an existing subject
  const [assignTarget, setAssignTarget] = useState(null);  // subject object
  const [assignFaculty, setAssignFaculty] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [s, d, f] = await Promise.all([
        api.get('subjects/'),
        api.get('departments/'),
        api.get('faculty/'),
      ]);
      setSubjects(s.data);
      setDepartments(d.data);
      setFacultyList(f.data);
    } catch {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }

  function getDeptName(id) {
    return departments.find(d => String(d.id) === String(id))?.name || id || '—';
  }

  // Faculty members filtered to the selected department in the add form
  const filteredFaculty = form.department
    ? facultyList.filter(f => String(f.department) === String(form.department))
    : facultyList;

  // How many subjects each faculty member currently teaches -- used to
  // recommend the least-loaded person first instead of a plain A-Z list.
  function workloadCount(facultyId) {
    return subjects.filter(s => String(s.faculty) === String(facultyId)).length;
  }
  function sortByWorkload(list) {
    return [...list].sort((a, b) => workloadCount(a.id) - workloadCount(b.id));
  }
  const filteredFacultySorted = sortByWorkload(filteredFaculty);

  async function handleAdd(e) {
    e.preventDefault();
    const codeClean = form.code.trim();
    if (!form.name.trim() || !codeClean) {
      setFormError('Subject name and code are required.');
      return;
    }

    // Optional frontend check for better UX
    const isDuplicate = subjects.some(
      s => s.code && s.code.trim().toLowerCase() === codeClean.toLowerCase()
    );
    if (isDuplicate) {
      setFormError(`This subject code '${codeClean}' is already in use. Please enter a unique code.`);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: codeClean,
        department: form.department || null,
        faculty: form.faculty || null,
      };
      await api.post('subjects/', payload);
      setShowAdd(false);
      setForm({ name: '', code: '', department: '', faculty: '' });
      fetchAll();
    } catch (e) {
      const data = e.response?.data;
      let errMsg = 'Failed to add subject.';
      if (typeof data?.detail === 'string') {
        errMsg = data.detail;
      } else if (typeof data?.code === 'string') {
        errMsg = data.code;
      } else if (Array.isArray(data?.code) && data.code.length > 0) {
        errMsg = data.code[0];
      } else if (typeof data?.error === 'string') {
        errMsg = data.error;
      }
      setFormError(errMsg);
    } finally {
      setSaving(false);
    }
  }

  function openAssign(subject) {
    setAssignTarget(subject);
    setAssignFaculty(subject.faculty ? String(subject.faculty) : '');
    setAssignError('');
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssigning(true);
    setAssignError('');
    try {
      await api.patch(`subjects/${assignTarget.id}/`, {
        faculty: assignFaculty || null,
      });
      setAssignTarget(null);
      fetchAll();
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Failed to update assignment.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`subjects/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch (e) {
      const serverMsg = e.response?.data?.detail || e.response?.data?.error || 'Failed to delete subject.';
      setError(serverMsg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // Faculty available for the assign modal (same dept as subject), lightest
  // workload first -- the top of the list is the recommended pick.
  const assignableFaculty = assignTarget
    ? sortByWorkload(facultyList.filter(f => String(f.department) === String(assignTarget.department)))
    : [];

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-sub">Manage subjects and assign faculty members.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + Add Subject
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Assigned Faculty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <div className="empty-icon">📚</div>
                    <p>No subjects found. Add one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : subjects.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td><span className="badge badge-blue">{s.code || '—'}</span></td>
                <td>{s.name}</td>
                <td>{getDeptName(s.department)}</td>
                <td>
                  {s.faculty_name
                    ? <span className="badge badge-green">{s.faculty_name}</span>
                    : <span className="badge badge-gray">Unassigned</span>}
                </td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openAssign(s)}
                  >
                    Assign Faculty
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Subject Modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Subject">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value, faculty: '' })}
            >
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Data Structures"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input
              className="form-input"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. CS301"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assign Faculty <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
            <select
              className="form-select"
              value={form.faculty}
              onChange={e => setForm({ ...form, faculty: e.target.value })}
            >
              <option value="">— None —</option>
              {filteredFacultySorted.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({workloadCount(f.id)} subject{workloadCount(f.id) === 1 ? '' : 's'})</option>
              ))}
            </select>
            {form.department && filteredFaculty.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                No faculty in this department yet.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Assign Faculty Modal ── */}
      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign Faculty — ${assignTarget?.name}`}>
        <form onSubmit={handleAssign}>
          {assignError && <div className="alert alert-error">{assignError}</div>}
          <div className="form-group">
            <label className="form-label">Faculty Member</label>
            <select
              className="form-select"
              value={assignFaculty}
              onChange={e => setAssignFaculty(e.target.value)}
            >
              <option value="">— Unassign / None —</option>
              {assignableFaculty.map((f, i) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({workloadCount(f.id)} subject{workloadCount(f.id) === 1 ? '' : 's'}){i === 0 ? ' — lightest load' : ''}
                </option>
              ))}
            </select>
            {assignTarget && assignableFaculty.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                No faculty in this department yet. Add faculty first.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setAssignTarget(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={assigning}>
              {assigning ? <span className="spinner" /> : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Delete subject <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?</p>
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