import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDailyBriefing } from "../api/tasksApi";
import styles from "./DailyBriefingModal.module.css";

const CATEGORY_COLORS = {
  WORK: "#3b82f6",
  PERSONAL: "#8b5cf6",
  SHOPPING: "#eab308",
  HEALTH: "#ef4444",
  LEARNING: "#22c55e",
  FINANCE: "#10b981",
  TRAVEL: "#06b6d4",
  OTHERS: "#6b7280"
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};
export default function DailyBriefingModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("podcast"); // "podcast" or "summary"

  // Audio / Speech States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [voices, setVoices] = useState([]);
  
  // Script text typewriter progress
  const [visibleText, setVisibleText] = useState("");
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const utteranceRef = useRef(null);

  // 1. Fetch briefing data from backend
  const loadBriefing = async () => {
    setLoading(true);
    setError(null);
    setVisibleText("");
    setData(null);
    try {
      const res = await getDailyBriefing();
      setData(res);
      
      // Typewriter animation trigger
      if (res.script) {
        let charIndex = 0;
        const interval = setInterval(() => {
          setVisibleText(prev => {
            if (charIndex >= res.script.length) {
              clearInterval(interval);
              return prev;
            }
            const nextChar = res.script.charAt(charIndex);
            charIndex++;
            return prev + nextChar;
          });
        }, 15);
      }
    } catch (err) {
      console.error("Failed to load morning briefing", err);
      setError(err.message || "Failed to load morning briefing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, []);
  // 2. Load and initialize speech voices (UK English Female auto-selected)
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      
      // Look for UK English Female (en-GB, contains female / hazel / susan / gb / etc.)
      let selected = allVoices.find(v => 
        (v.lang.startsWith("en-GB") || v.lang.startsWith("en_GB")) && 
        (v.name.toLowerCase().includes("female") || 
         v.name.toLowerCase().includes("hazel") || 
         v.name.toLowerCase().includes("susan") ||
         v.name.toLowerCase().includes("gb"))
      );
      
      // Fallback 1: Any UK English voice
      if (!selected) {
        selected = allVoices.find(v => v.lang.startsWith("en-GB") || v.lang.startsWith("en_GB"));
      }

      // Fallback 2: Any English Female voice (Samantha, Zira, etc.)
      if (!selected) {
        selected = allVoices.find(v => 
          v.lang.startsWith("en") && 
          (v.name.toLowerCase().includes("female") || 
           v.name.toLowerCase().includes("zira") ||
           v.name.toLowerCase().includes("samantha"))
        );
      }

      // Fallback 3: Any English voice
      if (!selected) {
        selected = allVoices.find(v => v.lang.startsWith("en"));
      }
      
      // Fallback 4: First available voice
      if (!selected && allVoices.length > 0) {
        selected = allVoices[0];
      }

      if (selected) {
        setSelectedVoiceName(selected.name);
      }
      setVoices(allVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Stop speaking when modal is unmounted
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [voices.length]);

  // 3. Audio Sine-Wave Visualizer Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let phase = 0;
    let currentAmplitude = 0;
    const targetAmplitude = isPlaying && !isPaused ? 30 : 0;

    const render = () => {
      // Smooth amplitude transition to damp to a flatline on stop/pause
      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.15;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw 3 layered waves for a premium visualizer effect
      const isLightTheme = document.body.getAttribute('data-theme') === 'light';
      const waveConfigs = [
        { strokeStyle: isLightTheme ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.35)", freq: 0.015, ampMult: 1 },
        { strokeStyle: isLightTheme ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)", freq: 0.025, ampMult: 0.6 },
        { strokeStyle: isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)", freq: 0.01, ampMult: 0.4 }
      ];

      waveConfigs.forEach((cfg) => {
        ctx.beginPath();
        ctx.strokeStyle = cfg.strokeStyle;
        ctx.lineWidth = cfg.ampMult === 1 ? 2.5 : 1.5;

        for (let x = 0; x < width; x++) {
          const y = midY + Math.sin(x * cfg.freq + phase) * (currentAmplitude * cfg.ampMult);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      phase += 0.06;
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused]);

  // 4. Handle speech play/pause/reset actions
  const handlePlayPause = () => {
    if (!data?.script) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      window.speechSynthesis.cancel(); // safety cancel first

      const utterance = new SpeechSynthesisUtterance(data.script);
      utteranceRef.current = utterance;

      // Apply voice
      const activeVoice = voices.find(v => v.name === selectedVoiceName);
      if (activeVoice) utterance.voice = activeVoice;

      // Apply properties
      utterance.rate = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleVoiceChange = (voiceName) => {
    setSelectedVoiceName(voiceName);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.script);
      utteranceRef.current = utterance;
      const activeVoice = voices.find(v => v.name === voiceName);
      if (activeVoice) utterance.voice = activeVoice;
      utterance.rate = 1;
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(utterance);
      setIsPaused(false);
    }
  };

  const getCategoryColor = (cat) => {
    const key = cat ? cat.toUpperCase() : "OTHERS";
    return CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHERS;
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div 
          className={styles.modal} 
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <header className={styles.header}>
            <button className={styles.backButton} onClick={onClose}>← Close</button>
            <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
              ActDone Briefing
            </h2>
            <div style={{ width: 60 }}></div> 
          </header>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Crafting your morning briefing...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--err-msg, #ff5252)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" x2="12" y1="9" y2="13"></line>
                  <line x1="12" x2="12.01" y1="17" y2="17"></line>
                </svg>
              </div>
              <h3 className={styles.errorTitle}>AI Briefing Issue</h3>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryBtn} onClick={loadBriefing}>Try Again</button>
            </div>
          ) : (
            <div className={styles.content}>              
              {/* Segmented Display Mode Tabs */}
              <div className={styles.segmentedToggle}>
                <button 
                  className={`${styles.toggleTab} ${activeTab === "podcast" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setActiveTab("podcast");
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                    Audio Briefing
                  </span>
                </button>
                <button 
                  className={`${styles.toggleTab} ${activeTab === "summary" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setActiveTab("summary");
                    handleStop();
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                    Text Summary
                  </span>
                </button>
              </div>

              {/* ==============================================
                  🎙️ PORT 1: AUDIO PODCAST MODE
                  ============================================== */}
              {activeTab === "podcast" && (
                <div className={styles.podcastLayout}>
                  <div className={styles.podcastCard}>
                    <div className={styles.decalContainer}>
                      <motion.div 
                        className={`${styles.discDecal} ${isPlaying && !isPaused ? styles.discSpinning : ""}`}
                        animate={{ rotate: isPlaying && !isPaused ? 360 : 0 }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 12, 
                          ease: "linear"
                        }}
                      >
                        <div className={styles.discInnerRing}>
                          <div className={styles.discCenter}></div>
                        </div>
                      </motion.div>
                      
                      {/* Visualizer Wave */}
                      <canvas 
                        ref={canvasRef} 
                        className={styles.visualizerCanvas} 
                        width={380} 
                        height={100}
                      />
                    </div>

                    {/* Audio Controls */}
                    <div className={styles.audioControls}>
                      <div className={styles.controlRow}>
                        {/* Play/Pause */}
                        <button 
                          className={styles.playButton} 
                          onClick={handlePlayPause}
                          title={isPlaying && !isPaused ? "Pause Briefing" : "Play Briefing"}
                        >
                          {isPlaying && !isPaused ? (
                            // Pause Icon
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                          ) : (
                            // Play Icon
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                          )}
                        </button>

                        {/* Stop */}
                        {isPlaying && (
                          <button 
                            className={styles.stopButton} 
                            onClick={handleStop}
                            title="Stop Briefing"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Quota Indicator */}
                    {data && (
                      <div className={styles.quotaIndicator}>
                        <span className={styles.quotaDot} style={{ backgroundColor: data.dailyRemaining > 0 ? '#10b981' : '#ef4444' }} />
                        <span className={styles.quotaText}>
                          {data.isProduction 
                            ? `AI Daily Quota: ${data.dailyRemaining} of ${data.dailyLimit} remaining` 
                            : `Daily Quota: Unlimited (Local Dev Mode)`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ==============================================
                  📝 PORT 2: TEXT SUMMARY MODE
                  ============================================== */}
              {activeTab === "summary" && (
                <div className={styles.summaryLayout}>
                  {/* Overview Stats Row */}
                  <div className={styles.summaryStatsRow}>
                    <div className={styles.summaryStatCard}>
                      <span className={styles.statLabel}>Win Rate</span>
                      <span className={styles.statValue}>{data?.completedCount || 0} <span className={styles.statUnit}>tasks</span></span>
                    </div>
                    <div className={styles.summaryStatCard}>
                      <span className={styles.statLabel}>Focus Spurt</span>
                      <span className={styles.statValue}>{data?.focusMinutes || 0} <span className={styles.statUnit}>mins</span></span>
                    </div>
                    <div className={styles.summaryStatCard}>
                      <span className={styles.statLabel}>Active Priorities</span>
                      <span className={styles.statValue}>{data?.activeCount || 0} <span className={styles.statUnit}>tasks</span></span>
                    </div>
                  </div>

                  {/* Dual Grid Layout */}
                  <div className={styles.summaryGrid}>
                    {/* Left Column: Wins & Priorities */}
                    <div className={styles.gridColumn}>
                      <div className={styles.dashboardCard}>
                        <h4 className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                            <path d="m9 12 2 2 4-4"></path>
                          </svg>
                          Yesterday's Accomplishments
                        </h4>
                        {data?.completedTasks && data.completedTasks.length > 0 ? (
                          <div className={styles.taskList}>
                            {data.completedTasks.map((t, idx) => (
                              <div key={idx} className={styles.taskSummaryItem}>
                                <div className={styles.bulletDot} style={{ backgroundColor: getCategoryColor(t.category) }} />
                                <span className={styles.taskTitleText}>{t.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.emptyText}>No completed tasks in the last 24h. Let's conquer something today!</p>
                        )}
                      </div>

                      <div className={styles.dashboardCard} style={{ marginTop: "16px" }}>
                        <h4 className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                          </svg>
                          Today's Target Priorities
                        </h4>
                        {data?.activeTasks && data.activeTasks.length > 0 ? (
                          <div className={styles.taskList}>
                            {data.activeTasks.map((t, idx) => (
                              <div key={idx} className={styles.taskSummaryItem}>
                                <div className={styles.bulletTarget} style={{ borderColor: getCategoryColor(t.category) }} />
                                <div className={styles.taskInfo}>
                                  <span className={styles.taskTitleText}>{t.title}</span>
                                  {t.dueDate && (
                                    <span className={styles.taskDuePill}>Due: {t.dueDate}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.emptyText}>No upcoming priority tasks listed. Add a new task in your dashboard!</p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: AI Script Reader Block */}
                    <div className={styles.gridColumn}>
                      <div className={`${styles.dashboardCard} ${styles.growthCard}`}>
                        <h4 className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                            <path d="M9 18h6"></path>
                            <path d="M10 22h4"></path>
                          </svg>
                          Daily Briefing & Advice
                        </h4>
                        <blockquote className={styles.quoteBlock}>
                          <svg className={styles.quoteIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-4.995 2.638-4.995 5.858 0 .813.533 1.344 1.344 1.344 1.373 0 2.656 1.109 2.656 2.656 0 1.93-1.611 3.532-3.532 3.532-1.921 0-5.451-1.373-5.451-5.451h-.001zm-10.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-4.996 2.638-4.996 5.858 0 .813.533 1.344 1.344 1.344 1.373 0 2.656 1.109 2.656 2.656 0 1.93-1.611 3.532-3.532 3.532-1.92 0-5.451-1.373-5.451-5.451h-.001z"/>
                          </svg>
                          <p className={styles.quoteText}>{data?.script}</p>
                        </blockquote>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
