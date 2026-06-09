import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import InternDashboard from './pages/InternDashboard';
import InternManagement from './pages/InternManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendanceLogs from './pages/AttendanceLogs';
import ReviewReports from './pages/ReviewReports';
import Timeline from './pages/Timeline';
import Register from './pages/Register';
import InternProfiles from './pages/InternProfiles';
import EmployeeProfiles from './pages/EmployeeProfiles';
import DailyUpdates from './pages/DailyUpdates';
import TodaysUpdate from './pages/TodaysUpdate';
import ResetPassword from './pages/ResetPassword';
import ViewUpdates from './pages/ViewUpdates.jsx';

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// --- Dashboard Selector based on Role ---
const DashboardSelector = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <InternDashboard />;
};

// --- Main App Routing ---
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reset-password" element={!user ? <ResetPassword /> : <Navigate to="/dashboard" replace />} />

      {/* Unified Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardSelector />
        </ProtectedRoute>
      } />
      <Route path="/daily-updates" element={
        <ProtectedRoute>
          <DailyUpdates />
        </ProtectedRoute>
      } />
      <Route path="/todays-update" element={
        <ProtectedRoute>
          <TodaysUpdate />
        </ProtectedRoute>
      } />
      <Route path="/intern-profiles" element={
        <ProtectedRoute>
          <InternProfiles />
        </ProtectedRoute>
      } />
      <Route path="/employee-profiles" element={
        <ProtectedRoute>
          <EmployeeProfiles />
        </ProtectedRoute>
      } />
      <Route path="/intern-management" element={
        <ProtectedRoute>
          <InternManagement />
        </ProtectedRoute>
      } />
      <Route path="/employee-management" element={
        <ProtectedRoute>
          <EmployeeManagement />
        </ProtectedRoute>
      } />
      <Route path="/attendance-logs" element={
        <ProtectedRoute>
          <AttendanceLogs />
        </ProtectedRoute>
      } />
      <Route path="/review-reports" element={
        <ProtectedRoute>
          <ReviewReports />
        </ProtectedRoute>
      } />
      <Route path="/view-updates" element={
        <ProtectedRoute>
          <ViewUpdates />
        </ProtectedRoute>
      } />
      <Route path="/my-attendance" element={
        <ProtectedRoute>
          <AttendanceLogs />
        </ProtectedRoute>
      } />

      {/* Shared Timeline Portfolio Route */}
      <Route path="/timeline/:id" element={
        <ProtectedRoute>
          <Timeline />
        </ProtectedRoute>
      } />

      {/* Legacy Redirects */}
      <Route path="/admin-dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/intern-dashboard" element={<Navigate to="/dashboard" replace />} />

      {/* Redirect base route */}
      <Route path="*" element={
        user 
          ? <Navigate to="/dashboard" replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
};

import { ToastProvider } from './context/ToastContext';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
