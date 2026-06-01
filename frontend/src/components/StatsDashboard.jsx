import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, eachDayOfInterval, isSameMonth, startOfDay, endOfDay, isToday } from "date-fns";
import { getAnalytics } from "../api/tasksApi"; 
import { getFocusStats } from "../api/focusApi"; 
import styles from "./StatsDashboard.module.css";

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

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut", staggerChildren: 0.1 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last 365 Days" },
];

function CustomDropdown({ value, onChange, direction = "down" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = FILTER_OPTIONS.find(opt => opt.value === value) || FILTER_OPTIONS[5];

  return (
    <div className={styles.customSelectContainer} ref={dropdownRef}>
      <div 
        className={`${styles.customSelectTrigger} ${isOpen ? styles.triggerActive : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.selectedLabel}>{selectedOption.label}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`}>▾</span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={`${styles.customSelectDropdown} ${direction === "up" ? styles.dropdownUp : styles.dropdownDown}`}
            initial={{ opacity: 0, y: direction === "up" ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "up" ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className={`${styles.customSelectOption} ${opt.value === value ? styles.customSelectOptionActive : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Timezone-safe date parser
const parseLocalYYYYMMDD = (dateInput) => {
  if (!dateInput) return null;
  let dateStr = "";
  if (dateInput instanceof Date) {
    dateStr = format(dateInput, 'yyyy-MM-dd');
  } else if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      dateStr = format(new Date(dateInput), 'yyyy-MM-dd');
    } else {
      dateStr = dateInput.substring(0, 10);
    }
  } else {
    dateStr = format(new Date(dateInput), 'yyyy-MM-dd');
  }
  return new Date(dateStr + "T00:00:00");
};


export default function StatsDashboard({ onClose }) {
  const [rawTasks, setRawTasks] = useState([]);
  const [rawFocusDaily, setRawFocusDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState("tasks"); // "tasks" or "focus"

  // 4 individual filter state variables
  const [filterPart1, setFilterPart1] = useState("365"); // Top Cards
  const [filterPart2, setFilterPart2] = useState("365"); // Heatmap History
  const [filterPart3, setFilterPart3] = useState("365"); // Peak Flow
  const [filterPart4, setFilterPart4] = useState("365"); // Life Balance

  useEffect(() => {
    async function load() {
      try {
        const [res, focusRes] = await Promise.all([
          getAnalytics(),
          getFocusStats().catch((err) => {
            console.error("Focus stats fetch failed", err);
            return { totalMinutes: 0, sessionCount: 0, dailyStats: [] };
          })
        ]);
        
        setRawTasks(res.completedTasks || []);
        setRawFocusDaily(focusRes.dailyStats || []);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // --- Helper to check if a date falls in range ---
  const isDateInRange = (dateInput, filterOption) => {
    if (!dateInput) return false;
    
    // Parse target date timezone-safely
    let targetStr = "";
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        targetStr = format(new Date(dateInput), 'yyyy-MM-dd');
      } else {
        targetStr = dateInput.substring(0, 10);
      }
    } else {
      targetStr = format(new Date(dateInput), 'yyyy-MM-dd');
    }
    
    const targetDate = new Date(targetStr + "T00:00:00");
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const today = new Date(todayStr + "T00:00:00");
    
    if (filterOption === "today") {
      return targetStr === todayStr;
    }
    if (filterOption === "yesterday") {
      const yesterday = subDays(today, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      return targetStr === yesterdayStr;
    }
    if (filterOption === "7") {
      const minDate = subDays(today, 6);
      return targetDate >= minDate && targetDate <= today;
    }
    if (filterOption === "30") {
      const minDate = subDays(today, 29);
      return targetDate >= minDate && targetDate <= today;
    }
    if (filterOption === "90") {
      const minDate = subDays(today, 89);
      return targetDate >= minDate && targetDate <= today;
    }
    if (filterOption === "365") {
      const minDate = subDays(today, 364);
      return targetDate >= minDate && targetDate <= today;
    }
    return true;
  };


  const getHourLabel = (h) => {
      if (h === 0) return '12 AM';
      if (h === 12) return '12 PM';
      return h > 12 ? `${h-12} PM` : `${h} AM`;
  };

  const getCategoryColor = (name) => {
      const key = name ? name.toUpperCase() : 'OTHERS';
      return CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHERS;
  };

  // ========================================================
  // ⚡ PART 1 COMPUTATIONS: Top Cards
  // ========================================================
  const filteredTasks1 = rawTasks.filter(t => isDateInRange(t.completedAt, filterPart1));
  const completedTasksCount = filteredTasks1.length;

  const filteredFocus1 = rawFocusDaily.filter(f => isDateInRange(f.date, filterPart1));
  const focusMinutesCount = filteredFocus1.reduce((sum, f) => sum + (f.minutes || 0), 0);
  const focusSessionsCount = filteredFocus1.reduce((sum, f) => sum + (f.sessions || 0), 0);

  // ========================================================
  // ⚡ PART 2 COMPUTATIONS: Heatmap History
  // ========================================================
  const getHeatmapData = () => {
    const today = new Date();
    let numDays = 365;
    if (filterPart2 === "today") numDays = 1;
    else if (filterPart2 === "yesterday") numDays = 2; // show yesterday and today
    else if (filterPart2 === "7") numDays = 7;
    else if (filterPart2 === "30") numDays = 30;
    else if (filterPart2 === "90") numDays = 90;

    const fromDate = subDays(today, numDays - 1);
    const daysInterval = eachDayOfInterval({ start: fromDate, end: today });

    if (activeMetric === "tasks") {
      let total = 0;
      const history = daysInterval.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const tasksOnDay = rawTasks.filter(t => format(new Date(t.completedAt), 'yyyy-MM-dd') === dateStr);
        const count = tasksOnDay.length;
        total += count;

        let level = 0;
        if (count > 0 && count <= 2) level = 1;
        else if (count > 2 && count <= 4) level = 2;
        else if (count > 4 && count <= 6) level = 3;
        else if (count > 6) level = 4;

        return { date: day, dateStr, count, level };
      });

      const groups = [];
      let currentMonth = [];
      history.forEach((dayObj, index) => {
        if (index === 0 || isSameMonth(dayObj.date, history[index - 1].date)) {
          currentMonth.push(dayObj);
        } else {
          groups.push(currentMonth);
          currentMonth = [dayObj];
        }
      });
      groups.push(currentMonth);
      return { groups, total, label: `${total} tasks completed` };
    } else {
      let total = 0;
      const history = daysInterval.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const foundDay = rawFocusDaily.find(f => f.date === dateStr);
        const minutes = foundDay ? foundDay.minutes : 0;
        total += minutes;

        let level = 0;
        if (minutes > 0 && minutes <= 25) level = 1;
        else if (minutes > 25 && minutes <= 50) level = 2;
        else if (minutes > 50 && minutes <= 75) level = 3;
        else if (minutes > 75) level = 4;

        return { date: day, dateStr, count: minutes, level };
      });

      const groups = [];
      let currentMonth = [];
      history.forEach((dayObj, index) => {
        if (index === 0 || isSameMonth(dayObj.date, history[index - 1].date)) {
          currentMonth.push(dayObj);
        } else {
          groups.push(currentMonth);
          currentMonth = [dayObj];
        }
      });
      groups.push(currentMonth);
      return { groups, total, label: `${Math.round(total)} minutes focused` };
    }
  };

  const heatmap = getHeatmapData();

  // ========================================================
  // ⚡ PART 3 COMPUTATIONS: Peak Flow (Hourly Bar Chart)
  // ========================================================
  const getPeakFlowData = () => {
    const filtered = rawTasks.filter(t => isDateInRange(t.completedAt, filterPart3));
    const hoursCount = Array(24).fill(0);
    filtered.forEach(t => {
      const hour = new Date(t.completedAt).getHours();
      hoursCount[hour]++;
    });

    const list = hoursCount.map((count, hour) => ({ hour, count }));
    const maxVal = Math.max(...hoursCount, 1);
    return { list, maxVal };
  };

  const peakFlow = getPeakFlowData();

  // ========================================================
  // ⚡ PART 4 COMPUTATIONS: Life Balance (Donut Chart)
  // ========================================================
  const getLifeBalanceData = () => {
    const filtered = rawTasks.filter(t => isDateInRange(t.completedAt, filterPart4));
    const counts = {};
    let totalCompleted = 0;

    filtered.forEach(t => {
      const cat = t.category || 'OTHERS';
      counts[cat] = (counts[cat] || 0) + 1;
      totalCompleted++;
    });

    const distribution = Object.entries(counts)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
        count: count,
        percent: totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return { distribution, totalCompleted };
  };

  const lifeBalance = getLifeBalanceData();

  const getDonutGradient = () => {
    if (!lifeBalance.distribution || lifeBalance.distribution.length === 0) return 'conic-gradient(#333 0% 100%)';
    let gradientString = 'conic-gradient(';
    let currentPercent = 0;
    lifeBalance.distribution.forEach((item, index) => {
      const color = getCategoryColor(item.name);
      const start = currentPercent;
      const end = currentPercent + item.percent;
      gradientString += `${color} ${start}% ${end}%`;
      if (index < lifeBalance.distribution.length - 1) gradientString += ', ';
      currentPercent += item.percent;
    });
    gradientString += ')';
    return gradientString;
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div 
          className={styles.modal} 
          onClick={(e) => e.stopPropagation()}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <header className={styles.header}>
            <button className={styles.backButton} onClick={onClose}>← Back</button>
            <h2 className={styles.title}>Productivity</h2>
            <div style={{ width: 60 }}></div> 
          </header>

          {loading ? (
             <div className={styles.loading}>Loading stats...</div>
          ) : (
              <div className={styles.content}>
                
                {/* --- SECTION 0: TOP STATS CARDS --- */}
                <div className={styles.sectionHeaderRow}>
                  <h3 className={styles.sectionTitle}>Overview</h3>
                  <CustomDropdown 
                    value={filterPart1} 
                    onChange={setFilterPart1}
                    direction="down"
                  />
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Completed Tasks</span>
                    <span className={styles.value}>
                      {completedTasksCount} <span className={styles.unit}>tasks</span>
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Focus Time</span>
                    <span className={styles.value}>
                      {Math.round(focusMinutesCount)} <span className={styles.unit}>mins</span>
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Completed Pomodoros</span>
                    <span className={styles.value}>
                      {focusSessionsCount} <span className={styles.unit}>sessions</span>
                    </span>
                  </div>
                </div>

                {/* --- SECTION 1: HEATMAP --- */}
                <motion.div className={styles.chartCard} variants={itemVariants}>
                 <div className={styles.chartHeader}>
                   <span className={styles.chartTitle}>
                     {activeMetric === "tasks" ? "Task Completion History" : "Focus Session History"}
                   </span>
                   <div className={styles.chartControls}>
                     <div className={styles.metricToggle}>
                       <button 
                         className={`${styles.toggleButton} ${activeMetric === "tasks" ? styles.activeToggleButton : ""}`} 
                         onClick={() => setActiveMetric("tasks")}
                       >
                         Tasks
                       </button>
                       <button 
                         className={`${styles.toggleButton} ${activeMetric === "focus" ? styles.activeToggleButton : ""}`} 
                         onClick={() => setActiveMetric("focus")}
                       >
                         Focus Time
                       </button>
                     </div>
                      <CustomDropdown 
                        value={filterPart2} 
                        onChange={setFilterPart2}
                        direction="down"
                      />
                   </div>
                 </div>
                 
                 <div className={styles.monthsScrollContainer}>
                   {heatmap.groups.map((monthDays, mIndex) => {
                       const monthLabel = format(monthDays[0].date, 'MMM');
                       return (
                           <div key={mIndex} className={styles.monthBlock}>
                               <div className={styles.monthTitle}>{monthLabel}</div>
                               <div className={styles.daysGrid}>
                                   {monthDays.map((dayObj) => (
                                       <motion.div 
                                           key={dayObj.dateStr}
                                           className={`${styles.daySquare} ${
                                             activeMetric === "tasks" 
                                               ? styles['level' + dayObj.level] 
                                               : styles['focusLevel' + dayObj.level]
                                           }`}
                                           data-tooltip-id="custom-tooltip"
                                           data-tooltip-content={
                                             activeMetric === "tasks"
                                               ? `${dayObj.count} tasks completed on ${format(dayObj.date, 'MMM do')}`
                                               : `${dayObj.count} mins focused on ${format(dayObj.date, 'MMM do')}`
                                           }
                                           initial={{ scale: 0 }}
                                           animate={{ scale: 1 }}
                                           transition={{ delay: 0.3 + (Math.random() * 0.2) }}
                                        />
                                   ))}
                               </div>
                           </div>
                       );
                   })}
                 </div>
 
                 <div className={styles.chartFooter}>
                    <div className={styles.totalCount}>
                      {activeMetric === "tasks" 
                        ? `${heatmap.total} tasks completed in selected range`
                        : `${Math.round(heatmap.total)} minutes focused in selected range`
                      }
                    </div>
                    <div className={styles.legend}>
                      <span>Less</span>
                      {[0,1,2,3,4].map(lvl => (
                        <div 
                          key={lvl} 
                          className={`${styles.legendSquare} ${
                            activeMetric === "tasks" 
                              ? styles['level' + lvl] 
                              : styles['focusLevel' + lvl]
                          }`} 
                          data-tooltip-id="custom-tooltip" 
                          data-tooltip-content={
                            activeMetric === "tasks"
                              ? `${lvl === 0 ? '0' : lvl === 4 ? '7+' : (lvl*2-1) + '-' + (lvl*2)} tasks`
                              : `${lvl === 0 ? '0' : lvl === 4 ? '76+' : (lvl === 1 ? '1-25' : lvl === 2 ? '26-50' : '51-75')} mins`
                          } 
                        />
                      ))}
                      <span>More</span>
                    </div>
                 </div>
                </motion.div>

                {/* --- SECTION 2: PEAK FLOW --- */}
               <motion.div className={styles.chartCard} style={{ marginTop: '20px' }} variants={itemVariants}>
                  <div className={styles.chartHeader}>
                      <span className={styles.chartTitle}>Peak Flow (Hourly Productivity)</span>
                      <CustomDropdown 
                        value={filterPart3} 
                        onChange={setFilterPart3}
                        direction="up"
                      />
                  </div>
                  
                  <div className={styles.barChartContainer}>
                      {peakFlow.list.map((dataPoint, idx) => {
                          const heightPct = (dataPoint.count / peakFlow.maxVal) * 100;
                          const isLabelVisible = dataPoint.hour % 3 === 0; 

                          return (
                              <div key={dataPoint.hour} className={styles.barWrapper}>
                                      <motion.div 
                                          className={styles.bar} 
                                          initial={{ height: 0 }}
                                          animate={{ height: `${Math.max(heightPct, 4)}%` }}
                                          transition={{ delay: 0.4 + (idx * 0.02), duration: 0.5, ease: "easeOut" }}
                                          style={{ 
                                              backgroundColor: dataPoint.count > 0 ? 'var(--text-primary)' : 'var(--surface-3)',
                                              opacity: dataPoint.count > 0 ? 1 : 0.5
                                          }}
                                          data-tooltip-id="custom-tooltip"
                                          data-tooltip-content={`${dataPoint.count} tasks at ${getHourLabel(dataPoint.hour)}`}
                                      />
                                      {isLabelVisible && (
                                          <span className={styles.barLabel}>{getHourLabel(dataPoint.hour)}</span>
                                      )}
                              </div>
                          );
                      })}
                  </div>
               </motion.div>

               {/* --- SECTION 3: LIFE BALANCE --- */}
               <motion.div className={styles.chartCard} style={{ marginTop: '20px', marginBottom: '40px' }} variants={itemVariants}>
                  <div className={styles.chartHeader}>
                      <span className={styles.chartTitle}>Life Balance (Category Distribution)</span>
                      <CustomDropdown 
                        value={filterPart4} 
                        onChange={setFilterPart4}
                        direction="up"
                      />
                  </div>

                  <div className={styles.donutContainer}>
                      {lifeBalance.distribution.length > 0 ? (
                          <>
                              <motion.div 
                                  className={styles.donutChart} 
                                  key={filterPart4} // Force re-animation on filter update
                                  style={{ background: getDonutGradient() }}
                                  initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
                                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                  transition={{ 
                                      duration: 1.2, 
                                      ease: [0.34, 1.56, 0.64, 1],
                                      delay: 0.1 
                                  }}
                              />

                              <div className={styles.legendContainer}>
                                  {lifeBalance.distribution.map((item, idx) => (
                                      <motion.div 
                                        key={item.name} 
                                        className={styles.legendItem}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + (idx * 0.1) }}
                                      >
                                          <div className={styles.legendLeft}>
                                              <div className={styles.legendDot} style={{ backgroundColor: getCategoryColor(item.name) }} />
                                              <span className={styles.legendText}>{item.name}</span>
                                          </div>
                                          <span className={styles.legendPercent}>{item.percent}%</span>
                                      </motion.div>
                                  ))}
                              </div>
                          </>
                      ) : (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', padding: '20px' }}>
                              No completed tasks in this time range.
                          </div>
                      )}
                  </div>
               </motion.div>

               <ReactTooltip 
                   id="custom-tooltip" 
                   style={{ 
                       backgroundColor: 'var(--surface-3)', 
                       color: 'var(--text-primary)', 
                       border: '1px solid var(--border)',
                       borderRadius: '6px', 
                       padding: '8px 12px',
                       zIndex: 10000 
                   }} 
                 />
              </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}