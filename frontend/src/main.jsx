import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext'; // Import this
import { ThemeProvider } from './contexts/ThemeContext'; // Import this
import { FocusModeProvider } from './contexts/FocusModeContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>       {/* Wrap here */}
          <ThemeProvider>     {/* Wrap here */}
            <FocusModeProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </FocusModeProvider>
          </ThemeProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);