import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClaimPage    from './pages/ClaimPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Shared (all roles)
import DashboardPage   from './pages/DashboardPage';
import NoticesPage     from './pages/NoticesPage';
import ResourcesPage   from './pages/ResourcesPage';
import ProfilePage     from './pages/ProfilePage';

// Admin pages
import StudentsPage    from './pages/StudentsPage';
import FacultyPage     from './pages/FacultyPage';
import ParentsPage     from './pages/ParentsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import BatchesPage     from './pages/BatchesPage';
import SubjectsPage    from './pages/SubjectsPage';
import ExamsPage       from './pages/ExamsPage';
import AnalyticsPage   from './pages/AnalyticsPage';
import MLPage          from './pages/MLPage';

// Faculty pages
import AddMarksPage       from './pages/AddMarksPage';
import MarkAttendancePage from './pages/MarkAttendancePage';

// Student pages
import MyMarksPage      from './pages/MyMarksPage';
import MyAttendancePage from './pages/MyAttendancePage';

// Parent pages
import ChildMarksPage      from './pages/ChildMarksPage';
import ChildAttendancePage from './pages/ChildAttendancePage';
import TeachingAssignmentsPage from './pages/TeachingAssignmentsPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"                element={<LandingPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/claim"           element={<ClaimPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected — shared layout with sidebar */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* All roles */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notices"   element={<NoticesPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/profile"   element={<ProfilePage />} />

            {/* Admin only */}
            <Route path="/students"    element={<ProtectedRoute roles={['admin']}><StudentsPage /></ProtectedRoute>} />
            <Route path="/faculty"     element={<ProtectedRoute roles={['admin']}><FacultyPage /></ProtectedRoute>} />
            <Route path="/parents"     element={<ProtectedRoute roles={['admin']}><ParentsPage /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute roles={['admin']}><DepartmentsPage /></ProtectedRoute>} />
            <Route path="/batches"     element={<ProtectedRoute roles={['admin']}><BatchesPage /></ProtectedRoute>} />
            <Route path="/teaching-assignments" element={<ProtectedRoute roles={['admin']}><TeachingAssignmentsPage /></ProtectedRoute>} />
            <Route path="/subjects"    element={<ProtectedRoute roles={['admin']}><SubjectsPage /></ProtectedRoute>} />
            <Route path="/exams"       element={<ProtectedRoute roles={['admin']}><ExamsPage /></ProtectedRoute>} />
            <Route path="/analytics"   element={<ProtectedRoute roles={['admin','faculty']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/ml"          element={<ProtectedRoute roles={['admin','faculty']}><MLPage /></ProtectedRoute>} />

            {/* Faculty only */}
            <Route path="/marks/add"       element={<ProtectedRoute roles={['faculty']}><AddMarksPage /></ProtectedRoute>} />
            <Route path="/attendance/mark" element={<ProtectedRoute roles={['faculty']}><MarkAttendancePage /></ProtectedRoute>} />

            {/* Student only */}
            <Route path="/my-marks"      element={<ProtectedRoute roles={['student']}><MyMarksPage /></ProtectedRoute>} />
            <Route path="/my-attendance" element={<ProtectedRoute roles={['student']}><MyAttendancePage /></ProtectedRoute>} />

            {/* Parent only */}
            <Route path="/child-marks"      element={<ProtectedRoute roles={['parent']}><ChildMarksPage /></ProtectedRoute>} />
            <Route path="/child-attendance" element={<ProtectedRoute roles={['parent']}><ChildAttendancePage /></ProtectedRoute>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
