import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { IconCalendar } from '../components/Icons';

const today = new Date().toISOString().split('T')[0];

export default function MarkAttendancePage() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState({});

  // Client-side filters for records table
  const [filterSubject, setFilterSubject] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterDate, setFilterDate] = useState(today);

  useEffect(() => { fetchInitial(); }, []);
  useEffect(() => { fetchStudentsForBatch(); }, [selectedBatch]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [assign, att] = await Promise.all([
        api.get('teaching-assignments/'),
        api.get('attendance/'),
      ]);
      setAssignments(assign.data);
      setAllRecords(att.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentsForBatch() {
    if (!selectedBatch) {
      setStudents([]);
      setAttendance({});
      return;
    }
    setStudentsLoading(true);
    setError('');
    try {
      const res = await api.get(`students/?batch=${selectedBatch}`);
      setStudents(res.data);
      const init = {};
      res.data.forEach(s => { init[s.id] = true; });
      setAttendance(init);
    } catch {
      setError('Failed to load students for this batch.');
    } finally {
      setStudentsLoading(false);
    }
  }

  // Options for subject dropdown in form (deduped from assignments)
  const subjectOptions = Array.from(
    new Map(assignments.map(a => [String(a.subject), { id: a.subject, name: a.subject_name }])).values()
  );

  // Options for batch dropdown in form (filtered by currently selected subject)
  const batchOptions = Array.from(
    new Map(
      assignments
        .filter(a => String(a.subject) === String(selectedSubject))
        .map(a => [String(a.batch), { id: a.batch, name: a.batch_name }])
    ).values()
  );

  // Filter options for Records section
  const filterSubjectOptions = Array.from(
    new Map(assignments.map(a => [String(a.subject_name), { id: a.subject, name: a.subject_name }])).values()
  );

  const filterBatchOptions = Array.from(
    new Map(assignments.map(a => [String(a.batch_name), { id: a.batch, name: a.batch_name }])).values()
  );

  function handleSubjectChange(subjectId) {
    setSelectedSubject(subjectId);
    setSelectedBatch('');
    setStudents([]);
    setAttendance({});
  }

  function toggle(id) {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function markAll(val) {
    const updated = {};
    students.forEach(s => { updated[s.id] = val; });
    setAttendance(updated);
  }

  function handleOpenConfirm(e) {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);
    if (!selectedSubject || !selectedBatch) {
      setError('Please select a subject and batch.');
      return;
    }
    if (students.length === 0) {
      setError('No students found in this batch to mark attendance.');
      return;
    }
    setShowConfirmModal(true);
  }

  async function executeSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const records = students.map(s => ({
        student:    s.id,
        subject:    selectedSubject,
        date:       selectedDate,
        is_present: !!attendance[s.id],
      }));
      await api.post('attendance/bulk/', records);

      const selSubjObj = assignments.find(a => String(a.subject) === String(selectedSubject));
      const selBatchObj = assignments.find(a => String(a.batch) === String(selectedBatch));
      const presentCount = records.filter(r => r.is_present).length;
      const absentCount = records.length - presentCount;

      setSuccessInfo({
        subject: selSubjObj ? selSubjObj.subject_name : selectedSubject,
        batch: selBatchObj ? selBatchObj.batch_name : selectedBatch,
        date: selectedDate,
        presentCount,
        absentCount,
      });

      setShowConfirmModal(false);
      const res = await api.get('attendance/');
      setAllRecords(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.detail || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered records for the records table
  const filteredRecords = allRecords.filter(r => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterSubject && r.subject_name !== filterSubject && String(r.subject) !== String(filterSubject)) return false;
    if (filterBatch && r.batch_name !== filterBatch && String(r.batch) !== String(filterBatch)) return false;
    return true;
  });

  // Calculate modal summary numbers
  const selSubjObj = assignments.find(a => String(a.subject) === String(selectedSubject));
  const selBatchObj = assignments.find(a => String(a.batch) === String(selectedBatch));
  const modalSubjectName = selSubjObj ? selSubjObj.subject_name : selectedSubject;
  const modalBatchName = selBatchObj ? selBatchObj.batch_name : selectedBatch;
  const modalTotal = students.length;
  const modalPresent = students.filter(s => !!attendance[s.id]).length;
  const modalAbsent = modalTotal - modalPresent;
  const modalPercentage = modalTotal > 0 ? Math.round((modalPresent / modalTotal) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">Mark Attendance</h1>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Record daily attendance for students.</p>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* Enhanced Success Notification */}
      {successInfo && (
        <div className="attendance-success-card" style={{ marginBottom: '1.5rem' }}>
          <div className="attendance-success-header">
            <div className="attendance-success-icon">✓</div>
            <span className="attendance-success-title">Attendance Saved Successfully</span>
          </div>
          <div className="attendance-success-details">
            <div><strong>Subject:</strong> {successInfo.subject}</div>
            <div><strong>Batch:</strong> {successInfo.batch}</div>
            <div><strong>Date:</strong> {successInfo.date}</div>
            <div><strong>Present:</strong> <span className="badge badge-green" style={{ marginLeft: '4px' }}>{successInfo.presentCount}</span></div>
            <div><strong>Absent:</strong> <span className="badge badge-red" style={{ marginLeft: '4px' }}>{successInfo.absentCount}</span></div>
          </div>
        </div>
      )}

      {/* Attendance Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleOpenConfirm}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <select className="form-select" value={selectedSubject} onChange={e => handleSubjectChange(e.target.value)}>
                <option value="">— Select Subject —</option>
                {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Batch</label>
              <select
                className="form-select"
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                disabled={!selectedSubject}
              >
                <option value="">
                  {selectedSubject ? '— Select Batch —' : 'Select a subject first'}
                </option>
                {batchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAll(true)} disabled={!selectedBatch}>✔ Mark All Present</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAll(false)} disabled={!selectedBatch}>✘ Mark All Absent</button>
          </div>

          {loading || studentsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
              <table className="att-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedBatch ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <div className="empty-icon">🎓</div>
                          <p>Select a subject and batch to load students.</p>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <div className="empty-icon">🎓</div>
                          <p>No students found in this batch.</p>
                        </div>
                      </td>
                    </tr>
                  ) : students.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-3)', fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ color: 'var(--text-2)' }}>{s.roll_no}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!attendance[s.id]}
                          onChange={() => toggle(s.id)}
                          style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: 'var(--accent)', verticalAlign: 'middle' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting || loading || !selectedBatch}>
            Submit Attendance
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Attendance Submission"
        isOpen={showConfirmModal}
        onClose={() => !submitting && setShowConfirmModal(false)}
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Please review the attendance summary before submitting. This action will save today's attendance records.
        </p>

        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Subject</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalSubjectName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Batch</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalBatchName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Date</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{selectedDate}</strong>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Total Students</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalTotal}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Present Students</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalPresent}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Absent Students</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalAbsent}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-2)' }}>Attendance Percentage</span>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{modalPercentage}%</strong>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowConfirmModal(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={executeSubmit}
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : 'Confirm & Submit'}
          </button>
        </div>
      </Modal>

      {/* Records Section Header & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h2 className="page-sub" style={{ margin: 0 }}>Attendance Records</h2>
        
        {/* Lightweight Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            style={{ width: 'auto', minWidth: '150px', padding: '6px 12px', fontSize: '0.825rem' }}
          >
            <option value="">All Subjects</option>
            {filterSubjectOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>

          <select
            className="form-select"
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            style={{ width: 'auto', minWidth: '140px', padding: '6px 12px', fontSize: '0.825rem' }}
          >
            <option value="">All Batches</option>
            {filterBatchOptions.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>

          <input
            type="date"
            className="form-input"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.825rem' }}
          />

          {(filterSubject || filterBatch || filterDate) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterSubject(''); setFilterBatch(''); setFilterDate(''); }}
              style={{ fontSize: '0.78rem', padding: '6px 10px' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table or Centered Empty State */}
      {filteredRecords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'var(--accent-soft)',
            color: 'var(--accent-h)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <IconCalendar width={26} height={26} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
            No attendance records found.
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', maxWidth: '380px', margin: '0 auto' }}>
            Attendance records will appear here after marking attendance.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Student</th>
                <th>Subject</th>
                <th>Batch</th>
                <th>Date</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((a, i) => (
                <tr key={a.id || i}>
                  <td style={{ color: 'var(--text-3)', fontWeight: 500 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{a.student_name}</td>
                  <td>{a.subject_name}</td>
                  <td><span className="badge badge-gray">{a.batch_name}</span></td>
                  <td style={{ color: 'var(--text-2)' }}>{a.date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${a.is_present ? 'badge-green' : 'badge-red'}`}>
                      {a.is_present ? 'Present' : 'Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}