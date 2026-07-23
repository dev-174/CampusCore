import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  IconGraduate, IconTeacher, IconMegaphone, IconFileText, IconWarning,
  IconBuilding, IconCalendar, IconIdCard, IconCheckSq, IconFamily,
} from '../components/Icons';

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div className="skeleton" style={{ height: '32px', width: '280px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '18px', width: '380px' }} />
      </div>
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div className="stat-card" key={i} style={{ minHeight: '132px' }}>
            <div className="skeleton" style={{ height: '40px', width: '40px', borderRadius: '10px', marginBottom: '16px' }} />
            <div className="skeleton" style={{ height: '14px', width: '120px', marginBottom: '10px' }} />
            <div className="skeleton" style={{ height: '28px', width: '80px' }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ maxWidth: '360px', minHeight: '100px' }}>
        <div className="skeleton" style={{ height: '14px', width: '140px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '28px', width: '180px' }} />
      </div>
    </div>
  );
}

// Small colored icon-chip helper — keeps every stat card visually distinct like Mosaic's dashboard
function StatIcon({ icon: Icon, tint }) {
  const tints = {
    violet:  { background: 'var(--accent-soft)', color: 'var(--accent-h)' },
    blue:    { background: '#eaf1ff', color: 'var(--accent-2)' },
    green:   { background: 'var(--success-soft)', color: 'var(--success)' },
    amber:   { background: 'var(--warning-soft)', color: 'var(--warning)' },
    red:     { background: 'var(--danger-soft)', color: 'var(--danger)' },
  };
  return <div className="stat-icon" style={tints[tint] || tints.violet}><Icon width={19} height={19} /></div>;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    setError('');
    try {
      if (user.role === 'admin') {
        const [students, faculty, notices, marks] = await Promise.all([
          api.get('students/'),
          api.get('faculty/'),
          api.get('notices/'),
          api.get('marks/'),
        ]);
        setStats({
          studentCount: students.data.length,
          facultyCount: faculty.data.length,
          noticeCount: notices.data.length,
          marksCount: marks.data.length,
          universityCode: user.university_code || 'N/A',
        });
        try {
          const risk = await api.get('ml/risk-summary/');
          const summary = risk.data?.summary || {};
          const atRiskCount = Object.values(summary).filter(r => r.level === 'high' || r.level === 'medium').length;
          setStats(prev => ({ ...prev, atRiskCount }));
        } catch {
          setStats(prev => ({ ...prev, atRiskCount: null }));
        }
      } else if (user.role === 'faculty') {
        const marks = await api.get('marks/');
        setStats({
          department: user.department || 'N/A',
          marksAdded: marks.data.length,
        });
        try {
          const a = await api.get('ml/my-alerts/');
          setAlerts(a.data?.alerts || []);
        } catch {
          setAlerts([]);
        }
      } else if (user.role === 'student') {
        const [marks, attendance] = await Promise.all([
          api.get('marks/'),
          api.get('attendance/'),
        ]);
        const totalMarks = marks.data.reduce((s, m) => s + (m.max_score > 0 ? (m.score / m.max_score) * 100 : 0), 0);
        const avgMarks = marks.data.length ? (totalMarks / marks.data.length).toFixed(1) : '0.0';
        const presentCount = attendance.data.filter(a => a.is_present).length;
        const attPct = attendance.data.length ? ((presentCount / attendance.data.length) * 100).toFixed(1) : '0.0';
        setStats({
          roll_no: user.roll_no || 'N/A',
          department: user.department || 'N/A',
          batch: user.batch || 'N/A',
          avgMarks,
          attPct,
        });
      } else if (user.role === 'parent') {
        const marks = await api.get('marks/');
        const childMap = {};
        marks.data.forEach(m => {
          const key = m.student_name || m.student;
          if (!childMap[key]) childMap[key] = { total: 0, count: 0 };
          if (m.max_score > 0) {
            childMap[key].total += (m.score / m.max_score) * 100;
            childMap[key].count += 1;
          }
        });
        const children = Object.entries(childMap).map(([name, d]) => ({
          name,
          avg: d.count ? (d.total / d.count).toFixed(1) : '0.0',
        }));
        setStats({ children });
        try {
          const a = await api.get('ml/my-alerts/');
          setAlerts(a.data?.alerts || []);
        } catch {
          setAlerts([]);
        }
      }
    } catch (e) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  function getBadgeClass(pct) {
    const n = parseFloat(pct);
    if (n >= 75) return 'badge badge-green';
    if (n >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  async function markAlertRead(id) {
    try {
      await api.post('ml/my-alerts/', { id });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch {
      // non-critical -- ignore
    }
  }

  function AlertsCard() {
    if (!alerts.length) return null;
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.9rem' }}>
          <IconWarning width={18} height={18} style={{ color: 'var(--warning)' }} />
          <p className="form-label" style={{ margin: 0 }}>Risk Alerts</p>
        </div>
        {alerts.map(a => (
          <div
            key={a.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.6rem 0', borderBottom: '1px solid var(--border-light)',
              opacity: a.is_read ? 0.55 : 1,
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.message}</p>
            {!a.is_read && (
              <button className="btn btn-ghost btn-sm" onClick={() => markAlertRead(a.id)}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{greeting()}, {user.name || user.username}</h1>
          <p className="page-sub">Here's a summary of your university portal.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {user.role === 'admin' && (
            <>
              <div className="stat-grid">
                <div className="stat-card">
                  <StatIcon icon={IconGraduate} tint="violet" />
                  <div className="stat-value">{stats.studentCount}</div>
                  <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card">
                  <StatIcon icon={IconTeacher} tint="blue" />
                  <div className="stat-value">{stats.facultyCount}</div>
                  <div className="stat-label">Total Faculty</div>
                </div>
                <div className="stat-card">
                  <StatIcon icon={IconMegaphone} tint="amber" />
                  <div className="stat-value">{stats.noticeCount}</div>
                  <div className="stat-label">Notices</div>
                </div>
                <div className="stat-card">
                  <StatIcon icon={IconFileText} tint="green" />
                  <div className="stat-value">{stats.marksCount}</div>
                  <div className="stat-label">Mark Entries</div>
                </div>
                <div className="stat-card">
                  <StatIcon icon={IconWarning} tint="red" />
                  <div className="stat-value">
                    {stats.atRiskCount === null || stats.atRiskCount === undefined ? '—' : stats.atRiskCount}
                  </div>
                  <div className="stat-label">Students At Risk</div>
                </div>
              </div>
              <div className="card" style={{ marginTop: '1.5rem', maxWidth: '360px' }}>
                <p className="page-sub" style={{ margin: 0 }}>University Code</p>
                <h2 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                  {stats.universityCode}
                </h2>
              </div>
            </>
          )}

          {user.role === 'faculty' && (
            <>
              <AlertsCard />
              <div className="stat-grid">
                <div className="stat-card">
                  <StatIcon icon={IconBuilding} tint="violet" />
                  <div className="stat-value">{stats.department}</div>
                  <div className="stat-label">Department</div>
                </div>
                <div className="stat-card">
                  <StatIcon icon={IconFileText} tint="green" />
                  <div className="stat-value">{stats.marksAdded}</div>
                  <div className="stat-label">Marks Entries Added</div>
                </div>
              </div>
            </>
          )}

          {user.role === 'student' && (
            <div className="stat-grid">
              <div className="stat-card">
                <StatIcon icon={IconIdCard} tint="violet" />
                <div className="stat-value">{stats.roll_no}</div>
                <div className="stat-label">Roll Number</div>
              </div>
              <div className="stat-card">
                <StatIcon icon={IconBuilding} tint="blue" />
                <div className="stat-value">{stats.department}</div>
                <div className="stat-label">Department</div>
              </div>
              <div className="stat-card">
                <StatIcon icon={IconCalendar} tint="amber" />
                <div className="stat-value">{stats.batch}</div>
                <div className="stat-label">Batch</div>
              </div>
              <div className="stat-card">
                <StatIcon icon={IconFileText} tint="green" />
                <div className="stat-value">
                  <span className={getBadgeClass(stats.avgMarks)}>{stats.avgMarks}%</span>
                </div>
                <div className="stat-label">Avg Marks</div>
              </div>
              <div className="stat-card">
                <StatIcon icon={IconCheckSq} tint="green" />
                <div className="stat-value">
                  <span className={getBadgeClass(stats.attPct)}>{stats.attPct}%</span>
                </div>
                <div className="stat-label">Attendance</div>
              </div>
            </div>
          )}

          {user.role === 'parent' && (
            <>
              <AlertsCard />
              <h2 className="page-sub" style={{ marginBottom: '1rem' }}>Your Children's Overview</h2>
              {stats.children && stats.children.length > 0 ? (
                <div className="stat-grid">
                  {stats.children.map((child, i) => (
                    <div className="stat-card" key={i}>
                      <StatIcon icon={IconFamily} tint="violet" />
                      <div className="stat-value" style={{ fontSize: '1.3rem' }}>{child.name}</div>
                      <div className="stat-label">
                        Avg Marks: <span className={getBadgeClass(child.avg)}>{child.avg}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <IconFamily width={32} height={32} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
                  <p>No children data found.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}