import { useEffect, useState } from 'react';
import api from '../api/axios';
import { downloadPdf } from '../utils/downloadPdf';
export default function ChildMarksPage() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
const [downloadingId, setDownloadingId] = useState(null);

async function handleDownloadReport(childId, childName) {
  setDownloadingId(childId);
  setError('');
  try {
    const safeName = (childName || 'child').replace(/\s+/g, '_');
    await downloadPdf(`reports/student/${childId}/pdf/`, `${safeName}_report_card.pdf`);
  } catch {
    setError('Failed to generate report. Please try again.');
  } finally {
    setDownloadingId(null);
  }
}
  useEffect(() => { fetchMarks(); }, []);

  async function fetchMarks() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('marks/');
      setMarks(res.data);
    } catch {
      setError('Failed to load marks.');
    } finally {
      setLoading(false);
    }
  }

  const exams = [...new Set(marks.map(m => m.exam_title || m.exam).filter(Boolean))];
  const subjects = [...new Set(marks.map(m => m.subject_name || m.subject).filter(Boolean))];


  const children = Object.values(
  marks.reduce((acc, m) => {
    if (m.student && !acc[m.student]) acc[m.student] = { id: m.student, name: m.student_name || `Student #${m.student}` };
    return acc;
  }, {})
);


  const filtered = marks.filter(m => {
    const examMatch = !filterExam || (m.exam_title || m.exam) === filterExam;
    const subjectMatch = !filterSubject || (m.subject_name || m.subject) === filterSubject;
    return examMatch && subjectMatch;
  });

  function pct(score, max) {
    if (!max || max === 0) return null;
    return (score / max) * 100;
  }

  function pctStr(score, max) {
    const p = pct(score, max);
    return p !== null ? p.toFixed(1) + '%' : '—';
  }

  function pctBadge(score, max) {
    const p = pct(score, max);
    if (p === null) return 'badge badge-gray';
    if (p >= 75) return 'badge badge-green';
    if (p >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  const validMarks = filtered.filter(m => m.max_score > 0);
  const avgPct = validMarks.length
    ? (validMarks.reduce((s, m) => s + (m.score / m.max_score) * 100, 0) / validMarks.length).toFixed(1)
    : null;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
  <div>
    <h1 className="page-title">Child's Marks</h1>
    <p className="page-sub">View your child's academic performance.</p>
  </div>
  {children.length > 0 && (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {children.map(c => (
        <button
          key={c.id}
          className="btn btn-primary"
          onClick={() => handleDownloadReport(c.id, c.name)}
          disabled={downloadingId === c.id}
        >
          {downloadingId === c.id ? <span className="spinner" /> : `⬇ Report — ${c.name}`}
        </button>
      ))}
    </div>
  )}
</div>
<div style={{ marginBottom: '1.25rem' }} />

      {error && <div className="alert alert-error">{error}</div>}

      {avgPct !== null && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--accent)' }}>{avgPct}%</div>
          <div>
            <div style={{ fontWeight: 600 }}>Overall Average</div>
            <div style={{ opacity: 0.6, fontSize: '0.875rem' }}>Across {validMarks.length} recorded mark(s)</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
          <label className="form-label">Filter by Exam</label>
          <select className="form-select" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
            <option value="">All Exams</option>
            {exams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
          <label className="form-label">Filter by Subject</label>
          <select className="form-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Exam</th>
              <th>Score</th>
              <th>Max</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon">📊</div>
                    <p>No marks found for the selected filters.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((m, i) => (
              <tr key={m.id || i}>
                <td>{i + 1}</td>
                <td>{m.student_name || m.student || '—'}</td>
                <td>{m.subject_name || m.subject || '—'}</td>
                <td>{m.exam_title || m.exam || '—'}</td>
                <td>{m.score}</td>
                <td>{m.max_score}</td>
                <td><span className={pctBadge(m.score, m.max_score)}>{pctStr(m.score, m.max_score)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
