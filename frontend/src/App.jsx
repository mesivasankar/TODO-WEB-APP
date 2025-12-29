import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Preloader from "./components/Preloader";
import AppLayout from './pages/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailSuccessPage from './pages/VerifyEmailSuccessPage';
import VerifyEmailErrorPage from './pages/VerifyEmailErrorPage';
import ListTasksPage from './pages/ListTasksPage';
import StarredTasksPage from './pages/StarredTasksPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute'
import './styles/global.css';


export default function App() {

  const { loading } = useAuth();

  if (loading) {
    return <Preloader />;
  }


  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email/success" element={<VerifyEmailSuccessPage />} />
      <Route path="/verify-email/error" element={<VerifyEmailErrorPage />} />



      <Route path="/app" element={<ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>}>
        <Route index element={<Navigate to="list/default" replace />} />
        <Route path="list/:listId" element={<ListTasksPage />} />
        <Route path="starred" element={<StarredTasksPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
