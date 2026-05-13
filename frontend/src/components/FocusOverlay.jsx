import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { startFocusSession, stopFocusSession } from '../api/tasksApi'; 
import styles from './FocusOverlay.module.css';

// Simple Icons
const PlayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const StopIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CheckIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default function FocusOverlay({ task, onClose, onComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);
  const timerRef = useRef(null);

  // Formatting 00:00:00
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 🔥 OPTIMISTIC START: Starts UI immediately
  const handleStart = () => {
    // 1. Start UI immediately (Zero lag)
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // 2. Call Server in Background
    startFocusSession(task.id)
      .then(() => console.log("✅ Timer started on server"))
      .catch(err => {
        console.error("❌ Failed to start timer:", err);
        // If server fails, stop the UI and warn user
        clearInterval(timerRef.current);
        setIsRunning(false);
        alert("Connection Error: Could not start timer on server.");
      });
  };

  const handleStop = async () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    
    try {
      const result = await stopFocusSession();
      // If result is null or status is discarded (less than 1 min), just close
      if (!result || result.status === 'discarded') {
        onClose(); 
      } else {
        // If saved, show success screen
        setSessionSaved(true);
      }
    } catch (err) {
      console.error("Failed to stop timer", err);
      onClose();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.tag}>FOCUS MODE</span>
          <button className={styles.closeBtn} onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Success Screen */}
        {sessionSaved ? (
          <div className={styles.successContent}>
            <CheckIcon />
            <h2>Great Focus!</h2>
            <p>You focused for {formatTime(seconds)}.</p>
            <button className={styles.doneBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          /* Timer Screen */
          <div className={styles.timerContent}>
            <h2 className={styles.taskTitle}>{task.title}</h2>
            
            <div className={`${styles.timerDisplay} ${isRunning ? styles.active : ''}`}>
              {formatTime(seconds)}
            </div>

            <div className={styles.controls}>
              {!isRunning ? (
                <button className={styles.playBtn} onClick={handleStart} title="Start Focus">
                  <PlayIcon />
                </button>
              ) : (
                <button className={styles.stopBtn} onClick={handleStop} title="Stop Focus">
                  <StopIcon />
                </button>
              )}
            </div>

            <p className={styles.helperText}>
              {isRunning ? "Focusing..." : "Ready to start?"}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}