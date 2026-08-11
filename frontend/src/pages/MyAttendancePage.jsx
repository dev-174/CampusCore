import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function MyAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAttendance(); }, []);

  async function fetchAttendance() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('attendance/');
      setAttendance(res.data);
    } catch {
      setError('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  // Group by subject to compute per-subject %
  const subjectMap = {};
  attendance.forEach(a => {
    const key = a.subject_name || a.subject || 'Unknown';
    if (!subjectMap[key]) subjectMap[key] = { total: 0, present: 0 };
    subjectMap[key].total += 1;
    if (a.is_present) subjectMap[key].present += 1;
  });

  const subjectStats = Object.entries(subjectMap).map(([name, d]) => ({
    name,
    pct: d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : '0.0',
    present: d.present,
    total: d.total,
  }));

  function badgeClass(pct) {
    const n = parseFloat(pct);
    if (n >= 75) return 'badge badge-green';
    if (n >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  return (
    <div>
      <h1 className="page-title">My Attendance</h1>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Track your class attendance record.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Per-subject attendance summary */}
      {!loading && subjectStats.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="page-sub" style={{ marginBottom: '0.75rem' }}>Attendance by Subject</h2>
          <div className="stat-grid">
            {subjectStats.map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-icon">📖</div>
                <div className="stat-value">
                  <span className={badgeClass(s.pct)}>{s.pct}%</span>
                </div>
                <div className="stat-label">{s.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                  {s.present}/{s.total} classes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="page-sub" style={{ marginBottom: '0.75rem' }}>Detailed Records</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : attendance.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <div className="empty-icon">✅</div>
                    <p>No attendance records found.</p>
                  </div>
                </td>
              </tr>
            ) : attendance.map((a, i) => (
              <tr key={a.id || i}>
                <td>{i + 1}</td>
                <td>{a.subject_name || a.subject || '—'}</td>
                <td>{a.date}</td>
                <td>
                  <span className={`badge ${a.is_present ? 'badge-green' : 'badge-red'}`}>
                    {a.is_present ? 'Present' : 'Absent'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
