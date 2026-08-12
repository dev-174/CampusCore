import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jfif';

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
    author: 'Prof. Sunita Rao',
    role: 'Dean of Academic Affairs at National Institute of Tech',
    initials: 'SR'
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: '"Having separate portal dashboards for students, faculty, and parents saves hundreds of emails. The platform is incredibly fast and responsive."',
    author: 'Manish Verma',
    role: 'IT Administrator at Campus Systems',
    initials: 'MV'
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    quote: '"As a parent, I can check my child\'s attendance record and midterm exam marks in real-time. It keeps us in perfect sync with the school."',
    author: 'Dr. Anjali Deshmukh',
    role: 'Parent of Student at Modern Campus',
    initials: 'AD'
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
          <img src={logoImg} className="brand-logo-img" alt="CampusCore Logo" />
          <span>CampusCore</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Product</a>
          <a href="#testimonials" className="landing-nav-link">Features</a>
          <a href="#faq" className="landing-nav-link">Docs</a>
        </div>
        <div className="landing-nav-btns">
          <Link to="/login" className="landing-btn-login">LOG IN</Link>
          <Link to="/register" className="landing-btn-getstarted">GET STARTED</Link>
        </div>
      </nav>

      {/* Hero Section Split Layout */}
      <header className="landing-hero-wrapper">
        <div className="landing-hero-container">
          {/* Left Column: White Floating Card */}
          <div className="landing-hero-card">
            <div className="landing-hero-badge">
              <span className="badge-sparkle">✦</span> YOUR CAMPUS, IN SYNC
            </div>
            <h1 className="landing-hero-title">
              Run every corner of your campus, <span className="highlight-teal">without the chaos</span>
            </h1>
            <p className="landing-hero-desc">
              CampusCore brings student records, faculty workflows, attendance, and predictive ML insights into one platform — built for schools and universities that have outgrown spreadsheets.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="hero-btn-primary">
                GET STARTED
              </Link>
              <a href="#features" className="hero-btn-secondary">
                SEE IT IN ACTION
              </a>
            </div>
            <div className="landing-hero-trusted">
              <span className="trusted-title">TRUSTED BY EDUCATION TEAMS AT</span>
              <div className="trusted-logos">
                <span className="brand-logo">OAKRIDGE</span>
                <span className="brand-logo">Vellum</span>
                <span className="brand-logo">NORTHGATE</span>
                <span className="brand-logo">ashford &#9656;</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dark Tech Graphic Canvas */}
          <div className="landing-hero-canvas">
            <div className="canvas-grid-bg" />
            <div className="canvas-glow-aura" />
            
            {/* Concentric rings emblem */}
            <div className="canvas-emblem-wrapper">
              <div className="emblem-ring ring-3" />
              <div className="emblem-ring ring-2" />
              <div className="emblem-ring ring-1" />
              <div className="emblem-icon-box" style={{ width: '100px', height: '100px' }}>
                <img src={logoImg} alt="CampusCore Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Floating Metric Badge 1 */}
            <div className="canvas-metric-card metric-top-left">
              <span className="metric-val">12.4k+</span>
              <span className="metric-lbl">Students managed</span>
            </div>

            {/* Floating Metric Badge 2 */}
            <div className="canvas-metric-card metric-mid-left">
              <span className="metric-val">40+</span>
              <span className="metric-lbl">Institutions</span>
            </div>

            {/* Floating Metric Badge 3 */}
            <div className="canvas-metric-card metric-bottom-right">
              <span className="metric-val">98%</span>
              <span className="metric-lbl">On-time reporting</span>
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
              <img src={logoImg} className="brand-logo-img" alt="CampusCore Logo" />
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
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="landing-social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="landing-social-btn" aria-label="GitHub">
              <svg viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
