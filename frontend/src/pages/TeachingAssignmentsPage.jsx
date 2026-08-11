import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { IconTeacher } from '../components/Icons';


// This page is the real fix for "faculty access should be per-batch, not
// per-department". Each row here is one (subject, batch) -> faculty link.
// The same subject can appear multiple times with a different faculty per
// batch, e.g. DM/A1 -> Faculty X and DM/A3 -> Faculty Y.
export default function TeachingAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ department: '', subject: '', batch: '', faculty: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState(null); // assignment row being reassigned
  const [editFaculty, setEditFaculty] = useState('');
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [ta, s, b, d, f] = await Promise.all([
        api.get('teaching-assignments/'),
        api.get('subjects/'),
        api.get('batches/'),
        api.get('departments/'),
        api.get('faculty/'),
      ]);
      setAssignments(ta.data);
      setSubjects(s.data);
      setBatches(b.data);
      setDepartments(d.data);
      setFacultyList(f.data);
    } catch {
      setError('Failed to load teaching assignments.');
    } finally {
      setLoading(false);
    }
  }

  function getDeptName(id) {
    return departments.find(d => String(d.id) === String(id))?.name || '—';
  }

  // Subjects / batches filtered to the department chosen in the Add form
  const subjectsInDept = form.department
    ? subjects.filter(s => String(s.department) === String(form.department))
    : [];
  const batchesInDept = form.department
    ? batches.filter(b => String(b.department) === String(form.department))
    : [];
  const selectedSubjectObj = form.subject
    ? subjects.find(s => String(s.id) === String(form.subject))
    : null;

  // Filter faculty for the form:
  // If the selected subject has an assigned faculty, ONLY show that assigned teacher in the dropdown.
  // Otherwise, show all faculty members in the selected department.
  const facultyInDept = form.department
    ? (selectedSubjectObj?.faculty
        ? facultyList.filter(f => String(f.id) === String(selectedSubjectObj.faculty))
        : facultyList.filter(f => String(f.department) === String(form.department)))
    : [];

  function handleSubjectChange(subjectId) {
    const sub = subjects.find(s => String(s.id) === String(subjectId));
    setForm(prev => ({
      ...prev,
      subject: subjectId,
      faculty: sub?.faculty ? String(sub.faculty) : '',
    }));
  }

  // A subject+batch pair that already has an assignment can't be added again
  // (the backend enforces this too via unique_together, but catching it in
  // the UI gives a nicer error before the round trip).
  const pairTaken = (subjectId, batchId) =>
    assignments.some(a => String(a.subject) === String(subjectId) && String(a.batch) === String(batchId));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.subject || !form.batch || !form.faculty) {
      setFormError('Subject, batch, and faculty are all required.');
      return;
    }
    if (pairTaken(form.subject, form.batch)) {
      setFormError('This subject already has a faculty assigned for this batch. Edit the existing row instead.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('teaching-assignments/', {
        subject: form.subject,
        batch: form.batch,
        faculty: form.faculty,
      });
      setShowAdd(false);
      setForm({ department: '', subject: '', batch: '', faculty: '' });
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(a) {
    setEditTarget(a);
    setEditFaculty(String(a.faculty));
    setEditError('');
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditing(true);
    setEditError('');
    try {
      await api.patch(`teaching-assignments/${editTarget.id}/`, { faculty: editFaculty });
      setEditTarget(null);
      fetchAll();
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update assignment.');
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`teaching-assignments/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to remove assignment.');
    } finally {
      setDeleting(false);
    }
  }

  // Faculty options for the edit modal: same department as the row being edited
  const editableFaculty = editTarget
    ? facultyList.filter(f => String(f.department) === String(editTarget.department))
    : [];

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Teaching Assignments</h1>
          <p className="page-sub" style={{ maxWidth: '560px', marginTop: '0.35rem' }}>
            Assign faculty to subjects and batches. Faculty assignments can vary between batches.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
          + New Assignment
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Department</th>
              <th>Subject</th>
              <th>Batch</th>
              <th>Faculty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    marginBottom: '1rem'
                  }}>
                    <IconTeacher width={26} height={26} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.35rem 0' }}>
                    No teaching assignments yet
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', margin: '0 0 1.25rem 0' }}>
                    Create your first assignment to get started.
                  </p>
                  <button
                    className="btn btn-ghost"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--accent-h)',
                      background: 'var(--surface)',
                      fontWeight: 600,
                      padding: '8px 18px',
                      borderRadius: '8px'
                    }}
                    onClick={() => { setShowAdd(true); setFormError(''); }}
                  >
                    Create Assignment
                  </button>
                </td>
              </tr>

            ) : assignments.map((a, i) => (
              <tr key={a.id}>
                <td>{i + 1}</td>
                <td>{getDeptName(a.department)}</td>
                <td><span className="badge badge-blue">{a.subject_name}</span></td>
                <td><span className="badge badge-gray">{a.batch_name}</span></td>
                <td><span className="badge badge-green">{a.faculty_name}</span></td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Reassign</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(a)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Assignment Modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Teaching Assignment">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value, subject: '', batch: '', faculty: '' })}
            >
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <select
              className="form-select"
              value={form.subject}
              onChange={e => handleSubjectChange(e.target.value)}
              disabled={!form.department}
            >
              <option value="">— Select Subject —</option>
              {subjectsInDept.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            {form.department && subjectsInDept.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                No subjects in this department yet.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Batch</label>
            <select
              className="form-select"
              value={form.batch}
              onChange={e => setForm({ ...form, batch: e.target.value })}
              disabled={!form.department}
            >
              <option value="">— Select Batch —</option>
              {batchesInDept.map(b => (
                <option key={b.id} value={b.id} disabled={pairTaken(form.subject, b.id)}>
                  {b.name}{pairTaken(form.subject, b.id) ? ' (already assigned)' : ''}
                </option>
              ))}
            </select>
            {form.department && batchesInDept.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                No batches in this department yet.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Faculty</label>
            <select
              className="form-select"
              value={form.faculty}
              onChange={e => setForm({ ...form, faculty: e.target.value })}
              disabled={!form.department}
            >
              <option value="">— Select Faculty —</option>
              {facultyInDept.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {form.department && facultyInDept.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                No faculty in this department yet. Add faculty first.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Reassign Faculty Modal ── */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Reassign — ${editTarget?.subject_name} / ${editTarget?.batch_name}`}
      >
        <form onSubmit={handleEdit}>
          {editError && <div className="alert alert-error">{editError}</div>}
          <div className="form-group">
            <label className="form-label">Faculty Member</label>
            <select className="form-select" value={editFaculty} onChange={e => setEditFaculty(e.target.value)}>
              {editableFaculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={editing}>
              {editing ? <span className="spinner" /> : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Assignment">
        <p>
          Remove <strong>{deleteTarget?.faculty_name}</strong> as the teacher of{' '}
          <strong>{deleteTarget?.subject_name}</strong> for batch <strong>{deleteTarget?.batch_name}</strong>?
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
          They will immediately lose access to marks/attendance for this batch+subject.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Remove'}
          </button>
        </div>
      </Modal>
    </div>
  );
}