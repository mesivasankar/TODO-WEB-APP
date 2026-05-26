import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, eachDayOfInterval, isSameMonth } from "date-fns";
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

export default function StatsDashboard({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthGroups, setMonthGroups] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [peakFlowData, setPeakFlowData] = useState([]);
  const [maxPeak, setMaxPeak] = useState(0);
  const [distribution, setDistribution] = useState([]); 
  const [focusStats, setFocusStats] = useState({ totalMinutes: 0, sessionCount: 0, dailyStats: [] });

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
        
        if (focusRes) {
          setFocusStats({
            totalMinutes: focusRes.totalMinutes || 0,
            sessionCount: focusRes.sessionCount || 0,
            dailyStats: focusRes.dailyStats || []
          });
        }
        
        const today = new Date();
        const fromDate = subDays(today, 364); 
        const allDays = eachDayOfInterval({ start: fromDate, end: today });

        let total = 0;
        const fullHistory = allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const foundDay = res.heatmap ? res.heatmap.find(d => d.date === dateStr) : null;
            const count = foundDay ? foundDay.count : 0;
            total += count;
            return { 
                date: day, 
                dateStr, 
                count: count, 
                level: foundDay ? Math.min(4, Math.max(0, foundDay.level)) : 0 
            };
        });

        const groups = [];
        let currentMonth = [];
        fullHistory.forEach((dayObj, index) => {
            if (index === 0 || isSameMonth(dayObj.date, fullHistory[index - 1].date)) {
                currentMonth.push(dayObj);
            } else {
                groups.push(currentMonth);
                currentMonth = [dayObj];
            }
        });
        groups.push(currentMonth); 

        const flows = (res.peakFlow && res.peakFlow.length > 0) 
            ? res.peakFlow 
            : Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        const maxVal = Math.max(...flows.map(f => f.count), 1); 

        setDistribution(res.distribution || []);
        setMonthGroups(groups);
        setTotalTasks(total);
        setPeakFlowData(flows);
        setMaxPeak(maxVal);
        setData(res);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getHourLabel = (h) => {
      if (h === 0) return '12 AM';
      if (h === 12) return '12 PM';
      return h > 12 ? `${h-12} PM` : `${h} AM`;
  };

  const getCategoryColor = (name) => {
      const key = name ? name.toUpperCase() : 'OTHERS';
      return CATEGORY_COLORS[key] || CATEGORY_COLORS.OTHERS;
  };

  const getDonutGradient = () => {
    if (!distribution || distribution.length === 0) return 'conic-gradient(#333 0% 100%)';
    let gradientString = 'conic-gradient(';
    let currentPercent = 0;
    distribution.forEach((item, index) => {
      const color = getCategoryColor(item.name);
      const start = currentPercent;
      const end = currentPercent + item.percent;
      gradientString += `${color} ${start}% ${end}%`;
      if (index < distribution.length - 1) gradientString += ', ';
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
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Completed Tasks (Last 1 Year)</span>
                    <span className={styles.value}>
                      {totalTasks} <span className={styles.unit}>tasks</span>
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Focus Time (All-Time)</span>
                    <span className={styles.value}>
                      {focusStats.totalMinutes} <span className={styles.unit}>mins</span>
                    </span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.label}>Completed Pomodoros (All-Time)</span>
                    <span className={styles.value}>
                      {focusStats.sessionCount} <span className={styles.unit}>sessions</span>
                    </span>
                  </div>
                </div>

                {/* --- SECTION 1: HEATMAP --- */}
                <motion.div className={styles.chartCard} variants={itemVariants}>
                 <div className={styles.chartHeader}>
                   <span className={styles.chartTitle}>Task Completion History (Last 1 Year)</span>
                 </div>
                 
                 <div className={styles.monthsScrollContainer}>
                   {monthGroups.map((monthDays, mIndex) => {
                       const monthLabel = format(monthDays[0].date, 'MMM');
                       return (
                           <div key={mIndex} className={styles.monthBlock}>
                               <div className={styles.monthTitle}>{monthLabel}</div>
                               <div className={styles.daysGrid}>
                                   {monthDays.map((dayObj) => (
                                       <motion.div 
                                           key={dayObj.dateStr}
                                           className={`${styles.daySquare} ${styles['level' + dayObj.level]}`}
                                           data-tooltip-id="custom-tooltip"
                                           data-tooltip-content={`${dayObj.count} tasks on ${format(dayObj.date, 'MMM do')}`}
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
                    <div className={styles.totalCount}>{totalTasks} tasks in the last year</div>
                    <div className={styles.legend}>
                      <span>Less</span>
                      {[0,1,2,3,4].map(lvl => (
                        <div key={lvl} className={`${styles.legendSquare} ${styles['level' + lvl]}`} data-tooltip-id="custom-tooltip" data-tooltip-content={`${lvl === 0 ? '0' : lvl === 4 ? '7+' : (lvl*2-1) + '-' + (lvl*2)} tasks`} />
                      ))}
                      <span>More</span>
                    </div>
                 </div>
                </motion.div>



                {/* --- SECTION 2: PEAK FLOW --- */}
               <motion.div className={styles.chartCard} style={{ marginTop: '20px' }} variants={itemVariants}>
                  <div className={styles.chartHeader}>
                      <span className={styles.chartTitle}>Peak Flow (All-Time)</span>
                  </div>
                  
                  <div className={styles.barChartContainer}>
                      {peakFlowData.map((dataPoint, idx) => {
                          const heightPct = (dataPoint.count / maxPeak) * 100;
                          const isLabelVisible = dataPoint.hour % 3 === 0; 

                          return (
                              <div key={dataPoint.hour} className={styles.barWrapper}>
                                      <motion.div 
                                          className={styles.bar} 
                                          initial={{ height: 0 }}
                                          animate={{ height: `${Math.max(heightPct, 4)}%` }}
                                          transition={{ delay: 0.4 + (idx * 0.02), duration: 0.5, ease: "easeOut" }}
                                          style={{ 
                                              backgroundColor: dataPoint.count > 0 ? '#3b82f6' : 'var(--surface-3)',
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
                      <span className={styles.chartTitle}>Life Balance (All-Time)</span>
                  </div>

                  <div className={styles.donutContainer}>
                      {distribution.length > 0 ? (
                          <>
                              <motion.div 
                                  className={styles.donutChart} 
                                  style={{ background: getDonutGradient() }}
                                  initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
                                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                  transition={{ 
                                      duration: 1.2, 
                                      ease: [0.34, 1.56, 0.64, 1], // Custom springy ease
                                      delay: 0.4 
                                  }}
                              />

                              <div className={styles.legendContainer}>
                                  {distribution.map((item, idx) => (
                                      <motion.div 
                                        key={item.name} 
                                        className={styles.legendItem}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + (idx * 0.1) }}
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
                              No completed tasks yet.
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