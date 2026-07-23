import { useState } from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '🏛️', title: 'Student registry', desc: 'A centralized registry for student profiles, academic histories, admissions and personal records.' },
  { icon: '👥', title: 'Faculty Portal', desc: 'The custom designed portal for managing student grades, marks, schedules, and classroom attendance.' },
  { icon: '📁', title: 'File storage', desc: 'Drive-like cloud storage folder, directly accessible from any page for easy sharing of curriculum notes.' },
  { icon: '📊', title: 'Analysis & Reports', desc: 'Real-time analytics, grade distributions, attendance trends, and performance outliers at your fingertips.' },
  { icon: '🎓', title: 'Alumni relations', desc: 'Keep in touch with alumni, track their career progression, graduation archives, and coordinate events.' },
  { icon: '🛡️', title: 'Build on enterprise scale', desc: 'Highly secured database, robust authorization systems, speed optimization, and zero downtime.' },
];

const testimonials = [
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: '"CampusCore completely reformed how our department logs attendance and marks. The ML analytics pinpoint at-risk students instantly."',
    author: 'Prof. Sarah Jenkins',
    role: 'Dean of Engineering at Tech University',
    initials: 'SJ'
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: '"Having separate portal dashboards for students, faculty, and parents saves hundreds of emails. The platform is incredibly fast and responsive."',
    author: 'Marcus Vance',
    role: 'IT Administrator at Oakridge Academy',
    initials: 'MV'
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: '"As a parent, I can check my child\'s attendance record and midterm exam marks in real-time. It keeps us in perfect sync with the school."',
    author: 'Dr. Elizabeth Roy',
    role: 'Parent of Student at Stanford Prep',
    initials: 'ER'
  }
];

const faqs = [
  {
    question: 'How does the university onboarding process work?',
    answer: 'An administrator registers the university under the "Register University" tab and receives a unique code. They can then create faculty, student, and parent profiles. Those users verify their identities using the university code and set passwords via the "Join University" tab.'
  },
  {
    question: 'Can parents track multiple children\'s progress?',
    answer: 'Yes! Parent accounts are tied to their student profiles. Once an admin associates a parent email with a student, the parent logs in to view academic analytics, marks, and attendance histories.'
  },
  {
    question: 'What machine learning algorithms are utilized?',
    answer: 'The system uses an optimized RandomForest model to identify students at risk of academic probation, and Linear Regression to forecast future grades based on attendance and current assignments.'
  },
  {
    question: 'How secure is the student data?',
    answer: 'CampusCore enforces strict role-based access control. Faculty can only access subjects and students they teach, and JWT authorization ensures every API endpoint is fully secured against unauthorized requests.'
  },
  {
    question: 'Is there a limit to how many admins can manage one campus?',
    answer: 'Yes, to maintain strict security protocols, each university is limited to a maximum of 5 system administrators.'
  }
];

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [mockupTab, setMockupTab] = useState('performance');

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <span style={{ fontSize: '1.5rem' }}>🎓</span>
          <span>CampusCore</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#testimonials" className="landing-nav-link">Reviews</a>
          <a href="#faq" className="landing-nav-link">About</a>
        </div>
        <div className="landing-nav-btns">
          <Link to="/login" className="landing-btn-text">Login</Link>
          <Link to="/register" className="landing-btn-purple">Register</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-pill">Your Campus, in perfect sync</div>
        <h1>The ERP platform<br />built for <span className="highlight">education</span></h1>
        <p className="hero-sub">
          A design-platform built for schools and universities to manage students, grades, schedules, attendance, and leverage predictive machine learning insights.
        </p>
        <div className="landing-hero-btns">
          <Link to="/register" className="landing-btn-purple" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Get started
          </Link>
          <a href="#features" className="landing-btn-outline" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            About features &rarr;
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div className="landing-mockup-wrapper">
          <div className="landing-mockup">
            <div className="landing-mock-sidebar">
              <div className="landing-mock-logo" />
              <div className="landing-mock-navitem active" />
              <div className="landing-mock-navitem" />
              <div className="landing-mock-navitem" />
              <div className="landing-mock-navitem" />
              <div className="landing-mock-navitem" style={{ marginTop: 'auto', background: '#fecaca' }} />
            </div>
            <div className="landing-mock-content">
              <div className="landing-mock-header">
                <div className="landing-mock-tabs">
                  <button
                    type="button"
                    className={`landing-mock-tab ${mockupTab === 'performance' ? 'active' : ''}`}
                    onClick={() => setMockupTab('performance')}
                  >
                    📈 Grades
                  </button>
                  <button
                    type="button"
                    className={`landing-mock-tab ${mockupTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setMockupTab('attendance')}
                  >
                    ⏱️ Attendance
                  </button>
                  <button
                    type="button"
                    className={`landing-mock-tab ${mockupTab === 'insights' ? 'active' : ''}`}
                    onClick={() => setMockupTab('insights')}
                  >
                    🤖 ML Insights
                  </button>
                </div>
                <div className="landing-mock-user" />
              </div>

              {mockupTab === 'performance' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="landing-mock-grid">
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Class Average</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>84.3%</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Highest Score</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c084fc' }}>98.5%</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Passing Rate</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>95.2%</span>
                    </div>
                  </div>
                  {/* Interactive SVG graph */}
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, minHeight: 120 }}>
                    <svg width="100%" height="100%" viewBox="0 0 400 120" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M 0 90 Q 80 40 160 65 T 320 25 T 400 50 L 400 120 L 0 120 Z" fill="url(#grad)" />
                      <path className="svg-line-path" d="M 0 90 Q 80 40 160 65 T 320 25 T 400 50" fill="none" stroke="#6366f1" strokeWidth="3" />
                      <circle cx="160" cy="65" r="4" fill="#6366f1" />
                      <circle cx="320" cy="25" r="4" fill="#6366f1" />
                    </svg>
                  </div>
                </div>
              )}

              {mockupTab === 'attendance' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="landing-mock-grid">
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Overall Rate</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>92.8%</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Present Today</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>412 / 450</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Absent Today</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171' }}>38 / 450</span>
                    </div>
                  </div>
                  {/* Dynamic Progress Indicator */}
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '12px 8px', minHeight: 120 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <svg width="60" height="60" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                        <circle className="svg-circle-path" cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="10" fill="transparent" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" />
                        <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#0f172a">75%</text>
                      </svg>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Students</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <svg width="60" height="60" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                        <circle className="svg-circle-path" cx="50" cy="50" r="40" stroke="#34d399" strokeWidth="10" fill="transparent" strokeDasharray="251.2" strokeDashoffset="25.1" strokeLinecap="round" />
                        <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#0f172a">90%</text>
                      </svg>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Faculty</span>
                    </div>
                  </div>
                </div>
              )}

              {mockupTab === 'insights' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="landing-mock-grid">
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>ML Accuracy</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>87.5%</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>At-Risk Flags</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171' }}>12 users</span>
                    </div>
                    <div className="landing-mock-card">
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Interventions</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>8 cases</span>
                    </div>
                  </div>
                  {/* Detailed Interactive Insight Log */}
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 8, fontSize: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', minHeight: 120 }}>
                    <div style={{ padding: '4px 8px', background: '#fee2e2', borderRadius: 4, color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>⚠️ Roll #1004 - Attendance drop (62.3%)</span>
                      <strong>At Risk</strong>
                    </div>
                    <div style={{ padding: '4px 8px', background: '#fee2e2', borderRadius: 4, color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>⚠️ Roll #1012 - GPA forecast (&lt; 2.0)</span>
                      <strong>At Risk</strong>
                    </div>
                    <div style={{ padding: '4px 8px', background: '#d1fae5', borderRadius: 4, color: '#065f46', display: 'flex', justifyContent: 'space-between' }}>
                      <span>✓ Roll #1008 - Recovered to 85% score</span>
                      <strong>Safe</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="landing-features-sec">
        <div className="landing-section-header">
          <span className="landing-section-pill">Full Suite</span>
          <h2>Everything your campus needs, nothing it doesn&apos;t</h2>
          <p>Ditch spreadsheets and disjointed databases. Manage academic records, files, and intelligence within a single unified workspace.</p>
        </div>
        <div className="landing-features-grid">
          {features.map((item, idx) => (
            <div key={idx} className="landing-feature-card">
              <div className="landing-feature-icon-wrap">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="landing-value-sec">
        <div className="landing-value-left">
          <h2>The platform institutions actually want to use</h2>
          <p>
            We designed CampusCore to prioritize clean aesthetics and fluid user workflows. Administrative tasks should feel intuitive, not exhausting.
          </p>
          <Link to="/register" className="landing-btn-purple">Request a demo</Link>
        </div>
        <div className="landing-value-right">
          <div className="landing-value-item">
            <span className="landing-value-num">01</span>
            <div className="landing-value-text">
              <h4>PLATFORM INTEGRATION</h4>
              <p>Unify Student records, attendance trackers, resource shares and grade rosters under a shared environment.</p>
            </div>
          </div>
          <div className="landing-value-item">
            <span className="landing-value-num">02</span>
            <div className="landing-value-text">
              <h4>Deliver on trust & transparency</h4>
              <p>Keep parents and students updated with immediate result reports and secure permission accesses.</p>
            </div>
          </div>
          <div className="landing-value-item">
            <span className="landing-value-num">03</span>
            <div className="landing-value-text">
              <h4>Tuned for high speed</h4>
              <p>Lightning-quick query databases allow instant dashboard reports without spinner lag.</p>
            </div>
          </div>
          <div className="landing-value-item">
            <span className="landing-value-num">04</span>
            <div className="landing-value-text">
              <h4>Always learning</h4>
              <p>Predictive analytics flags at-risk profiles before semester ends, driving early support interventions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="landing-testimonials-sec">
        <div className="landing-section-header">
          <span className="landing-section-pill">Reviews</span>
          <h2>Loved by institutions worldwide</h2>
          <p>Here is what dean officials, system administrators, and parents have to say about CampusCore.</p>
        </div>
        <div className="landing-testimonials-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="landing-testimonial-card">
              <div className="landing-testimonial-stars">{t.stars}</div>
              <p className="landing-testimonial-content">{t.quote}</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">{t.initials}</div>
                <div className="landing-testimonial-info">
                  <h5>{t.author}</h5>
                  <p>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ accordion */}
      <section id="faq" className="landing-faq-sec">
        <div className="landing-section-header">
          <span className="landing-section-pill">FAQ</span>
          <h2>Common questions</h2>
          <p>Clear, direct answers to help you navigate our workspace onboarding steps.</p>
        </div>
        <div className="landing-faq-list">
          {faqs.map((faq, idx) => {
            const isExpanded = activeFaq === idx;
            return (
              <div key={idx} className="landing-faq-item">
                <div className="landing-faq-question" onClick={() => toggleFaq(idx)}>
                  <span>{faq.question}</span>
                  <span className={`landing-faq-question-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </div>
                {isExpanded && (
                  <div className="landing-faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Card */}
      <section className="landing-cta-sec">
        <div className="landing-cta-card">
          <h2>Ready to modernize your campus?</h2>
          <p>We are excited to show you what CampusCore can do. Create your account and get started today.</p>
          <div className="landing-cta-btns">
            <Link to="/register" className="landing-btn-white">Get started</Link>
            <Link to="/login" className="landing-btn-outline" style={{ background: 'transparent', color: '#ffffff', borderColor: '#ffffff' }}>
              Click here &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <div className="landing-footer-logo">
              <span style={{ fontSize: '1.6rem' }}>🎓</span>
              <span>CampusCore</span>
            </div>
            <div className="landing-footer-tagline">Building the Future of Education</div>
            <p className="landing-footer-desc">
              An AI-driven, modular educational operating system built to streamline administration, empower educators, and support academic growth.
            </p>
          </div>
          <div className="landing-footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#features" className="landing-footer-link">Features</a></li>
              <li><Link to="/register" className="landing-footer-link">Register</Link></li>
              <li><Link to="/login" className="landing-footer-link">Login</Link></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h5>Support</h5>
            <ul>
              <li><a href="#faq" className="landing-footer-link">Help center</a></li>
              <li><a href="#faq" className="landing-footer-link">FAQ</a></li>
              <li><a href="mailto:support@campuscore.edu" className="landing-footer-link">Contact us</a></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h5>Legal</h5>
            <ul>
              <li><a href="#faq" className="landing-footer-link">Privacy Policy</a></li>
              <li><a href="#faq" className="landing-footer-link">Terms of Service</a></li>
              <li><a href="#faq" className="landing-footer-link">GDPR Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} CampusCore. All rights reserved.</span>
          <div className="landing-footer-socials">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="landing-social-btn" aria-label="Twitter X">
              <svg viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="landing-social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="landing-social-btn" aria-label="GitHub">
              <svg viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
