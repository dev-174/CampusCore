import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AddMarksPage() {
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state — subject and max_score are read-only, derived from exam
  const [form, setForm] = useState({
    student:   '',
    exam:      '',
    score:     '',
    // display-only (auto-filled):
    _subject_name: '',
    _max_score:    '',
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [s, e, m] = await Promise.all([
        api.get('students/'),
        api.get('exams/'),
        api.get('marks/'),
      ]);
      setStudents(s.data);
      setExams(e.data);
      setMarks(m.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  // When exam changes: auto-fill subject name and max_score from exam object
  function handleExamChange(examId) {
    const selected = exams.find(e => String(e.id) === String(examId));
    setForm(prev => ({
      ...prev,
      exam:          examId,
      score:         '',
      _subject_name: selected?.subject_name || (selected ? '(no subject set)' : ''),
      _max_score:    selected ? String(selected.max_score ?? 100) : '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.student || !form.exam || form.score === '') {
      setError('Please fill in all fields.');
      return;
    }
    const selectedExam = exams.find(ex => String(ex.id) === String(form.exam));
    const maxScore = selectedExam?.max_score ?? 100;
    if (parseFloat(form.score) > maxScore) {
      setError(`Score cannot exceed max score (${maxScore}) for this exam.`);
      return;
    }
    setSaving(true);
    try {
      await api.post('marks/', {
        student: form.student,
        exam:    form.exam,
        // subject and max_score are enforced by the backend from the exam
        subject: selectedExam?.subject ?? null,
        score:   parseFloat(form.score),
      });
      setSuccess('Marks added successfully!');
      setForm({ student: '', exam: '', score: '', _subject_name: '', _max_score: '' });
      const res = await api.get('marks/');
      setMarks(res.data);
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d : (d?.score || d?.detail || d?.exam || JSON.stringify(d));
      setError(msg || 'Failed to add marks.');
    } finally {
      setSaving(false);
    }
  }

  function getStudentName(id) {
    return students.find(s => String(s.id) === String(id))?.name || id || '—';
  }
  function getExamById(id) {
    return exams.find(e => String(e.id) === String(id));
  }

  function pct(score, max) {
    if (!max || max === 0) return '—';
    return ((score / max) * 100).toFixed(1) + '%';
  }
  function pctBadge(score, max) {
    if (!max) return 'badge badge-gray';
    const p = (score / max) * 100;
    if (p >= 75) return 'badge badge-green';
    if (p >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  const selectedExamObj = form.exam ? getExamById(form.exam) : null;

  // Group marks by exam for display
  const marksByExam = marks.reduce((acc, m) => {
    const key = String(m.exam);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const examGroups = Object.entries(marksByExam).sort(([aId], [bId]) => {
    const ea = getExamById(aId);
    const eb = getExamById(bId);
    return (eb?.date || '') > (ea?.date || '') ? 1 : -1;
  });

  return (
    <div>
      <h1 className="page-title">Add Marks</h1>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>
        Select an exam — subject and max score are set by the admin.
      </p>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-ok">{success}</div>}

      {/* ── Entry Form ── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>

            {/* 1. Exam — pick first so subject/max auto-fill */}
            <div className="form-group">
              <label className="form-label">Exam</label>
              <select
                className="form-select"
                value={form.exam}
                onChange={e => handleExamChange(e.target.value)}
              >
                <option value="">— Select Exam —</option>
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} · {ex.exam_type} · {ex.max_score ?? 100} pts
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subject — read-only, auto-filled from exam */}
            <div className="form-group">
              <label className="form-label">
                Subject
                <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  (from exam)
                </span>
              </label>
              <input
                className="form-input"
                value={form._subject_name}
                readOnly
                placeholder="Select an exam first"
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            {/* 3. Student */}
            <div className="form-group">
              <label className="form-label">Student</label>
              <select
                className="form-select"
                value={form.student}
                onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
              >
                <option value="">— Select Student —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>
                ))}
              </select>
            </div>

            {/* 4. Score */}
            <div className="form-group">
              <label className="form-label">
                Score
                {form._max_score && (
                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    (out of {form._max_score})
                  </span>
                )}
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.5"
                max={form._max_score || undefined}
                value={form.score}
                onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                placeholder={form._max_score ? `0 – ${form._max_score}` : 'e.g. 78'}
              />
            </div>

            {/* 5. Max Score — read-only */}
            <div className="form-group">
              <label className="form-label">
                Max Score
                <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  (set by admin)
                </span>
              </label>
              <input
                className="form-input"
                value={form._max_score}
                readOnly
                placeholder="Select an exam first"
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Exam summary chip */}
          {selectedExamObj && (
            <div style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap',
              alignItems: 'center', margin: '0.5rem 0 1rem',
              padding: '8px 12px',
              background: 'rgba(99,102,241,0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Exam:</span>
              <strong style={{ fontSize: '0.85rem' }}>{selectedExamObj.title}</strong>
              <span className={`badge ${
                selectedExamObj.exam_type === 'final' ? 'badge-red'
                : selectedExamObj.exam_type === 'midterm' ? 'badge-yellow' : 'badge-blue'
              }`}>{selectedExamObj.exam_type}</span>
              {selectedExamObj.subject_name && (
                <span className="badge badge-green">{selectedExamObj.subject_name}</span>
              )}
              {selectedExamObj.date && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>📅 {selectedExamObj.date}</span>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving || loading}>
            {saving ? <span className="spinner" /> : 'Submit Marks'}
          </button>
        </form>
      </div>

      {/* ── Marks Table — grouped by exam ── */}
      <h2 className="page-sub" style={{ marginBottom: '1rem' }}>Marks Record</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
      ) : examGroups.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <p>No marks recorded yet.</p>
        </div>
      ) : (
        examGroups.map(([examId, examMarks]) => {
          const exam      = getExamById(examId);
          const examTitle = exam?.title || `Exam #${examId}`;
          const examType  = exam?.exam_type || '';
          const examDate  = exam?.date || '';
          const maxScore  = exam?.max_score ?? 100;
          const subName   = exam?.subject_name || '';

          return (
            <div key={examId} style={{ marginBottom: '2rem' }}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                padding: '10px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px 10px 0 0',
                borderBottom: 'none',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{examTitle}</span>
                <span className={`badge ${
                  examType === 'final' ? 'badge-red' : examType === 'midterm' ? 'badge-yellow' : 'badge-blue'
                }`}>{examType}</span>
                {subName && <span className="badge badge-green">{subName}</span>}
                <span className="badge badge-blue">{maxScore} pts</span>
                {examDate && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>📅 {examDate}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                  {examMarks.length} student{examMarks.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="table-wrap" style={{ borderRadius: '0 0 10px 10px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Score</th>
                      <th>Max</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examMarks.map((m, i) => (
                      <tr key={m.id}>
                        <td>{i + 1}</td>
                        <td>{m.student_name || getStudentName(m.student)}</td>
                        <td>
                          <span className="badge badge-gray">{m.roll_no || '—'}</span>
                        </td>
                        <td>{m.score}</td>
                        <td>{m.max_score}</td>
                        <td>
                          <span className={pctBadge(m.score, m.max_score)}>
                            {pct(m.score, m.max_score)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
