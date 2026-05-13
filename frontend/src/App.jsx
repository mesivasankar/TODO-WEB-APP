import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"; 
import useAuth from "./hooks/useAuth";
import Preloader from "./components/Preloader";
import AppLayout from "./pages/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailSuccessPage from "./pages/VerifyEmailSuccessPage";
import VerifyEmailErrorPage from "./pages/VerifyEmailErrorPage";
import ListTasksPage from "./pages/ListTasksPage";
import StarredTasksPage from "./pages/StarredTasksPage";
import AllTasksPage from "./pages/AllTasksPage";
import ProtectedRoute from "./components/ProtectedRoute";
import TodayTasksPage from "./pages/TodayTasksPage";
import OverdueTasksPage from "./pages/OverdueTasksPage"; // 🔥 ADD THIS
import UpcomingTasksPage from "./pages/UpcomingTasksPage";
import PriorityMatrix from "./components/PriorityMatrix/PriorityMatrix";
import StatsDashboard from "./components/StatsDashboard";

import "./styles/global.css";

const AnalyticsModal = () => {
  const navigate = useNavigate();
  return <StatsDashboard onClose={() => navigate('/app/all')} />;
};

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <Preloader />;
  }

  return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email/success" element={<VerifyEmailSuccessPage />} />
          <Route path="/verify-email/error" element={<VerifyEmailErrorPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<AllTasksPage />} />
            <Route path="overdue" element={<OverdueTasksPage />} /> {/* 🔥 NEW */}
            <Route path="today" element={<TodayTasksPage />} />
            <Route path="upcoming" element={<UpcomingTasksPage />} />
            <Route path="list/:listId" element={<ListTasksPage />} />
            <Route path="starred" element={<StarredTasksPage />} />
            <Route path="/app/matrix" element={<PriorityMatrix />} />
            <Route path="analytics" element={<AnalyticsModal />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
  );
}