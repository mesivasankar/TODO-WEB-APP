import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useAudioSynth from "../../hooks/useAudioSynth";
import { startFocusSession, updateFocusSession } from "../../api/focusApi";
import { toggleTaskComplete } from "../../api/tasksApi";
import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./FocusModeOverlay.module.css";

// SVG Icons
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const ResetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const SoundOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
);
const SoundOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
);
const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
);

export default function FocusModeOverlay({ task, onClose }) {
  const [duration, setDuration] = useState(1500); // 25 minutes default
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Audio volumes (0-100 scales)
  const [bVolume, setBVolume] = useState(15); // Focus Waves (Alpha)
  const [nVolume, setNVolume] = useState(30); // Cozy Rain (Brown)
  const [oVolume, setOVolume] = useState(25); // Ocean Breeze
  const [fVolume, setFVolume] = useState(20); // Night Forest
  const [wVolume, setWVolume] = useState(15); // White Noise
  const [zVolume, setZVolume] = useState(30); // Zen Temple

  // Gamification: user's focus stats
  const [completedSessions, setCompletedSessions] = useState(0);

  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);

  const [subtasks, setSubtasks] = useState([]);
  const canvasRef = useRef(null);
  const audioSynth = useAudioSynth();
  const { showUndoToast } = useToast();
  const { theme } = useTheme();

  // Load subtasks linked to this parent task
  useEffect(() => {
    if (task) {
      const fetchSubtasks = async () => {
        try {
          const listId = task.list_id || task.listId;
          if (listId) {
            const response = await fetch(`/api/lists/${listId}/tasks`);
            const data = await response.json();
            const listTasks = data.tasks || [];
            const nested = listTasks.filter(t => t.parent_task_id === task.id);
            setSubtasks(nested);
          }
        } catch (e) {
          console.error("Failed to load nested focus subtasks", e);
        }
      };
      fetchSubtasks();
    }
  }, [task]);

  // Fetch completed focus sessions count on mount
  useEffect(() => {
    const fetchFocusStats = async () => {
      try {
        const response = await fetch("/api/focus/stats");
        if (response.ok) {
          const data = await response.json();
          setCompletedSessions(data.sessionCount || 0);
        }
      } catch (err) {
        console.error("Failed to load focus statistics", err);
      }
    };
    fetchFocusStats();
  }, []);

  // Main countdown timer interval
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleFocusCompletion();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Capture Escape and Space keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsRunning(p => !p);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isCompleted) {
          handleForceClose();
        } else {
          setShowExitConfirm(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompleted]);

  // STATE MACHINE TRIGGER: Start session in DB when timer starts running
  const initiateSession = async (secs) => {
    try {
      const res = await startFocusSession(task.id, secs);
      setSessionId(res.id);
      sessionIdRef.current = res.id;
    } catch (err) {
      console.error("Failed to register focus session in database:", err);
    }
  };

  useEffect(() => {
    if (isRunning && !sessionIdRef.current) {
      initiateSession(timeLeft);
    }
  }, [isRunning]);

  // TAB-CLOSING BEACON SAFEGUARD: Abandon session if tab or window is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const sId = sessionIdRef.current;
        navigator.sendBeacon(`/api/focus/${sId}/beacon-abandon`);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // SVG Circular Ring parameters (Fully responsive scales relative to 280 viewBox)
  const radius = 110;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useMemo(() => {
    const progress = (timeLeft / duration) * 100;
    return circumference - (progress / 100) * circumference;
  }, [timeLeft, duration, circumference]);

  // Format MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Synthesize Major 7th arpeggio chord chime on Pomodoro completion
  const playVictoryChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const freqs = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const delay = idx * 0.12;

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 1.3);
      });
    } catch (e) { }
  };

  const handleSubtaskToggle = async (sub) => {
    const updatedStatus = !sub.is_completed;

    setSubtasks(prev => prev.map(t => t.id === sub.id ? { ...t, is_completed: updatedStatus } : t));

    try {
      await toggleTaskComplete(sub.id, updatedStatus);
    } catch (err) {
      console.error("Failed to sync subtask completion", err);
      setSubtasks(prev => prev.map(t => t.id === sub.id ? { ...t, is_completed: !updatedStatus } : t));
    }
  };

  const handleFocusCompletion = async () => {
    setIsCompleted(true);
    audioSynth.stopAll();
    playVictoryChime();

    // STATE MACHINE TRIGGER: Mark session completed inside database
    if (sessionIdRef.current) {
      const mins = Math.round(duration / 60) || 1;
      try {
        await updateFocusSession(sessionIdRef.current, "COMPLETED", mins);
        sessionIdRef.current = null; // Clear to prevent beacon fire
        setCompletedSessions(prev => prev + 1);
      } catch (err) {
        console.error("Failed to finalize focus session:", err);
      }
    }
  };

  // Launch falling browser canvas confetti waterfall (strictly black, grey, white monochrome!)
  useEffect(() => {
    if (!isCompleted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    // Aesthetic B&W monochrome confetti
    const colors = theme === "light"
      ? ["#000000", "#1f2937", "#4b5563", "#9ca3af", "#d1d5db", "#f3f4f6"]
      : ["#ffffff", "#e5e7eb", "#9ca3af", "#4b5563", "#374151", "#1f2937"];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.05 + 0.015,
        tiltAngle: 0,
        speed: Math.random() * 2.5 + 2,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.speed;
        p.x += Math.sin(p.tiltAngle);

        if (p.y < canvas.height) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r * 1.5;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (active) {
        animId = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isCompleted, theme]);

  // STATE MACHINE TRIGGER: Early Stop credits or Abandonment updates
  const handleForceClose = async () => {
    audioSynth.stopAll();

    if (sessionIdRef.current && !isCompleted) {
      const elapsedSecs = duration - timeLeft;
      const sId = sessionIdRef.current;
      sessionIdRef.current = null; // prevent beacon fire

      if (elapsedSecs >= 60) {
        const mins = Math.round(elapsedSecs / 60);
        try {
          await updateFocusSession(sId, "PARTIAL", mins);
          showUndoToast(`Focus stopped early. You earned ${mins} focus mins!`);
        } catch (e) {
          console.error(e);
        }
      } else {
        try {
          await updateFocusSession(sId, "ABANDONED", 0);
          showUndoToast("Session abandoned. No focus credit earned.");
        } catch (e) {
          console.error(e);
        }
      }
    }

    onClose();
  };

  const setTimeDuration = (mins) => {
    const secs = mins * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setIsRunning(false);
    sessionIdRef.current = null;
    setSessionId(null);
  };

  // Dynamic monochrome colors for SVG
  const ringTrackColor = theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)";
  const ringProgressColor = theme === "light" ? "#000000" : "#ffffff";

  // Ambient Audio Tracks Configuration (All Unlocked by Default)
  const tracks = useMemo(() => [
    {
      id: "rain",
      name: "Cozy Rain",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isBrownPlaying,
      play: audioSynth.playBrownNoise,
      stop: audioSynth.stopBrownNoise,
      volume: nVolume,
      setVolume: (val) => {
        setNVolume(val);
        audioSynth.setBrownVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    },
    {
      id: "waves",
      name: "Focus Waves (Alpha)",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isBinauralPlaying,
      play: audioSynth.playBinaural,
      stop: audioSynth.stopBinaural,
      volume: bVolume,
      setVolume: (val) => {
        setBVolume(val);
        audioSynth.setBinauralVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    },
    {
      id: "ocean",
      name: "Ocean Breeze",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isOceanPlaying,
      play: audioSynth.playOcean,
      stop: audioSynth.stopOcean,
      volume: oVolume,
      setVolume: (val) => {
        setOVolume(val);
        audioSynth.setOceanVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    },
    {
      id: "forest",
      name: "Night Forest",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isForestPlaying,
      play: audioSynth.playForest,
      stop: audioSynth.stopForest,
      volume: fVolume,
      setVolume: (val) => {
        setFVolume(val);
        audioSynth.setForestVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    },
    {
      id: "white",
      name: "White Noise",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isWhitePlaying,
      play: audioSynth.playWhiteNoise,
      stop: audioSynth.stopWhiteNoise,
      volume: wVolume,
      setVolume: (val) => {
        setWVolume(val);
        audioSynth.setWhiteVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    },
    {
      id: "zen",
      name: "Zen Temple",
      icon: <SoundOnIcon />,
      offIcon: <SoundOffIcon />,
      isPlaying: audioSynth.isZenPlaying,
      play: audioSynth.playZen,
      stop: audioSynth.stopZen,
      volume: zVolume,
      setVolume: (val) => {
        setZVolume(val);
        audioSynth.setZenVolume(val / 100);
      },
      unlocked: true,
      unlockCriteria: "Always Unlocked"
    }
  ], [
    audioSynth.isBrownPlaying,
    audioSynth.isBinauralPlaying,
    audioSynth.isOceanPlaying,
    audioSynth.isForestPlaying,
    audioSynth.isWhitePlaying,
    audioSynth.isZenPlaying,
    nVolume,
    bVolume,
    oVolume,
    fVolume,
    wVolume,
    zVolume
  ]);

  return (
    <div className={`${styles.overlayContainer} ${theme === "light" ? styles.lightTheme : styles.darkTheme}`}>
      <motion.div
        className={styles.backdropBlur}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <canvas ref={canvasRef} className={styles.confettiCanvas} />

      <div className={styles.mainOverlayContent}>
        {/* TOP STATUS BAR */}
        <header className={styles.overlayHeader}>
          <div className={styles.metaLeft}>
            <span className={styles.focusLabel}>FOCUS SESSION</span>
            <h2 className={styles.taskTitle}>“{task?.title}”</h2>
          </div>
          <button className={styles.closeBtn} onClick={() => isCompleted ? handleForceClose() : setShowExitConfirm(true)} title="Exit Focus Mode">
            <CloseIcon />
          </button>
        </header>

        {/* WORKSPACE AREA */}
        <div className={styles.workspaceBody}>

          {/* TIMER COMPONENT */}
          <div className={styles.timerColumn}>
            <div className={styles.timerRingWrapper}>
              <svg className={styles.svgRing} viewBox="0 0 280 280" width="100%" height="100%">
                <circle className={styles.ringTrack} cx="140" cy="140" r={radius} stroke={ringTrackColor} strokeWidth={strokeWidth} fill="none" />
                <motion.circle
                  className={styles.ringProgress}
                  cx="140"
                  cy="140"
                  r={radius}
                  stroke={ringProgressColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  fill="none"
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.8, ease: "linear" }}
                />
              </svg>

              <div className={styles.timerNumericOverlay}>
                <span className={styles.digitalTime}>{formatTime(timeLeft)}</span>
                <span className={styles.timerStatus}>{isRunning ? "FOCUSING" : "PAUSED"}</span>
              </div>
            </div>

            {/* PRESETS */}
            <div className={styles.presetGroup}>
              <button
                onClick={() => setTimeDuration(15)}
                className={duration === 900 ? styles.presetBtnActive : styles.presetBtn}
                disabled={timeLeft !== duration || isRunning}
              >
                15m
              </button>
              <button
                onClick={() => setTimeDuration(25)}
                className={duration === 1500 ? styles.presetBtnActive : styles.presetBtn}
                disabled={timeLeft !== duration || isRunning}
              >
                25m
              </button>
              <button
                onClick={() => setTimeDuration(45)}
                className={duration === 2700 ? styles.presetBtnActive : styles.presetBtn}
                disabled={timeLeft !== duration || isRunning}
              >
                45m
              </button>
            </div>

            {/* CONTROLS */}
            <div className={styles.controlRow}>
              <button
                onClick={() => {
                  setTimeLeft(duration);
                  setIsRunning(false);
                  sessionIdRef.current = null;
                  setSessionId(null);
                }}
                className={styles.iconCtrlBtn}
                title="Reset session"
              >
                <ResetIcon />
              </button>

              <button
                onClick={() => setIsRunning(p => !p)}
                className={styles.playPauseBtn}
                title={isRunning ? "Pause Session (Space)" : "Start Session (Space)"}
              >
                {isRunning ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>
          </div>

          {/* NESTED FOCUS LIST CHECKLIST */}
          <div className={styles.checklistColumn}>
            <div className={styles.checklistCard}>
              <h4 className={styles.checklistTitle}>
                <SparklesIcon /> Nested Objectives
              </h4>
              <p className={styles.checklistSubtitle}>Check off sub-goals directly in Focus Mode.</p>

              <div className={styles.scroller}>
                {subtasks.length === 0 ? (
                  <div className={styles.emptyObjectives}>
                    <p>No subtasks linked to this session.</p>
                  </div>
                ) : (
                  <ul className={styles.subtaskUl}>
                    {subtasks.map((sub) => (
                      <li
                        key={sub.id}
                        className={`${styles.subtaskLi} ${sub.is_completed ? styles.completedLi : ""}`}
                        onClick={() => handleSubtaskToggle(sub)}
                      >
                        <div className={`${styles.checkCircle} ${sub.is_completed ? styles.checkedCircle : ""}`}>
                          {sub.is_completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span className={styles.subtaskLabel}>{sub.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM AMBIENT AUDIO PANEL */}
        <footer className={styles.audioPanel}>
          <div className={styles.audioCard}>
            <div className={styles.audioCardHeader}>
              <h5 className={styles.audioTitle}>Ambient Sound Space</h5>
              <span className={styles.sessionBadge}>{completedSessions} Completed Sessions</span>
            </div>

            <div className={styles.mixerRow}>
              {tracks.map((track) => (
                <div key={track.id} className={styles.audioChannel}>
                  <div className={styles.channelHeader}>
                    <button
                      onClick={() => {
                        if (track.isPlaying) {
                          track.stop();
                        } else {
                          // Mutually Exclusive Selection: stop all other playing tracks
                          tracks.forEach((t) => {
                            if (t.id !== track.id && t.isPlaying) {
                              t.stop();
                            }
                          });
                          track.play();
                        }
                      }}
                      className={`${styles.soundBtn} ${track.isPlaying ? styles.soundActive : ""}`}
                      title={`Toggle ${track.name}`}
                    >
                      {track.isPlaying ? track.icon : track.offIcon}
                    </button>
                    <div className={styles.channelNameGroup}>
                      <span className={styles.channelName}>{track.name}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => track.setVolume(Number(e.target.value))}
                    className={styles.volumeSlider}
                    disabled={!track.isPlaying}
                  />
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* CONFIRM EXIT OVERLAY DIALOG */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className={styles.dialogBackdrop}>
            <motion.div
              className={styles.dialogCard}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>Abandon Focus?</h3>
              <p>Your active Pomodoro timer is currently counting down. Exiting now will stop the ambient synthesizer and discard this session.</p>

              <div className={styles.dialogActions}>
                <button className={styles.dialogCancel} onClick={() => setShowExitConfirm(false)}>Keep Focusing</button>
                <button className={styles.dialogConfirm} onClick={handleForceClose}>Exit Session</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS CELEBRATION MODAL */}
      <AnimatePresence>
        {isCompleted && (
          <div className={styles.dialogBackdrop}>
            <motion.div
              className={styles.dialogCard}
              style={{ textAlign: 'center', maxWidth: '360px' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <span style={{ fontSize: '36px' }}>🏆</span>
              <h3 style={{ margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>Focus Session Complete!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Sensational concentration! You have successfully completed your Pomodoro milestone for “{task?.title}”.
              </p>
              <button className={styles.dialogConfirm} style={{ width: '100%' }} onClick={handleForceClose}>Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
