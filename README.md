# 🎓 CampusCore

> **An AI-powered College Management Platform built to simplify academic management, automate workflows, and provide data-driven insights.**

CampusCore is a full-stack web application that brings together students, faculty, parents, and administrators on a single platform. It provides role-based access, academic management, attendance tracking, analytics, reports, and machine learning-based student performance insights.

## 🌐 Live Demo

🔗 **Live Website:** https://campuscore-phi.vercel.app/

⚙️ **Backend API:** https://campuscore-backend-12hk.onrender.com/

---

## ✨ Features

### 🔐 Authentication & Access Control
- JWT-based authentication
- Role-based access for **Admin, Faculty, Student, and Parent**
- Secure protected routes
- OTP-based password reset

### 🏫 Academic Management
- University registration and management
- Departments and batches
- Student, faculty, and parent management
- Subject management
- Teaching assignments

### 📚 Academic Tracking
- Attendance management
- Bulk attendance marking
- Marks and examination management
- Notices and academic resources
- CSV bulk upload

### 📊 Analytics & AI
- Academic performance analytics
- Attendance analysis
- Student performance insights
- At-risk student prediction
- Score prediction using machine learning
- Automated risk alerts

### 📄 Reports
- Student academic reports
- PDF report generation

## 👥 User Roles

| Role | Access |
|------|--------|
| 👨‍💼 **Admin** | Manages users, departments, batches, subjects, exams, and the overall system |
| 👨‍🏫 **Faculty** | Manages attendance, marks, and students related to their teaching assignments |
| 👨‍🎓 **Student** | Views personal attendance, marks, notices, resources, and academic reports |
| 👨‍👩‍👧 **Parent** | Monitors their child's academic progress and relevant alerts |

## 🛠️ Tech Stack

**Frontend:** `React` • `Vite` • `Axios` • `React Router`

**Backend:** `Python` • `Django` • `Django REST Framework` • `JWT`

**Database:** `PostgreSQL`

**Analytics & Machine Learning:** `Pandas` • `NumPy` • `Scikit-learn`

**Deployment:** `Vercel` • `Render`

## 🧠 Machine Learning

CampusCore includes machine learning features for academic insights:

- 🚨 **At-Risk Prediction** — Identifies students who may be academically at risk
- 📈 **Score Prediction** — Estimates student academic performance
- 📊 **Analytics** — Analyzes marks and attendance to identify useful patterns

## 📁 Project Structure

```text
CampusCore/
├── frontend/          # React + Vite frontend
├── backend/           # Django REST API
└── email-service/     # Node.js email service
