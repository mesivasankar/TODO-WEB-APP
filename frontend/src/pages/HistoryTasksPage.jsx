import React, { useState, useEffect, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { format, parse, isToday, isYesterday, subDays, startOfDay } from "date-fns";
import "react-day-picker/dist/style.css";

import styles from "./HistoryTasksPage.module.css";
import { getTasksHistory, toggleTaskComplete, deleteTask, permanentDeleteTask, restoreTask } from "../api/tasksApi";
import { useToast } from "../contexts/ToastContext";

// Simple icon components
const CalendarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const SyncIcon = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--primary, #3b82f6)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "color 0.2s" }}>
    <path d="M17 1s4 4-4 4H5a2 2 0 0 0-2 2v3a1 1 0 0 0 2 0V7h8a2 2 0 0 1 2 2v1"></path>
    <path d="M7 23s-4-4 4-4h8a2 2 0 0 0 2-2v-3a1 1 0 0 0-2 0v3H9a2 2 0 0 1-2-2v-1"></path>
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
);

const UnlinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.7 11.07A5.002 5.002 0 0 0 11.4 5.2l-1.71 1.71"></path><path d="M8 12a5 5 0 0 0 5 5l2-2"></path><path d="M18.9 14.8l1.72-1.72a5 5 0 0 0-7.07-7.07l-1.41 1.41"></path></svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
);

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const cleanDate = dateString.substring(0, 10);
  return parse(cleanDate, "yyyy-MM-dd", new Date());
};

const getLocalISODate = (dateObj = new Date()) => {
  return format(dateObj, "yyyy-MM-dd");
};

// Custom Dropdown Calendar
const DatePicker = ({ filter, onChange, placeholder = "Last 365 Days" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false); // 'single' | 'range' | false
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetSelect = (type) => {
    if (type === "single" || type === "range") {
      setShowCalendar(type);
    } else {
      onChange({ type, date: null, range: null });
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  const handleDaySelect = (day) => {
    if (showCalendar === "single") {
      if (day) {
        onChange({ type: "single", date: getLocalISODate(day), range: null });
      }
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  const handleRangeSelect = (range) => {
    onChange({ type: "range", date: null, range });
    if (range && range.from && range.to) {
      setTimeout(() => {
        setIsOpen(false);
        setShowCalendar(false);
      }, 300);
    }
  };

  const formattedDisplay = useMemo(() => {
    switch (filter.type) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "90days":
        return "Last 90 Days";
      case "365days":
        return "Last 365 Days";
      case "single":
        if (!filter.date) return "Select Date";
        return format(safeParseDate(filter.date), "MMM d, yyyy");
      case "range":
        if (!filter.range || !filter.range.from) return "Select Range";
        const fromStr = format(filter.range.from, "MMM d");
        const toStr = filter.range.to ? format(filter.range.to, "MMM d") : "...";
        return `${fromStr} - ${toStr}`;
      default:
        return placeholder;
    }
  }, [filter, placeholder]);

  return (
    <div className={styles.datePickerContainer} ref={containerRef}>
      <button className={`${styles.datePickerButton} ${isOpen ? styles.open : ""}`} onClick={() => setIsOpen(!isOpen)}>
        <span>{formattedDisplay}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.up : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.calendarDropdown}>
          {!showCalendar ? (
            <div className={styles.presetsMenu}>
              <button className={`${styles.menuItem} ${filter.type === 'today' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("today")}>Today</button>
              <button className={`${styles.menuItem} ${filter.type === 'yesterday' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("yesterday")}>Yesterday</button>
              <button className={`${styles.menuItem} ${filter.type === '7days' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("7days")}>Last 7 Days</button>
              <button className={`${styles.menuItem} ${filter.type === '30days' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("30days")}>Last 30 Days</button>
              <button className={`${styles.menuItem} ${filter.type === '90days' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("90days")}>Last 90 Days</button>
              <button className={`${styles.menuItem} ${filter.type === '365days' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("365days")}>Last 365 Days</button>
              <div className={styles.menuDivider} />
              <button className={`${styles.menuItem} ${filter.type === 'single' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("single")}>Select Specific Date</button>
              <button className={`${styles.menuItem} ${filter.type === 'range' ? styles.activeItem : ''}`} onClick={() => handlePresetSelect("range")}>Select Date Range</button>
            </div>
          ) : (
            <div className={styles.calendarContainer}>
              <div className={styles.calendarHeader}>
                <button className={styles.backBtn} onClick={() => setShowCalendar(false)}>← Back</button>
                <span className={styles.calendarTitle}>
                  {showCalendar === "single" ? "Choose a Date" : "Choose Range"}
                </span>
              </div>

              {showCalendar === "single" ? (
                <DayPicker
                  mode="single"
                  selected={filter.date ? safeParseDate(filter.date) : undefined}
                  onSelect={handleDaySelect}
                  showOutsideDays
                  className={styles.rdpCustom}
                />
              ) : (
                <DayPicker
                  mode="range"
                  selected={filter.range || undefined}
                  onSelect={handleRangeSelect}
                  showOutsideDays
                  className={styles.rdpCustom}
                />
              )}

              <div className={styles.calendarFooter}>
                <button className={styles.footerBtn} onClick={() => {
                  onChange({ type: "365days", date: null, range: null });
                  setIsOpen(false);
                  setShowCalendar(false);
                }}>
                  Clear Filter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function HistoryTasksPage() {
  const { lists } = useOutletContext();
  const { showUndoToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(true);

  // Advanced filters state
  const [completedFilter, setCompletedFilter] = useState({ type: "365days", date: null, range: null });
  const [incompleteFilter, setIncompleteFilter] = useState({ type: "365days", date: null, range: null });

  // Mobile / Touch swipe layout state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [activeTab, setActiveTab] = useState("completed"); // "completed" or "incomplete"

  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const scrollContainerRef = useRef(null);
  const isManualScrolling = useRef(false);
  const isInternalTabChange = useRef(false);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Click outside to close options menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOptionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToColumn = (col) => {
    if (!scrollContainerRef.current) return;
    const colElement = scrollContainerRef.current.querySelector(`[data-col-id="${col}"]`);
    if (colElement) {
      isManualScrolling.current = true;
      if (activeTab !== col) {
        isInternalTabChange.current = true;
        setActiveTab(col);
      }
      colElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      setTimeout(() => { isManualScrolling.current = false; }, 600);
    }
  };

  // Sync swipe -> active chip highlight
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      if (width === 0) return;

      const index = Math.round(scrollLeft / width);
      const cols = ["completed", "incomplete"];
      const currentCol = cols[index];
      if (currentCol && activeTab !== currentCol) {
        isInternalTabChange.current = true;
        setActiveTab(currentCol);
      }
    };

    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, activeTab]);

  // Load history on mount
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getTasksHistory();
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load history tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Sync date change handlers
  const handleCompletedFilterChange = (newFilter) => {
    setCompletedFilter(newFilter);
    if (isSynced) {
      setIncompleteFilter(newFilter);
    }
  };

  const handleIncompleteFilterChange = (newFilter) => {
    setIncompleteFilter(newFilter);
    if (isSynced) {
      setCompletedFilter(newFilter);
    }
  };

  const handleToggleSync = () => {
    const nextSync = !isSynced;
    setIsSynced(nextSync);
    if (nextSync) {
      setIncompleteFilter(completedFilter);
    }
  };

  // Perform task complete toggle
  const handleToggleTask = async (task) => {
    const originalStatus = task.is_completed;
    const targetStatus = !originalStatus;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: targetStatus } : t))
    );

    try {
      await toggleTaskComplete(task.id, targetStatus);
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error("Failed to toggle task status:", err);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: originalStatus } : t))
      );
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    showUndoToast(
      "Task deleted",
      async () => {
        setTasks((prev) => [...prev, taskToDelete]);
        try {
          await restoreTask(taskId);
          window.dispatchEvent(new Event("app-data-changed"));
        } catch (err) {
          console.error("Failed to restore task:", err);
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        }
      },
      async () => {
        try {
          await permanentDeleteTask(taskId);
        } catch (err) {
          console.error("Failed to permanently delete task:", err);
        }
      }
    );

    try {
      await deleteTask(taskId);
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Helper to filter tasks by the filter state
  const isTaskInFilterRange = (task, filter) => {
    if (!task.due_date) return false;

    const taskDateObj = startOfDay(safeParseDate(task.due_date));
    const today = startOfDay(new Date());

    switch (filter.type) {
      case "today":
        return isToday(taskDateObj);
      case "yesterday":
        return isYesterday(taskDateObj);
      case "7days": {
        const sevenDaysAgo = subDays(today, 7);
        return taskDateObj >= sevenDaysAgo && taskDateObj <= today;
      }
      case "30days": {
        const thirtyDaysAgo = subDays(today, 30);
        return taskDateObj >= thirtyDaysAgo && taskDateObj <= today;
      }
      case "90days": {
        const ninetyDaysAgo = subDays(today, 90);
        return taskDateObj >= ninetyDaysAgo && taskDateObj <= today;
      }
      case "365days": {
        const yearAgo = subDays(today, 365);
        return taskDateObj >= yearAgo && taskDateObj <= today;
      }
      case "single":
        if (!filter.date) return true;
        return format(taskDateObj, "yyyy-MM-dd") === filter.date;
      case "range":
        if (!filter.range || !filter.range.from) return true;
        const from = startOfDay(filter.range.from);
        const to = filter.range.to ? startOfDay(filter.range.to) : from;
        return taskDateObj >= from && taskDateObj <= to;
      default:
        return true;
    }
  };

  // Process and filter tasks for display
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.is_completed) return false;
      return isTaskInFilterRange(t, completedFilter);
    });
  }, [tasks, completedFilter]);

  const incompleteTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.is_completed) return false;
      return isTaskInFilterRange(t, incompleteFilter);
    });
  }, [tasks, incompleteFilter]);

  // Grouping function helper
  const groupTasksByDate = (taskList) => {
    const groups = {};
    taskList.forEach((task) => {
      const dateStr = task.due_date || "No Due Date";
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(task);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        if (a === "No Due Date") return 1;
        if (b === "No Due Date") return -1;
        return b.localeCompare(a);
      })
      .map((dateKey) => {
        let label = dateKey;
        if (dateKey !== "No Due Date") {
          const dateObj = safeParseDate(dateKey);
          if (isToday(dateObj)) label = "Today";
          else if (isYesterday(dateObj)) label = "Yesterday";
          else label = format(dateObj, "MMMM d, yyyy");
        }
        return {
          date: dateKey,
          label,
          items: groups[dateKey],
        };
      });
  };

  const groupedCompleted = useMemo(() => groupTasksByDate(completedTasks), [completedTasks]);
  const groupedIncomplete = useMemo(() => groupTasksByDate(incompleteTasks), [incompleteTasks]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topBar}>
        {isMobile ? (
          <div className={styles.chipNav}>
            <button
              className={`${styles.chip} ${activeTab === "completed" ? styles.activeChip : ""}`}
              onClick={() => scrollToColumn("completed")}
            >
              <span>Completed Tasks</span>
              <span className={styles.chipCount}>{completedTasks.length}</span>
            </button>
            <button
              className={`${styles.chip} ${activeTab === "incomplete" ? styles.activeChip : ""}`}
              onClick={() => scrollToColumn("incomplete")}
            >
              <span>Incomplete Tasks</span>
              <span className={styles.chipCount}>{incompleteTasks.length}</span>
            </button>
          </div>
        ) : (
          <div className={styles.desktopTitleArea}>
            <h1 className={styles.desktopTitle}>History</h1>
            <span className={styles.desktopSubtitle}>Tasks with due dates from the last 365 days</span>
          </div>
        )}

        <div className={styles.menuWrapper} ref={menuRef}>
          <button className={styles.menuButton} onClick={() => setOptionsMenuOpen(p => !p)} title="Options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
          {optionsMenuOpen && (
            <div className={styles.optionsDropdown}>
              {isMobile && (
                <>
                  <div className={styles.infoSection}>
                    <h4 className={styles.infoTitle}>History</h4>
                    <p className={styles.infoDesc}>Tasks with due dates from the last 365 days</p>
                  </div>
                  <div className={styles.menuDivider} />
                </>
              )}
              <button className={styles.menuItem} onClick={() => { setOptionsMenuOpen(false); fetchHistory(); }}>
                <RefreshIcon />
                <span>Refresh</span>
              </button>
              <button className={styles.menuItem} onClick={() => { setOptionsMenuOpen(false); handleToggleSync(); }}>
                {isSynced ? <LinkIcon /> : <UnlinkIcon />}
                <span>{isSynced ? "Unlink Filters" : "Link/Sync Filters"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className="shimmer-skeleton" style={{ width: "100%", height: "200px", borderRadius: "16px" }} />
          <div className="shimmer-skeleton" style={{ width: "100%", height: "200px", borderRadius: "16px" }} />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={`${styles.cardsGrid} ${isMobile ? styles.mobileLayout : ""}`}
        >
          {/* COMPLETED CARD */}
          <div className={styles.cardWrapper} data-col-id="completed">
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInfo}>
                  <span className={styles.cardDot} style={{ backgroundColor: "#10b981" }} />
                  <h2 className={styles.cardTitle}>Completed Tasks</h2>
                  <span className={styles.cardCount}>{completedTasks.length}</span>
                </div>
                <DatePicker
                  filter={completedFilter}
                  onChange={handleCompletedFilterChange}
                  placeholder="Last 365 Days"
                />
              </div>

              <div className={styles.taskListContainer}>
                {groupedCompleted.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No completed tasks found in this period.</p>
                  </div>
                ) : (
                  groupedCompleted.map((group) => (
                    <div key={group.date} className={styles.dateGroup}>
                      <h3 className={styles.groupHeader}>{group.label}</h3>
                      <ul className={styles.list}>
                        {group.items.map((task) => (
                          <li key={task.id} className={`${styles.taskItem} ${styles.completed}`}>
                            <button
                              className={styles.checkboxWrapper}
                              onClick={() => handleToggleTask(task)}
                            >
                              <div className={`${styles.checkbox} ${styles.checked}`}>
                                <CheckIcon />
                              </div>
                            </button>
                            <div className={styles.taskText}>
                              <span className={styles.taskTitle}>{task.title}</span>
                              {task.description && (
                                <span className={styles.taskDesc}>{task.description}</span>
                              )}
                              <div className={styles.taskBadgesRow}>
                                {task.due_date && (
                                  <span className={styles.dueDateBadge}>
                                    <CalendarIcon size={12} /> {format(safeParseDate(task.due_date), "MMM d")}
                                  </span>
                                )}
                                {task.list_name && (
                                  <span className={styles.listBadge}>{task.list_name}</span>
                                )}
                              </div>
                            </div>
                            <div className={styles.taskRightControls}>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete permanently"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* INCOMPLETE CARD */}
          <div className={styles.cardWrapper} data-col-id="incomplete">
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInfo}>
                  <span className={styles.cardDot} style={{ backgroundColor: "#f59e0b" }} />
                  <h2 className={styles.cardTitle}>Incomplete Tasks</h2>
                  <span className={styles.cardCount}>{incompleteTasks.length}</span>
                </div>
                <DatePicker
                  filter={incompleteFilter}
                  onChange={handleIncompleteFilterChange}
                  placeholder="Last 365 Days"
                />
              </div>

              <div className={styles.taskListContainer}>
                {groupedIncomplete.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No incomplete tasks found in this period.</p>
                  </div>
                ) : (
                  groupedIncomplete.map((group) => (
                    <div key={group.date} className={styles.dateGroup}>
                      <h3 className={styles.groupHeader}>{group.label}</h3>
                      <ul className={styles.list}>
                        {group.items.map((task) => (
                          <li key={task.id} className={styles.taskItem}>
                            <button
                              className={styles.checkboxWrapper}
                              onClick={() => handleToggleTask(task)}
                            >
                              <div className={styles.checkbox} />
                            </button>
                            <div className={styles.taskText}>
                              <span className={styles.taskTitle}>{task.title}</span>
                              {task.description && (
                                <span className={styles.taskDesc}>{task.description}</span>
                              )}
                              <div className={styles.taskBadgesRow}>
                                {task.due_date && (
                                  <span className={styles.dueDateBadge}>
                                    <CalendarIcon size={12} /> {format(safeParseDate(task.due_date), "MMM d")}
                                  </span>
                                )}
                                {task.list_name && (
                                  <span className={styles.listBadge}>{task.list_name}</span>
                                )}
                              </div>
                            </div>
                            <div className={styles.taskRightControls}>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete permanently"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
