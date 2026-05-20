import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import AddBookPage from './pages/AddBookPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute><RegisterPage /></PublicRoute>
      } />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/books" element={
        <PrivateRoute>
          <AppLayout><BooksPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/books/add" element={
        <PrivateRoute>
          <AppLayout><AddBookPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/books/:id" element={
        <PrivateRoute>
          <AppLayout><BookDetailPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/analytics" element={
        <PrivateRoute>
          <AppLayout><AnalyticsPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <AppLayout><SettingsPage /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineBanner />
        <InstallPrompt />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
