import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function AnalyticsPage() {
  const [summaryRecords, setSummaryRecords] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [outliers, setOutliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [sum, att, out] = await Promise.all([
        api.get('analytics/summary/'),     // baseURL already includes /api/
        api.get('analytics/attendance/'),
        api.get('analytics/outliers/'),
      ]);
      // Backend returns a plain array of records: [{ subject__name, mean, std, ... }, ...]
      setSummaryRecords(Array.isArray(sum.data) ? sum.data : []);
      setAttendanceData(Array.isArray(att.data) ? att.data : []);
      setOutliers(Array.isArray(out.data) ? out.data : []);
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }

  // ── Marks chart: backend sends { subject__name, mean, std, min, max, count } per row
  const marksChartData = summaryRecords.map(row => ({
    subject: (row['subject__name'] || 'Unknown').length > 12
      ? (row['subject__name'] || 'Unknown').slice(0, 12) + '…'
      : (row['subject__name'] || 'Unknown'),
    avg: parseFloat(row.mean ?? 0).toFixed(1),
  }));

  // ── Attendance chart: backend sends { student__roll_no, student__user__first_name, attendance_% }
  const attChartData = [...attendanceData]
    .sort((a, b) => parseFloat(b['attendance_%'] || 0) - parseFloat(a['attendance_%'] || 0))
    .slice(0, 10)
    .map(a => ({
      name: (a['student__user__first_name'] || a['student__roll_no'] || 'Student').slice(0, 10),
      pct: parseFloat(a['attendance_%'] || 0).toFixed(1),
    }));

  function outlierBadge(avg) {
    const n = parseFloat(avg);
    if (n >= 75) return 'badge badge-green';
    if (n >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  const chartStyle = {
    fontSize: '0.75rem',
    fill: '#475569',
  };

  return (
    <div>
      <h1 className="page-title">Analytics</h1>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Academic performance insights and trends.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Marks per Subject Chart */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 className="page-sub" style={{ marginBottom: '1rem', fontWeight: 600 }}>Average Marks per Subject</h2>
            {marksChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={marksChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="subject" tick={chartStyle} />
                  <YAxis domain={[0, 100]} tick={chartStyle} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#0f172a' }}
                    labelStyle={{ color: '#475569', fontWeight: 600 }}
                    formatter={v => [`${v}%`, 'Avg Marks']}
                  />
                  <Bar dataKey="avg" fill="var(--accent, #6366f1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                <div className="empty-icon">📊</div>
                <p>No subject marks data available.</p>
              </div>
            )}
          </div>

          {/* Attendance per Student Chart */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 className="page-sub" style={{ marginBottom: '1rem', fontWeight: 600 }}>Attendance % — Top 10 Students</h2>
            {attChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={attChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={chartStyle} />
                  <YAxis domain={[0, 100]} tick={chartStyle} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#0f172a' }}
                    labelStyle={{ color: '#475569', fontWeight: 600 }}
                    formatter={v => [`${v}%`, 'Attendance']}
                  />
                  <Bar dataKey="pct" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                <div className="empty-icon">📅</div>
                <p>No attendance data available.</p>
              </div>
            )}
          </div>

          {/* Outliers Table */}
          <h2 className="page-sub" style={{ marginBottom: '0.75rem' }}>Performance Outliers</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Enrollment No</th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {outliers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">
                        <div className="empty-icon">🔍</div>
                        <p>No outliers detected.</p>
                      </div>
                    </td>
                  </tr>
                ) : outliers.map((o, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ color: o.enrollment_number ? 'var(--text-1)' : 'var(--text-3)', fontStyle: o.enrollment_number ? 'normal' : 'italic' }}>
                      {o.enrollment_number && String(o.enrollment_number).trim() ? o.enrollment_number : 'Not Assigned'}
                    </td>
                    <td>{o.roll_no}</td>
                    <td>{o.name}</td>
                    {/* Backend key: avg_% */}
                    <td><span className={outlierBadge(o['avg_%'])}>{parseFloat(o['avg_%'] || 0).toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
