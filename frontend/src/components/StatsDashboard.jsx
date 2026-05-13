import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { format, subDays, eachDayOfInterval, isSameMonth } from "date-fns";
import { getAnalytics } from "../api/tasksApi"; 
import styles from "./StatsDashboard.module.css";

// 🔥 CATEGORY COLORS CONFIGURATION
const CATEGORY_COLORS = {
  WORK: "#3b82f6",      // Blue
  PERSONAL: "#8b5cf6",  // Purple
  SHOPPING: "#eab308",  // Yellow
  HEALTH: "#ef4444",    // Red
  LEARNING: "#22c55e",  // Green
  FINANCE: "#10b981",   // Emerald
  TRAVEL: "#06b6d4",    // Cyan
  OTHERS: "#6b7280"     // Gray
};

export default function StatsDashboard({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [monthGroups, setMonthGroups] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [peakFlowData, setPeakFlowData] = useState([]);
  const [maxPeak, setMaxPeak] = useState(0);
  const [distribution, setDistribution] = useState([]); 

  useEffect(() => {
    async function load() {
      try {
        const res = await getAnalytics();
        
        // 1. Heatmap Setup
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
                // Calculation: 1-2=Lvl1, 3-4=Lvl2, 5-6=Lvl3, 7+=Lvl4
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

        // 2. Peak Flow Setup
        const flows = (res.peakFlow && res.peakFlow.length > 0) 
            ? res.peakFlow 
            : Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        const maxVal = Math.max(...flows.map(f => f.count), 1); 

        // 3. Distribution Setup
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

  const hours = data ? Math.floor(data.totalMinutes / 60) : 0;
  const mins = data ? data.totalMinutes % 60 : 0;

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        <header className={styles.header}>
          <button className={styles.backButton} onClick={onClose}>← Back</button>
          <h2 className={styles.title}>Productivity</h2>
          <div style={{ width: 60 }}></div> 
        </header>

        {loading ? (
           <div className={styles.loading}>Loading stats...</div>
        ) : (
           <div className={styles.content}>
             
             {/* --- TOP ROW: STATS --- */}
             <div className={styles.statsGrid}>
               <div className={styles.statCard}>
                 <div className={styles.label}>Focus Time</div>
                 <div className={styles.value}>
                   {hours}<span className={styles.unit}>h</span> {mins}<span className={styles.unit}>m</span>
                 </div>
               </div>
               <div className={styles.statCard}>
                 <div className={styles.label}>Focus Sessions</div>
                 <div className={styles.value}>{data?.totalSessions || 0}</div>
               </div>
             </div>

             {/* --- SECTION 1: HEATMAP --- */}
             <div className={styles.chartCard}>
               <div className={styles.chartHeader}>
                 <span className={styles.chartTitle}>Task Completion History</span>
               </div>
               
               <div className={styles.monthsScrollContainer}>
                 {monthGroups.map((monthDays, mIndex) => {
                     const monthLabel = format(monthDays[0].date, 'MMM');
                     return (
                         <div key={mIndex} className={styles.monthBlock}>
                             <div className={styles.monthTitle}>{monthLabel}</div>
                             <div className={styles.daysGrid}>
                                 {monthDays.map((dayObj) => (
                                     <div 
                                         key={dayObj.dateStr}
                                         className={`${styles.daySquare} ${styles['level' + dayObj.level]}`}
                                         data-tooltip-id="custom-tooltip"
                                         data-tooltip-content={`${dayObj.count} tasks on ${format(dayObj.date, 'MMM do')}`}
                                      />
                                 ))}
                             </div>
                         </div>
                     );
                 })}
               </div>

               {/* 🔥 UPDATED LEGEND WITH TOOLTIPS */}
               <div className={styles.chartFooter}>
                  <div className={styles.totalCount}>{totalTasks} tasks in the last year</div>
                  <div className={styles.legend}>
                    <span>Less</span>
                    <div 
                        className={`${styles.legendSquare} ${styles.level0}`} 
                        data-tooltip-id="custom-tooltip" 
                        data-tooltip-content="0 tasks" 
                    />
                    <div 
                        className={`${styles.legendSquare} ${styles.level1}`} 
                        data-tooltip-id="custom-tooltip" 
                        data-tooltip-content="1-2 tasks" 
                    />
                    <div 
                        className={`${styles.legendSquare} ${styles.level2}`} 
                        data-tooltip-id="custom-tooltip" 
                        data-tooltip-content="3-4 tasks" 
                    />
                    <div 
                        className={`${styles.legendSquare} ${styles.level3}`} 
                        data-tooltip-id="custom-tooltip" 
                        data-tooltip-content="5-6 tasks" 
                    />
                    <div 
                        className={`${styles.legendSquare} ${styles.level4}`} 
                        data-tooltip-id="custom-tooltip" 
                        data-tooltip-content="7+ tasks" 
                    />
                    <span>More</span>
                  </div>
               </div>
             </div>

             {/* --- SECTION 2: PEAK FLOW --- */}
             <div className={styles.chartCard} style={{ marginTop: '20px' }}>
                <div className={styles.chartHeader}>
                    <span className={styles.chartTitle}>Peak Flow</span>
                </div>
                
                <div className={styles.barChartContainer}>
                    {peakFlowData.map((dataPoint) => {
                        const heightPct = (dataPoint.count / maxPeak) * 100;
                        const isLabelVisible = dataPoint.hour % 3 === 0; 

                        return (
                            <div key={dataPoint.hour} className={styles.barWrapper}>
                                    <div 
                                        className={styles.bar} 
                                        style={{ 
                                            height: `${Math.max(heightPct, 4)}%`, 
                                            backgroundColor: dataPoint.count > 0 ? '#3b82f6' : 'var(--surface-3)',
                                            opacity: dataPoint.count > 0 ? 1 : 0.5
                                        }}
                                        data-tooltip-id="custom-tooltip"
                                        data-tooltip-content={`${dataPoint.count} tasks at ${getHourLabel(dataPoint.hour)}`}
                                    ></div>
                                    {isLabelVisible && (
                                        <span className={styles.barLabel}>{getHourLabel(dataPoint.hour)}</span>
                                    )}
                            </div>
                        );
                    })}
                </div>
             </div>

             {/* --- SECTION 3: LIFE BALANCE (Donut) --- */}
             <div className={styles.chartCard} style={{ marginTop: '20px' }}>
                <div className={styles.chartHeader}>
                    <span className={styles.chartTitle}>Life Balance</span>
                </div>

                <div className={styles.donutContainer}>
                    {distribution.length > 0 ? (
                        <>
                            <div 
                                className={styles.donutChart} 
                                style={{ background: getDonutGradient() }}
                            ></div>

                            <div className={styles.legendContainer}>
                                {distribution.map((item) => (
                                    <div key={item.name} className={styles.legendItem}>
                                        <div className={styles.legendLeft}>
                                            <div 
                                                className={styles.legendDot} 
                                                style={{ backgroundColor: getCategoryColor(item.name) }}
                                            ></div>
                                            <span className={styles.legendText}>{item.name}</span>
                                        </div>
                                        <span className={styles.legendPercent}>{item.percent}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', padding: '20px' }}>
                            No completed tasks yet.
                        </div>
                    )}
                </div>
             </div>

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
      </div>
    </div>,
    document.body
  );
}