import { useEffect, useState } from 'react';
import api from '../api/axios';
import { IconSearch } from '../components/Icons';

export default function MLPage() {
  const [atRisk, setAtRisk] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [modelAccuracy, setModelAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [risk, pred] = await Promise.all([
        api.get('ml/at-risk/'),
        api.get('ml/predict-score/'),
      ]);

      setAtRisk(
        Array.isArray(risk.data)
          ? risk.data
          : (risk.data.at_risk_students || []),
      );
      setModelAccuracy(risk.data?.accuracy ?? null);

      setPredictions(
        Array.isArray(pred.data)
          ? pred.data
          : (pred.data.predictions || []),
      );
    } catch {
      setError('Failed to load risk forecast data. Ensure student attendance and exam records are initialized.');
    } finally {
      setLoading(false);
    }
  }

  function riskBadge(pct) {
    const n = parseFloat(pct);
    if (n >= 70) return 'badge badge-red';
    if (n >= 40) return 'badge badge-yellow';
    return 'badge badge-green';
  }

  function marksBadge(pct) {
    const n = parseFloat(pct);
    if (n >= 75) return 'badge badge-green';
    if (n >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  function getRiskFactors(student) {
    const factors = [];
    const att = parseFloat(student['attendance_%'] || 0);
    const marks = parseFloat(student['avg_marks_%'] || 0);
    const trend = parseFloat(student.trend_slope || 0);

    if (att < 60) {
      factors.push({ label: `Critical Attendance (${att.toFixed(1)}%)`, cls: 'badge badge-red' });
    } else if (att < 75) {
      factors.push({ label: `Low Attendance (${att.toFixed(1)}%)`, cls: 'badge badge-yellow' });
    }

    if (marks < 40) {
      factors.push({ label: `Failing Marks Avg (${marks.toFixed(1)}%)`, cls: 'badge badge-red' });
    } else if (marks < 50) {
      factors.push({ label: `Low Marks Avg (${marks.toFixed(1)}%)`, cls: 'badge badge-yellow' });
    }

    if (trend < -1.0) {
      factors.push({ label: `Declining Performance`, cls: 'badge badge-red' });
    } else if (trend < 0) {
      factors.push({ label: `Slight Grade Decline`, cls: 'badge badge-yellow' });
    }

    if (factors.length === 0) {
      factors.push({ label: `Borderline Performance`, cls: 'badge badge-yellow' });
    }
    return factors;
  }

  function getExpectedStatus(predictedPct) {
    const n = parseFloat(predictedPct || 0);
    if (n >= 50) return { label: 'On Track (Pass)', badge: 'badge badge-green' };
    if (n >= 40) return { label: 'Borderline', badge: 'badge badge-yellow' };
    return { label: 'High Risk (Fail)', badge: 'badge badge-red' };
  }

  // Filter At-Risk students based on search query & risk filter dropdown
  const filteredAtRisk = atRisk.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.roll_no || '').toLowerCase().includes(q) ||
      (s.enrollment_number || '').toLowerCase().includes(q);

    const riskPct = parseFloat(s['risk_%'] || 0);
    let matchesRisk = true;
    if (riskFilter === 'high') matchesRisk = riskPct >= 70;
    else if (riskFilter === 'moderate') matchesRisk = riskPct >= 40 && riskPct < 70;

    return matchesSearch && matchesRisk;
  });

  // Filter predictions table based on search query
  const filteredPredictions = predictions.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.roll_no || '').toLowerCase().includes(q) ||
      (p.enrollment_number || '').toLowerCase().includes(q)
    );
  });

  const highRiskCount = atRisk.filter(s => parseFloat(s['risk_%'] || 0) >= 70).length;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Academic Early Warning & Score Forecast</h1>
        <p className="page-sub">
          Automated student risk monitoring, academic failure detection, and end-semester score projections.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-value">
                <span className={highRiskCount > 0 ? 'badge badge-red' : 'badge badge-green'} style={{ fontSize: '1.4rem', padding: '0.4rem 0.8rem' }}>
                  {highRiskCount}
                </span>
              </div>
              <div className="stat-label">Critical At-Risk (≥70% Risk)</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-value">
                <span className={atRisk.length > 0 ? 'badge badge-yellow' : 'badge badge-green'} style={{ fontSize: '1.4rem', padding: '0.4rem 0.8rem' }}>
                  {atRisk.length}
                </span>
              </div>
              <div className="stat-label">Total At-Risk Monitored</div>
            </div>

            {modelAccuracy !== null && (
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">
                  <span className="badge badge-blue" style={{ fontSize: '1.4rem', padding: '0.4rem 0.8rem' }}>
                    {modelAccuracy}
                  </span>
                </div>
                <div className="stat-label">Model Validation Accuracy</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                  Historical cohort cross-validation score
                </div>
              </div>
            )}
          </div>

          {/* Admin Search & Filter Bar */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'var(--surface)',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ flex: '1', minWidth: '240px' }}>
              <div className="search-wrap" style={{ width: '100%' }}>
                <IconSearch className="search-icon" width={18} height={18} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by student name, roll no, or enrollment no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>Filter Risk Level:</label>
              <select
                className="form-select"
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                style={{ width: 'auto', padding: '9px 14px', fontSize: '0.875rem' }}
              >
                <option value="all">All Risk Levels</option>
                <option value="high">Critical Risk (≥70%)</option>
                <option value="moderate">Moderate Risk (40-69%)</option>
              </select>
            </div>
          </div>

          {/* Section 1: At-Risk Students Table with Primary Risk Factors */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Students Requiring Academic Intervention</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: '0.25rem 0 0 0' }}>
                  Students flagged by predictive modeling for potential exam failure based on attendance & grade trajectories.
                </p>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontWeight: 500 }}>
                Showing {filteredAtRisk.length} of {atRisk.length} flagged students
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Enrollment No</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Current Attendance</th>
                    <th>Exam Average</th>
                    <th>Failure Risk %</th>
                    <th>Primary Risk Factor(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAtRisk.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">
                          <div className="empty-icon">✅</div>
                          <p>No at-risk students match the selected filter criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAtRisk.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ color: s.enrollment_number ? 'var(--text-1)' : 'var(--text-3)', fontStyle: s.enrollment_number ? 'normal' : 'italic' }}>
                        {s.enrollment_number && String(s.enrollment_number).trim() ? s.enrollment_number : 'Not Assigned'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.roll_no}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className={marksBadge(s['attendance_%'])}>{parseFloat(s['attendance_%'] || 0).toFixed(1)}%</span></td>
                      <td><span className={marksBadge(s['avg_marks_%'])}>{parseFloat(s['avg_marks_%'] || 0).toFixed(1)}%</span></td>
                      <td>
                        <span className={riskBadge(s['risk_%'])} style={{ fontWeight: 700 }}>
                          {parseFloat(s['risk_%'] || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {getRiskFactors(s).map((f, idx) => (
                            <span key={idx} className={f.cls} style={{ fontSize: '0.75rem' }}>
                              {f.label}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: End-Semester Score Forecast */}
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>End-Semester Score Forecast</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: '0.25rem 0 0 0' }}>
                Statistical projections predicting final examination performance based on ongoing attendance and midterm trends.
              </p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Enrollment No</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Current Attendance</th>
                    <th>Midterm / Internal Avg</th>
                    <th>Predicted Final Score</th>
                    <th>Expected Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">
                          <div className="empty-icon">🔮</div>
                          <p>No forecast predictions available.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPredictions.map((p, i) => {
                    const status = getExpectedStatus(p['predicted_%']);
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ color: p.enrollment_number ? 'var(--text-1)' : 'var(--text-3)', fontStyle: p.enrollment_number ? 'normal' : 'italic' }}>
                          {p.enrollment_number && String(p.enrollment_number).trim() ? p.enrollment_number : 'Not Assigned'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.roll_no}</td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td><span className={marksBadge(p['attendance_%'])}>{parseFloat(p['attendance_%'] || 0).toFixed(1)}%</span></td>
                        <td><span className={marksBadge(p['avg_marks_%'])}>{parseFloat(p['avg_marks_%'] || 0).toFixed(1)}%</span></td>
                        <td>
                          <span className="badge badge-blue" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {parseFloat(p['predicted_%'] || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={status.badge}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
