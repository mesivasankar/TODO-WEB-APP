import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import Lottie from "lottie-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker"; 
import { format, parseISO, isToday, isBefore, isAfter, startOfDay, endOfDay, differenceInCalendarDays, parse } from "date-fns"; 
import "react-day-picker/dist/style.css"; 

import EmptyTasksAnimation from "../assets/animations/Loader For Tasks in Lists.json";
import StarAnimation from "../assets/animations/Star.json";
import CompletedAnimation from "../assets/animations/Completed.json";

import RenameListModal from "./RenameListModal";
import FocusOverlay from "./FocusOverlay"; 
import CategoryBadge from "./CategoryBadge"; 
import styles from "./ListTasksCard.module.css";
import { useToast } from "../contexts/ToastContext";

// ✅ API Imports
import {
  getTasksForList,
  getAllStarredTasks,
  getTodayTasks,
  getOverdueTasks,
  getUpcomingTasks,
  createTask,
  updateTask,
  deleteTask,
  permanentDeleteTask,
  toggleTaskComplete,
  toggleTaskStar,
  restoreTask,
  reorderTasks,
  suggestSubtasks,
  clearCompletedTasks,
  bulkRestoreTasks,
  bulkPermanentDeleteTasks,
} from "../api/tasksApi";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay, 
  useDndContext, 
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

const TITLE_LIMIT = 200;
const DETAILS_LIMIT = 600;

/* ================= HELPERS ================= */
const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const cleanDate = dateString.substring(0, 10); 
  return parse(cleanDate, 'yyyy-MM-dd', new Date());
};

const getLocalISODate = (dateObj = new Date()) => {
  return format(dateObj, 'yyyy-MM-dd');
};

const isOverdueCheck = (dateString) => {
  if (!dateString) return false;
  const taskDate = startOfDay(safeParseDate(dateString));
  const today = startOfDay(new Date());
  return isBefore(taskDate, today);
};

const isUpcomingCheck = (dateString) => {
    if (!dateString) return false;
    const taskDate = startOfDay(safeParseDate(dateString));
    const today = startOfDay(new Date());
    return isAfter(taskDate, today);
};

const formatSmartDate = (dateString, forceToday = false) => {
  if (forceToday) return "Today";
  if (!dateString) return "";
  const taskDate = startOfDay(safeParseDate(dateString));
  const today = startOfDay(new Date());
  if (isToday(taskDate)) return "Today";
  const tomorrow = startOfDay(new Date()); tomorrow.setDate(tomorrow.getDate() + 1);
  if (format(taskDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return "Tomorrow";
  const yesterday = startOfDay(new Date()); yesterday.setDate(yesterday.getDate() - 1);
  if (format(taskDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return "Yesterday";
  if (isBefore(taskDate, today)) {
    const diffDays = differenceInCalendarDays(today, taskDate);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  return format(taskDate, 'EEE, d MMM');
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  return dateString.substring(0, 10);
};

const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/* ================= COMPONENTS ================= */

const StarIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "var(--text-primary)" : "none"} stroke={filled ? "var(--text-primary)" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s ease' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const RepeatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
);

const TimerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const SubtaskArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v8a4 4 0 0 0 4 4h10"></path><path d="M16 12l4 4-4 4"></path></svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
);

const ChevronIcon = ({ isCollapsed }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

function SortableTaskWrapper({ task, items, children, disabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: task.id, disabled: disabled });
  const { active, over } = useDndContext();
  const isOver = over?.id === task.id;
  let linePosition = '';
  if (isOver && active && items) {
      const activeIndex = items.findIndex(i => i.id === active.id);
      const overIndex = items.findIndex(i => i.id === task.id);
      if (activeIndex !== -1 && overIndex !== -1) {
          linePosition = activeIndex < overIndex ? 'bottom' : 'top';
      }
  }
  const style = { opacity: isDragging ? 0.3 : 1, position: "relative", touchAction: "none" };
  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
        {isOver && !isDragging && (
            <div className={`${styles.taskInsertionLine} ${linePosition === 'bottom' ? styles.lineBottom : styles.lineTop}`} />
        )}
        {children}
    </motion.div>
  );
}

const DropdownPortal = ({ children, coords, onClose }) => {
  useEffect(() => {
      function handleClick(e) { if (!e.target.closest(`.${styles.dropdownFixed}`)) onClose(); }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);
  return ReactDOM.createPortal(
      <div className={styles.dropdownFixed} style={{ top: coords.top + 8, left: coords.left }} onClick={(e) => e.stopPropagation()}>{children}</div>,
      document.body
  );
};

const DatePickerSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const toggleMenu = () => {
      if (!isOpen && triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({ top: rect.bottom, left: rect.left });
      }
      setIsOpen(!isOpen);
  };
  const handleDaySelect = (date) => {
      if (date) { onChange(getLocalISODate(date)); setIsOpen(false); }
  };
  const selectedDate = value ? safeParseDate(value) : undefined;
  return (
      <>
          <div className={styles.iconOnlyBtn} ref={triggerRef} title="Set Date" onClick={toggleMenu}><CalendarIcon /></div>
          {isOpen && (
              <DropdownPortal coords={coords} onClose={() => setIsOpen(false)}>
                  <div className={styles.calendarWrapper}>
                    <DayPicker mode="single" selected={selectedDate} onSelect={handleDaySelect} showOutsideDays className={styles.rdpCustom} />
                    <div className={styles.calendarFooter}>
                        <button className={styles.footerBtn} onClick={() => { onChange(""); setIsOpen(false); }}>Clear</button>
                        <button className={styles.footerBtn} onClick={() => { onChange(getLocalISODate(new Date())); setIsOpen(false); }}>Today</button>
                    </div>
                  </div>
              </DropdownPortal>
          )}
      </>
  );
};

const RecurrenceSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const toggleMenu = () => {
      if (!isOpen && triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({ top: rect.bottom, left: rect.left });
      }
      setIsOpen(!isOpen);
  };
  const options = [{ label: 'No Repeat', val: null }, { label: 'Daily', val: 'DAILY' }, { label: 'Weekly', val: 'WEEKLY' }, { label: 'Monthly', val: 'MONTHLY' }, { label: 'Yearly', val: 'YEARLY' }];
  return (
      <>
          <div className={styles.iconOnlyBtn} ref={triggerRef} title="Repeat Task" onClick={toggleMenu}><RepeatIcon /></div>
          {isOpen && (
              <DropdownPortal coords={coords} onClose={() => setIsOpen(false)}>
                  {options.map((opt) => (
                      <button key={opt.label} className={styles.menuItem} style={{ color: value === opt.val ? 'var(--primary)' : 'var(--text-primary)' }} onClick={() => { onChange(opt.val); setIsOpen(false); }}>{opt.label}</button>
                  ))}
              </DropdownPortal>
          )}
      </>
  );
};

const DatePill = ({ value, onClear, forceToday = false, isOverdue = false }) => { 
  if (!value && !forceToday) return null; 
  return (
    <div className={`${styles.deadlinePill} ${isOverdue ? styles.overduePill : ""}`}>
      <CalendarIcon />
      <span>{formatSmartDate(value, forceToday)}</span>
      {!(forceToday || isOverdue) && <button className={styles.clearBtn} onClick={(e) => { e.preventDefault(); onClear(); }} title="Clear date">✕</button>}
    </div>
  ); 
};

const RecurrencePill = ({ value, onClear }) => { if (!value) return null; return (<div className={styles.deadlinePill}><RepeatIcon /><span style={{ textTransform: 'capitalize' }}>{value.toLowerCase()}</span><button className={styles.clearBtn} onClick={(e) => { e.preventDefault(); onClear(); }} title="Stop repeating">✕</button></div>); };

/* ================= MAIN COMPONENT ================= */

export default function ListTasksCard({ list, onRenameList, onDeleteList, isSingleView, onCountUpdate, isStarredMode = false, isTodayMode = false, isUpcomingMode = false, isOverdueMode = false, defaultListId = null, dragHandleProps }) {
  const shouldRender = list || isStarredMode || isTodayMode || isUpcomingMode || isOverdueMode;
  if (!shouldRender) return null;

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, origin: 'top right' }); 
  const [isMenuForSubtask, setIsMenuForSubtask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [hoveredCheckboxId, setHoveredCheckboxId] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const { showUndoToast } = useToast();
  const [activeId, setActiveId] = useState(null);
  const [activeDragTask, setActiveDragTask] = useState(null);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const listMenuRef = useRef(null);
  const taskMenuRef = useRef(null);
  const titleRef = useRef(null);
  const detailsRef = useRef(null);
  const editTitleRef = useRef(null);
  const editDetailsRef = useRef(null);
  const subTitleRef = useRef(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editRecurrence, setEditRecurrence] = useState(null);

  const [addingSubtaskToId, setAddingSubtaskToId] = useState(null);
  const [subTitle, setSubTitle] = useState("");
  const [subDetails, setSubDetails] = useState("");
  const [subDueDate, setSubDueDate] = useState("");

  const showListMenu = !isStarredMode && !isTodayMode && !isUpcomingMode && !isOverdueMode && list;
  const isDateLocked = isTodayMode || isOverdueMode;
  const allowAddingTasks = !isUpcomingMode && !isOverdueMode;
  const isDefaultList = list?.is_default === true;
  const [isGenerating, setIsGenerating] = useState(false);

  const incompleteCount = useMemo(() => tasks.filter(t => !t.is_completed).length, [tasks]);

  useEffect(() => {
    if (onCountUpdate) onCountUpdate(list?.id || "special-view", incompleteCount);
  }, [incompleteCount, onCountUpdate, list?.id]);

  useEffect(() => { loadTasks(); }, [list?.id, isStarredMode, isTodayMode, isUpcomingMode, isOverdueMode]);
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) setListMenuOpen(false);
      if (taskMenuRef.current && !taskMenuRef.current.contains(e.target)) setOpenMenuTaskId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", () => setOpenMenuTaskId(null), true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", () => setOpenMenuTaskId(null), true);
    };
  }, []);

  function resize(ref, maxH = 160) {
    if (!ref.current) return;
    ref.current.style.overflowY = "hidden";
    ref.current.style.height = "auto";
    const scrollHeight = ref.current.scrollHeight;
    ref.current.style.height = scrollHeight > maxH ? maxH + "px" : scrollHeight + "px";
    ref.current.style.overflowY = scrollHeight > maxH ? "auto" : "hidden";
  }

  async function loadTasks() {
    if (list?.id && !isValidUUID(list.id)) return; 
    setIsLoading(true);
    try {
      let data;
      if (isTodayMode) {
        const rawData = await getTodayTasks();
        data = rawData.filter(t => t.due_date && isToday(safeParseDate(t.due_date)));
      }
      else if (isUpcomingMode) {
        const rawData = await getUpcomingTasks();
        data = rawData.filter(t => isUpcomingCheck(t.due_date));
      }
      else if (isStarredMode) data = await getAllStarredTasks();
      else if (isOverdueMode) {
        const rawData = await getOverdueTasks();
        data = rawData.filter(t => isOverdueCheck(t.due_date));
      }
      else if (list?.id) data = await getTasksForList(list.id);
      setTasks(data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }

  function isInteractive(target) { return target.closest("button") || target.closest("input") || target.closest("a") || target.closest(`.${styles.checkbox}`); }
  
  const getHeaderTitle = () => {
    if (isTodayMode) return "Today";
    if (isUpcomingMode) return "Upcoming";
    if (isStarredMode) return "Starred Tasks";
    if (isOverdueMode) return "Overdue Tasks";
    return list ? list.name : "";
  };

  const { activeRoots, completedRoots } = useMemo(() => {
    const taskMap = {}; const roots = []; const completed = [];
    tasks.forEach(t => { const pid = t.parent_task_id || t.parentTaskId; taskMap[t.id] = { ...t, parent_task_id: pid, children: [] }; });
    tasks.forEach(t => {
      const isSpecialMode = isStarredMode || isTodayMode || isUpcomingMode || isOverdueMode;
      if (isSpecialMode && t.is_completed) return;
      if (!isSpecialMode && t.is_completed) { completed.push(taskMap[t.id]); return; }
      const pid = t.parent_task_id || t.parentTaskId; const parent = pid ? taskMap[pid] : null;
      if (parent && !parent.is_completed) { parent.children.push(taskMap[t.id]); } else { roots.push(taskMap[t.id]); }
    });
    return { activeRoots: roots, completedRoots: completed };
  }, [tasks, isStarredMode, isTodayMode, isUpcomingMode, isOverdueMode]);

  async function saveTask() {
    if (!title.trim() || isSavingRef.current) return;
    isSavingRef.current = true; setIsSaving(true);
    const tempId = self.crypto.randomUUID(); 
    const targetListId = (isStarredMode || isTodayMode || isUpcomingMode || isOverdueMode) ? defaultListId : list.id;
    const newTask = { id: tempId, title: title.trim(), description: details.trim(), due_date: dueDate, recurrence_type: recurrence, is_completed: false, is_starred: isStarredMode, parent_task_id: null };
    setTasks(p => [...p, newTask]);
    setTitle(""); setDetails(""); setDueDate(""); setRecurrence(null); setEditorOpen(false);
    isSavingRef.current = false; setIsSaving(false);
    try {
      const saved = await createTask(targetListId, { title: newTask.title, description: newTask.description, dueDate: newTask.due_date, recurrenceType: newTask.recurrence_type });
      setTasks(p => p.map(t => t.id === tempId ? saved : t));
      if (isStarredMode) await toggleTaskStar(saved.id, true);
    } catch (e) { setTasks(p => p.filter(t => t.id !== tempId)); console.error(e); }
  }

  async function saveSubtask() {
    if (!subTitle.trim() || isSavingRef.current) return;
    isSavingRef.current = true; setIsSaving(true);
    const tempId = self.crypto.randomUUID(); 
    const parent = tasks.find(t => t.id === addingSubtaskToId); 
    const targetListId = parent ? (parent.list_id || list?.id || defaultListId) : list.id;
    const optimisticSubtask = { id: tempId, title: subTitle.trim(), description: subDetails.trim(), due_date: subDueDate, is_completed: false, is_starred: false, parent_task_id: addingSubtaskToId, list_id: targetListId };
    setTasks(p => [...p, optimisticSubtask]);
    const oldParentId = addingSubtaskToId; setSubTitle(""); setSubDetails(""); setSubDueDate(""); setAddingSubtaskToId(null);
    isSavingRef.current = false; setIsSaving(false);
    try {
      const saved = await createTask(targetListId, { title: optimisticSubtask.title, description: optimisticSubtask.description, dueDate: optimisticSubtask.due_date, parentTaskId: oldParentId });
      setTasks(p => p.map(t => t.id === tempId ? saved : t));
    } catch (e) { console.error(e); setTasks(p => p.filter(t => t.id !== tempId)); }
  }

  async function handleAiGenerate(task) {
    if (!task) return;
    setIsGenerating(true);
    const parentId = task.id; const targetListId = task.list_id || list?.id || defaultListId; const tempLoadingId = "temp-ai-loading";
    setTasks(prev => [...prev, { id: tempLoadingId, title: "Generating ideas...", is_completed: false, parent_task_id: parentId, list_id: targetListId, is_virtual: true }]);
    try {
      const suggestions = await suggestSubtasks(task.title);
      setTasks(prev => {
        const withoutLoading = prev.filter(t => t.id !== tempLoadingId);
        const newSubtasks = suggestions.map((stepTitle) => ({ id: self.crypto.randomUUID(), title: stepTitle, is_completed: false, parent_task_id: parentId, list_id: targetListId }));
        return [...withoutLoading, ...newSubtasks];
      });
      for (const stepTitle of suggestions) { await createTask(targetListId, { title: stepTitle, parentTaskId: parentId }); }
    } catch (err) { console.error("AI Failed", err); setTasks(prev => prev.filter(t => t.id !== tempLoadingId)); showUndoToast(err.message || "Failed to generate steps. Try again."); } finally { setIsGenerating(false); }
  }

  function startEditTask(task) { setEditingTaskId(task.id); setEditTitle(task.title); setEditDetails(task.description || ""); setEditDueDate(formatDateForInput(task.due_date)); setEditRecurrence(task.recurrence_type || null); }

  async function saveEditTask() {
    if (!editTitle.trim()) return;
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editTitle.trim(), description: editDetails.trim(), due_date: editDueDate, recurrence_type: editRecurrence } : t));
    const idToUpdate = editingTaskId; setEditingTaskId(null);
    try { await updateTask(idToUpdate, { title: editTitle.trim(), description: editDetails.trim(), dueDate: editDueDate || null, recurrenceType: editRecurrence || 'NONE' }); } catch (err) { console.error(err); }
  }

  async function handleDelete(taskId) {
    const taskToRestore = tasks.find(t => t.id === taskId); const subtasksToRestore = tasks.filter(t => { const pid = t.parent_task_id || t.parentTaskId; return String(pid) === String(taskId); });
    setTasks(p => p.filter(t => { const pid = t.parent_task_id || t.parentTaskId; return String(t.id) !== String(taskId) && String(pid) !== String(taskId); }));
    setOpenMenuTaskId(null);
    try {
      await deleteTask(taskId);
      showUndoToast("Task deleted", async () => { setTasks(prev => [...prev, taskToRestore, ...subtasksToRestore]); try { await restoreTask(taskId); } catch (e) { setTasks(prev => prev.filter(t => t.id !== taskId)); } }, async () => { try { await permanentDeleteTask(taskId); } catch (e) { console.error("Failed to permanently delete", e); } });
    } catch (e) { if (taskToRestore) setTasks(prev => [...prev, taskToRestore, ...subtasksToRestore]); console.error(e); }
  }

  async function handleToggleComplete(taskId, status) {
    const newStatus = !status;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, is_completed: newStatus };
      const pId = t.parent_task_id || t.parentTaskId; if (String(pId) === String(taskId)) return { ...t, is_completed: newStatus };
      return t;
    }));
    try { await toggleTaskComplete(taskId, newStatus); if (newStatus === true) loadTasks(); } catch (e) { console.error("Toggle failed", e); loadTasks(); }
  }

  async function handleClearCompleted() {
    if (!list?.id) return;
    const completedTasksToRestore = tasks.filter(t => t.is_completed);
    if (completedTasksToRestore.length === 0) return;
    const taskIds = completedTasksToRestore.map(t => t.id);
    setTasks(p => p.filter(t => !t.is_completed));
    try {
      await clearCompletedTasks(list.id);
      showUndoToast("Completed tasks deleted", async () => {
        setTasks(prev => [...prev, ...completedTasksToRestore]);
        try {
          await bulkRestoreTasks(taskIds);
        } catch (e) {
          console.error("Failed to restore bulk tasks", e);
          setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
        }
      }, async () => {
        try {
          await bulkPermanentDeleteTasks(taskIds);
        } catch (e) {
          console.error("Failed to permanently delete bulk tasks", e);
        }
      });
    } catch (e) {
      setTasks(p => [...p, ...completedTasksToRestore]);
      console.error("Failed to clear completed tasks", e);
    }
  }

  async function handleToggleStar(taskId, status) {
    const newStatus = !status;
    if (isStarredMode && !newStatus) { setTasks(p => p.filter(t => t.id !== taskId)); } else { setTasks(p => p.map(t => t.id === taskId ? { ...t, is_starred: newStatus } : t)); }
    try { await toggleTaskStar(taskId, newStatus); } catch (e) { loadTasks(); }
  }

  function handleDragStart(event) { setActiveId(event.active.id); const task = tasks.find(t => t.id === event.active.id); setActiveDragTask(task); }
  function handleDragCancel() { setActiveId(null); setActiveDragTask(null); }
  function handleDragEnd(event) {
    const { active, over } = event; setActiveId(null); setActiveDragTask(null);
    if (!over || active.id === over.id) return;
    const findContainer = (items) => { if (items.find(i => i.id === active.id)) return items; for (const item of items) { if (item.children && item.children.length > 0) { const found = findContainer(item.children); if (found) return found; } } return null; };
    const activeContainer = findContainer(activeRoots);
    if (activeContainer) {
      const oldIndex = activeContainer.findIndex(t => t.id === active.id); const newIndex = activeContainer.findIndex(t => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedGroup = arrayMove(activeContainer, oldIndex, newIndex);
        const updateTree = (nodes) => { if (nodes.find(n => n.id === active.id)) return reorderedGroup; return nodes.map(node => ({ ...node, children: node.children ? updateTree(node.children) : [] })); };
        const newActiveRoots = updateTree(activeRoots);
        const flatten = (nodes) => { let flat = []; nodes.forEach(n => { flat.push(n); if (n.children && n.children.length > 0) flat.push(...flatten(n.children)); }); return flat; };
        const flatActive = flatten(newActiveRoots);
        const flattenCompleted = (nodes) => { let flat = []; nodes.forEach(n => { flat.push(n); if (n.children) flat.push(...flattenCompleted(n.children)); }); return flat; };
        const flatCompleted = flattenCompleted(completedRoots);
        setTasks([...flatActive, ...flatCompleted]);
        if (list) { const reorderedIds = reorderedGroup.map(t => t.id); reorderTasks(list.id, reorderedIds).catch(console.error); }
      }
    }
  }

  const openMenu = (e, taskId, isSubtask) => { 
    e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const windowHeight = window.innerHeight; const menuHeight = 220; 
    let topPos = rect.bottom + 4; let origin = 'top right';
    if (topPos + menuHeight > windowHeight) { topPos = rect.top - menuHeight + 10; origin = 'bottom right'; }
    setMenuPos({ top: topPos, left: rect.left - 180, origin }); setOpenMenuTaskId(taskId); setIsMenuForSubtask(isSubtask); 
  };

  const toggleCollapse = (e, taskId) => {
    e.stopPropagation();
    setCollapsedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const getEmptyText = () => { if (isStarredMode) return "No starred tasks yet"; if (isTodayMode) return "No tasks due today"; if (isOverdueMode) return "No overdue tasks"; if (isUpcomingMode) return "No upcoming tasks"; return "No tasks yet"; };

  const renderTaskItem = (task, isSubtask = false, isOverlay = false, items = []) => {
    const isEditing = editingTaskId === task.id;
    const isAddingSub = addingSubtaskToId === task.id;
    const children = task.children || [];
    const pId = task.parent_task_id || task.parentTaskId;
    const isChildOfHovered = String(pId) === String(hoveredCheckboxId);
    const showPreviewTick = isChildOfHovered && !task.is_completed;
    const isVirtual = task.is_virtual === true;
    const content = (
      <div key={task.id} className={styles.taskContainer} style={isOverlay ? { cursor: 'grabbing', background: 'var(--surface)', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' } : {}}>
        {isEditing ? (
          <div className={`${styles.taskEditor} ${styles.editorAnimate}`}>
            <textarea ref={editTitleRef} rows={1} maxLength={TITLE_LIMIT} className={styles.editorTitle} value={editTitle} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => { setEditTitle(e.target.value); resize(editTitleRef, 96); }} />
            <textarea ref={editDetailsRef} maxLength={DETAILS_LIMIT} className={styles.editorDetails} placeholder="Details" onKeyDown={(e) => e.stopPropagation()} onChange={(e) => { setEditDetails(e.target.value); resize(editDetailsRef, 160); }} />
            {!isDateLocked && (
              <div className={styles.deadlineRow}>
                <button className={styles.deadlineBtn} onClick={() => setEditDueDate(getLocalISODate(new Date()))}>Today</button>
                <button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setEditDueDate(getLocalISODate(d)); }}>Tomorrow</button>
                <DatePickerSelector value={editDueDate} onChange={setEditDueDate} /><RecurrenceSelector value={editRecurrence} onChange={setEditRecurrence} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><DatePill value={editDueDate} onClear={() => setEditDueDate("")} forceToday={isTodayMode} isOverdue={isOverdueCheck(editDueDate) && !task.is_completed} /><RecurrencePill value={editRecurrence} onClear={() => setEditRecurrence(null)} /></div>
            <div className={styles.editorActionsRight}><button className={styles.cancelBtn} onClick={() => setEditingTaskId(null)}>Cancel</button><button className={styles.saveBtn} onClick={saveEditTask} disabled={!editTitle.trim()}>Save</button></div>
          </div>
        ) : (
          <li className={`${styles.taskItem} ${task.is_completed ? styles.completedTask : ""} ${isVirtual ? styles.virtualTask : ""}`} onClick={(e) => { if (!isInteractive(e.target) && !isVirtual) startEditTask(task); }}>
            {!isVirtual ? ( <input type="checkbox" className={`${styles.checkbox} ${showPreviewTick ? styles.checkboxPreview : ""}`} checked={!!task.is_completed} onChange={() => handleToggleComplete(task.id, !!task.is_completed)} onClick={(e) => e.stopPropagation()} onMouseEnter={() => setHoveredCheckboxId(task.id)} onMouseLeave={() => setHoveredCheckboxId(null)} /> ) : ( <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '14px' }}>✨</span></div> )}
            <div className={styles.taskText}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {children.length > 0 && (
                  <button className={styles.collapseBtn} onClick={(e) => toggleCollapse(e, task.id)} title={collapsedTaskIds.has(task.id) ? "Expand subtasks" : "Collapse subtasks"}>
                    <ChevronIcon isCollapsed={collapsedTaskIds.has(task.id)} />
                  </button>
                )}
                <span className={styles.taskTitle} style={isVirtual ? { fontStyle: 'italic', color: 'var(--text-secondary)' } : {}}>{task.title}</span>
              </div>
              {task.description && <span className={styles.taskDetails}>{task.description}</span>}
              <div style={{ display: 'flex', gap: '6px' }}>{task.due_date && ( <span className={`${styles.taskDate} ${isOverdueCheck(task.due_date) && !task.is_completed ? styles.overdue : ""}`}><CalendarIcon />{formatSmartDate(task.due_date, isTodayMode)}</span> )}{task.recurrence_type && !task.is_completed && (<span className={styles.taskDate} title={`Repeats ${task.recurrence_type.toLowerCase()}`}><RepeatIcon /></span>)}</div>
            </div>
            {/* 🔥 UPDATED: Hide star and menu for completed tasks, show delete instead */}
            {!isVirtual && !task.is_completed && ( 
              <div className={styles.taskRightControls}>
                <button className={styles.starBtn} style={{ opacity: task.is_starred ? 1 : undefined, color: task.is_starred ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); handleToggleStar(task.id, !!task.is_starred); }} title={task.is_starred ? "Unstar" : "Star"}>
                  <StarIcon filled={task.is_starred} />
                </button>
                <div className={styles.menuWrapper}>
                  <button className={styles.more} onClick={(e) => openMenu(e, task.id, isSubtask)}>⋮</button>
                </div>
              </div> 
            )}
            {!isVirtual && task.is_completed && (
              <div className={styles.taskRightControls}>
                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} title="Delete task">
                  <TrashIcon />
                </button>
              </div>
            )}
          </li>
        )}
        {!isOverlay && children.length > 0 && !collapsedTaskIds.has(task.id) && (<SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}><ul className={styles.subtaskList}><AnimatePresence>{children.map(child => renderTaskItem(child, true, false, children))}</AnimatePresence></ul></SortableContext>)}
        {!isOverlay && isAddingSub && (
          <div className={`${styles.taskEditor} ${styles.subtaskEditor} ${styles.editorAnimate}`}>
            <div className={styles.subtaskLine}></div>
            <textarea ref={subTitleRef} rows={1} maxLength={TITLE_LIMIT} className={styles.editorTitle} placeholder="Subtask title" value={subTitle} onKeyDown={(e) => e.stopPropagation()} onChange={e => { setSubTitle(e.target.value); resize(subTitleRef, 96); }} />
            <textarea className={styles.editorDetails} maxLength={DETAILS_LIMIT} placeholder="Details" value={subDetails} onKeyDown={(e) => e.stopPropagation()} onChange={e => setSubDetails(e.target.value)} />
            {!isDateLocked && ( <div className={styles.deadlineRow}><button className={styles.deadlineBtn} onClick={() => setSubDueDate(getLocalISODate(new Date()))}>Today</button><button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setSubDueDate(getLocalISODate(d)); }}>Tomorrow</button><DatePickerSelector value={subDueDate} onChange={setSubDueDate} /></div> )}
            <DatePill value={subDueDate} onClear={() => setSubDueDate("")} forceToday={isTodayMode} isOverdue={isOverdueCheck(subDueDate)} />
            <div className={styles.editorActionsRight}><button className={styles.cancelBtn} onClick={() => setAddingSubtaskToId(null)}>Cancel</button><button className={styles.saveBtn} onClick={saveSubtask} disabled={!subTitle.trim() || isSaving}>{isSaving ? "Saving..." : "Save"}</button></div>
          </div>
        )}
      </div>
    );
    if (isOverlay) return content;
    const isDragDisabled = isTodayMode || isUpcomingMode || isOverdueMode || isVirtual;
    if (!task.is_completed && !isStarredMode && !isDragDisabled) {
      return <SortableTaskWrapper key={task.id} task={task} items={items}>{content}</SortableTaskWrapper>;
    } else {
      return (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.div>
      );
    }
  };

  /* ================= MAIN RENDER ================= */
  if (isLoading) return null; 

  const isSpecialMode = isStarredMode || isTodayMode || isUpcomingMode || isOverdueMode;
  const hasActiveTasks = activeRoots.length > 0;
  const hasCompletedTasks = tasks.some(t => t.is_completed);
  const showEmptyState = !hasActiveTasks && !editorOpen;

  let animationData = EmptyTasksAnimation;
  let emptyText = getEmptyText();

  if (showEmptyState) {
    if (hasCompletedTasks && !isSpecialMode) {
       animationData = CompletedAnimation;
       emptyText = "All tasks completed!";
    } else if (isStarredMode) {
       animationData = StarAnimation;
    }
  }

  return (
    <>
      <section className={`${styles.card} ${tasks.length > 0 || editorOpen ? styles.cardExpanded : ""} ${isSingleView || isStarredMode || isTodayMode || isUpcomingMode || isOverdueMode ? styles.singleViewCard : ""}`}>
        <header className={styles.header} {...dragHandleProps} style={{ cursor: dragHandleProps ? 'grab' : 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}><h3 className={styles.title}>{getHeaderTitle()}</h3>{!isTodayMode && !isUpcomingMode && !isStarredMode && !isOverdueMode && list && (<CategoryBadge category={list.category} />)}</div>
          {showListMenu && (
            <div className={styles.menuWrapper} ref={listMenuRef} onPointerDown={(e) => e.stopPropagation()}>
              <button className={styles.menuButton} onClick={() => setListMenuOpen(p => !p)}>⋮</button>
              <div className={`${styles.dropdown} ${listMenuOpen ? styles.dropdownOpen : ""}`} style={{ right: 0, top: '100%' }}>
                <button className={styles.menuItem} onClick={() => { setListMenuOpen(false); setRenameOpen(true); }}>Rename list</button>
                {!isDefaultList ? <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => onDeleteList(list.id)}>Delete list</button> : <div className={styles.disabledWrapper}><div className={styles.disabledItem}>Delete list</div><div className={styles.helperText}>Default list cant be deleted</div></div>}
              </div>
            </div>
          )}
        </header>

        <div className={styles.contentWrapper}>
          {allowAddingTasks && !editorOpen && (<button className={styles.addTaskButton} onClick={() => setEditorOpen(true)}><span className={styles.plus}>＋</span> {isStarredMode ? "Add a starred task" : "Add a task"}</button>)}
          {allowAddingTasks && editorOpen && (
            <div className={`${styles.taskEditor} ${styles.editorAnimate}`}>
              <textarea ref={titleRef} rows={1} maxLength={TITLE_LIMIT} className={styles.editorTitle} placeholder="Title" value={title} onKeyDown={(e) => e.stopPropagation()} onChange={e => { setTitle(e.target.value); resize(titleRef, 96); }} />
              <textarea ref={detailsRef} maxLength={DETAILS_LIMIT} className={styles.editorDetails} placeholder="Details" value={details} onKeyDown={(e) => e.stopPropagation()} onChange={e => { setDetails(e.target.value); resize(detailsRef, 160); }} />
              {!isDateLocked && ( <div className={styles.deadlineRow}><button className={styles.deadlineBtn} onClick={() => setDueDate(getLocalISODate(new Date()))}>Today</button><button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setDueDate(getLocalISODate(d)); }}>Tomorrow</button><DatePickerSelector value={dueDate} onChange={setDueDate} /><RecurrenceSelector value={recurrence} onChange={setRecurrence} /></div> )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><DatePill value={dueDate} onClear={() => setDueDate("")} forceToday={isTodayMode} isOverdue={isOverdueCheck(dueDate)} />{!isDateLocked && <RecurrencePill value={recurrence} onClear={() => setRecurrence(null)} />}</div>
              <div className={styles.editorActionsRight}><button className={styles.cancelBtn} onClick={() => setEditorOpen(false)}>Cancel</button><button className={styles.saveBtn} onClick={saveTask} disabled={!title.trim() || isSaving}>{isSaving ? "Saving..." : "Save"}</button></div>
            </div>
          )}
          {showEmptyState && (<div className={styles.empty}><Lottie animationData={animationData} loop className={styles.animation} /><p>{emptyText}</p></div>)}
          <div className={styles.scrollContainer}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
              <SortableContext items={activeRoots.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <ul className={styles.taskList}>
                  <AnimatePresence>
                    {activeRoots.map(task => renderTaskItem(task, false, false, activeRoots))}
                  </AnimatePresence>
                </ul>
              </SortableContext>
              <DragOverlay>{activeDragTask ? (<div className={styles.dragOverlayTask}><div className={styles.checkbox} /><span className={styles.taskTitle}>{activeDragTask.title}</span></div>) : null}</DragOverlay>
            </DndContext>
            {!isStarredMode && !isTodayMode && !isUpcomingMode && !isOverdueMode && completedRoots.length > 0 && (
              <div className={styles.completedSection}>
                <div className={styles.completedHeaderWrapper}>
                  <button className={styles.completedHeader} onClick={() => setShowCompleted(p => !p)}>Completed ({completedRoots.length}) <span className={`${styles.chevron} ${showCompleted ? styles.rotate : ""}`}>▼</span></button>
                  <button className={styles.clearCompletedBtn} onClick={handleClearCompleted} title="Delete all completed tasks">Clear all</button>
                </div>
                <AnimatePresence>
                  {showCompleted && <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className={styles.taskList}><AnimatePresence>{completedRoots.map(task => renderTaskItem(task, false))}</AnimatePresence></motion.ul>}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </section>
      {openMenuTaskId && ( <div className={`${styles.dropdown} ${styles.dropdownOpen}`} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: '220px', transformOrigin: menuPos.origin }} ref={taskMenuRef} onClick={(e) => e.stopPropagation()}><button className={styles.menuItem} onClick={() => { const task = tasks.find(t => t.id === openMenuTaskId); setFocusTask(task); setOpenMenuTaskId(null); }}><span className={styles.menuIconWrapper}><TimerIcon /></span> Focus timer</button>{!isStarredMode && !isMenuForSubtask && ( <><button className={styles.menuItem} onClick={() => { setOpenMenuTaskId(null); setAddingSubtaskToId(openMenuTaskId); }}><span className={styles.menuIconWrapper}><SubtaskArrowIcon /></span> Add a subtask</button><button className={styles.menuItem} onClick={() => { const task = tasks.find(t => t.id === openMenuTaskId); setOpenMenuTaskId(null); handleAiGenerate(task); }}><span className={styles.menuIconWrapper}><SparklesIcon /></span> Smart Subtasks</button></> )}<div className={styles.separator} /><button className={`${styles.menuItem} ${styles.danger}`} onClick={() => handleDelete(openMenuTaskId)}><span className={styles.menuIconWrapper}><TrashIcon /></span> Delete</button></div> )}
      {list && <RenameListModal isOpen={renameOpen} currentName={list.name} onCancel={() => setRenameOpen(false)} onRename={(n) => { setRenameOpen(false); onRenameList(list.id, n); }} />}
      {focusTask && (<FocusOverlay task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => handleToggleComplete(focusTask.id, focusTask.is_completed)} />)}
    </>
  );
}