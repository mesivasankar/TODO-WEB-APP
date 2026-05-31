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
  useEffect(() => {
    async function load() {
      try {
        const res = await getDailyBriefing();
        setData(res);
        
        // Typewriter animation trigger
        if (res.script) {
          let charIndex = 0;
          const interval = setInterval(() => {
            setVisibleText(prev => prev + res.script.charAt(charIndex));
            charIndex++;
            if (charIndex >= res.script.length) {
              clearInterval(interval);
            }
          }, 15);
          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to load morning briefing", err);
      } finally {
        setLoading(false);
      }
    }
    load();
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
      const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
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
            <h2 className={styles.title}>🎙️ ActDone Briefing</h2>
            <div style={{ width: 60 }}></div> 
          </header>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Crafting your morning briefing...</p>
            </div>
          ) : (
            <div className={styles.content}>
              
              {/* Segmented Display Mode Tabs */}
              <div className={styles.segmentedToggle}>
                <button 
                  className={`${styles.toggleTab} ${activeTab === "podcast" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setActiveTab("podcast");
                    // Stop audio when switching tabs? Or keep playing? Let's stop to be clean, or let it play
                  }}
                >
                  🎧 Audio Briefing
                </button>
                <button 
                  className={`${styles.toggleTab} ${activeTab === "summary" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setActiveTab("summary");
                    handleStop(); // Stop reading when switching to text view
                  }}
                >
                  📝 Text Summary
                </button>
              </div>

              {/* ==============================================
                  🎙️ PORT 1: AUDIO PODCAST MODE
                  ============================================== */}
              {activeTab === "podcast" && (
                <div className={styles.podcastLayout}>
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
                        <h4 className={styles.cardHeader}>🌅 Yesterday's Accomplishments</h4>
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
                        <h4 className={styles.cardHeader}>🎯 Today's Target Priorities</h4>
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
                        <h4 className={styles.cardHeader}>💡 Daily Briefing & Advice</h4>
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
