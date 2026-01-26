import { useState, useRef, useEffect, useMemo } from "react";
import Lottie from "lottie-react";
import EmptyTasksAnimation from "../assets/animations/Loader For Tasks in Lists.json";
import StarAnimation from "../assets/animations/Star.json"; 
import CompletedAnimation from "../assets/animations/Completed.json"; 

import RenameListModal from "./RenameListModal";
import styles from "./ListTasksCard.module.css";
import { useToast } from "../contexts/ToastContext"; 
import {
  getTasksForList,
  getAllStarredTasks,
  createTask,
  updateTask,
  deleteTask,
  permanentDeleteTask,
  toggleTaskComplete,
  toggleTaskStar,
  restoreTask,
  reorderTasks, 
} from "../api/tasksApi";

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TITLE_LIMIT = 200;
const DETAILS_LIMIT = 600;

/* ================= HELPERS ================= */
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const getLocalISODate = (dateObj = new Date()) => {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const isOverdue = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  return date.getTime() < today.getTime();
};

const formatSmartDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "Today";
  if (compareDate.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (compareDate.getTime() === yesterday.getTime()) return "Yesterday";

  if (compareDate < today) {
    const diffTime = Math.abs(today - compareDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  return typeof dateString === 'string' ? dateString.substring(0, 10) : "";
};

/* ================= SORTABLE WRAPPER ================= */
function SortableTaskWrapper({ task, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: disabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : "auto",
    position: "relative",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/* ================= COMPONENT ================= */

export default function ListTasksCard({ 
  list, 
  onRenameList, 
  onDeleteList, 
  isSingleView, 
  isStarredMode = false,
  defaultListId = null 
}) {
  if (!list && !isStarredMode) return null;

  /* --- STATE --- */
  const [tasks, setTasks] = useState([]);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [isMenuForSubtask, setIsMenuForSubtask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Undo Toast Hook
  const { showUndoToast } = useToast();

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Refs
  const listMenuRef = useRef(null);
  const taskMenuRef = useRef(null);
  const titleRef = useRef(null);
  const detailsRef = useRef(null);
  const editTitleRef = useRef(null);
  const editDetailsRef = useRef(null);
  const subTitleRef = useRef(null);

  // Add Task State
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // Edit Task State
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // Subtask State
  const [addingSubtaskToId, setAddingSubtaskToId] = useState(null);
  const [subTitle, setSubTitle] = useState("");
  const [subDetails, setSubDetails] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  
  const showListMenu = !isStarredMode && list;
  const isDefaultList = list?.is_default === true;

  /* --- EFFECTS --- */
  useEffect(() => { loadTasks(); }, [list?.id, isStarredMode]);

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

  useEffect(() => { if (editorOpen && titleRef.current) { titleRef.current.focus(); resize(titleRef, 96); } }, [editorOpen]);
  useEffect(() => { if (editingTaskId && editTitleRef.current) { editTitleRef.current.focus(); resize(editTitleRef, 96); } }, [editingTaskId]);
  useEffect(() => { if (addingSubtaskToId && subTitleRef.current) { subTitleRef.current.focus(); resize(subTitleRef, 96); } }, [addingSubtaskToId]);

  // 🔥 FIX: Improved Jitter-Free Resize Function
  function resize(ref, maxH = 160) {
    if (!ref.current) return;
    
    // 1. Force hidden scrollbar to prevent width changes (jitter)
    ref.current.style.overflowY = "hidden";
    ref.current.style.height = "auto";
    
    const scrollHeight = ref.current.scrollHeight;
    
    // 2. Only show scrollbar if we hit the limit
    if (scrollHeight > maxH) {
        ref.current.style.height = maxH + "px";
        ref.current.style.overflowY = "auto";
    } else {
        ref.current.style.height = scrollHeight + "px";
        ref.current.style.overflowY = "hidden";
    }
  }

  async function loadTasks() {
    try {
      let data;
      if (isStarredMode) data = await getAllStarredTasks();
      else data = await getTasksForList(list.id);
      setTasks(data || []);
    } catch (err) { console.error(err); }
  }

  function isInteractive(target) {
    return target.closest("button") || target.closest("input") || target.closest("a") || target.closest(`.${styles.checkbox}`);
  }

  /* --- DATA PROCESSING --- */
  const { activeRoots, completedRoots } = useMemo(() => {
    const taskMap = {};
    const roots = [];
    const completed = [];

    tasks.forEach(t => { 
        const pid = t.parent_task_id || t.parentTaskId; 
        taskMap[t.id] = { ...t, parent_task_id: pid, children: [] }; 
    });

    tasks.forEach(t => {
      if (isStarredMode && t.is_completed) return; 
      if (!isStarredMode && t.is_completed) { completed.push(taskMap[t.id]); return; }

      const pid = t.parent_task_id || t.parentTaskId;
      const parent = pid ? taskMap[pid] : null;

      if (parent && !parent.is_completed) { parent.children.push(taskMap[t.id]); } 
      else { roots.push(taskMap[t.id]); }
    });
    return { activeRoots: roots, completedRoots: completed };
  }, [tasks, isStarredMode]);

  /* --- ACTIONS --- */
  async function saveTask() {
    if (!title.trim() || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    const tempId = Date.now();
    const targetListId = isStarredMode ? defaultListId : list.id;

    const newTask = { 
        id: tempId, 
        title: title.trim(), 
        description: details.trim(), 
        due_date: dueDate, 
        is_completed: false, 
        is_starred: isStarredMode, 
        parent_task_id: null 
    };

    setTasks(p => [...p, newTask]);

    setTitle(""); 
    setDetails(""); 
    setDueDate(""); 
    setEditorOpen(false);
    
    isSavingRef.current = false;
    setIsSaving(false);

    try {
      const saved = await createTask(targetListId, { 
        title: newTask.title, 
        description: newTask.description, 
        dueDate: newTask.due_date 
      });
      setTasks(p => p.map(t => t.id === tempId ? saved : t));
      if (isStarredMode) { await toggleTaskStar(saved.id, true); }
    } catch (e) { 
      setTasks(p => p.filter(t => t.id !== tempId)); 
      console.error(e);
    }
  }

  async function saveSubtask() {
    if (!subTitle.trim() || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    const tempId = Date.now();
    const parent = tasks.find(t => t.id === addingSubtaskToId);
    const targetListId = parent ? (parent.list_id || list?.id || defaultListId) : list.id;

    const optimisticSubtask = {
        id: tempId,
        title: subTitle.trim(),
        description: subDetails.trim(),
        due_date: subDueDate,
        is_completed: false,
        is_starred: false,
        parent_task_id: addingSubtaskToId,
        list_id: targetListId
    };

    setTasks(p => [...p, optimisticSubtask]);

    const oldParentId = addingSubtaskToId;
    setSubTitle(""); 
    setSubDetails(""); 
    setSubDueDate(""); 
    setAddingSubtaskToId(null);

    isSavingRef.current = false;
    setIsSaving(false);

    try {
      const saved = await createTask(targetListId, { 
        title: optimisticSubtask.title, 
        description: optimisticSubtask.description, 
        dueDate: optimisticSubtask.due_date, 
        parentTaskId: oldParentId 
      });
      setTasks(p => p.map(t => t.id === tempId ? saved : t));
    } catch (e) { 
      console.error(e); 
      setTasks(p => p.filter(t => t.id !== tempId));
    }
  }

  function startEditTask(task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDetails(task.description || ""); 
    setEditDueDate(formatDateForInput(task.due_date));
  }

  async function saveEditTask() {
    if (!editTitle.trim()) return;
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editTitle.trim(), description: editDetails.trim(), due_date: editDueDate } : t));
    const idToUpdate = editingTaskId;
    setEditingTaskId(null);
    try { await updateTask(idToUpdate, { title: editTitle.trim(), description: editDetails.trim(), dueDate: editDueDate || null }); } catch (err) { console.error(err); }
  }

  async function handleDelete(taskId) {
    const taskToRestore = tasks.find(t => t.id === taskId);
    
    const subtasksToRestore = tasks.filter(t => {
       const pid = t.parent_task_id || t.parentTaskId;
       return String(pid) === String(taskId);
    });
    
    setTasks(p => p.filter(t => {
      const pid = t.parent_task_id || t.parentTaskId;
      return String(t.id) !== String(taskId) && String(pid) !== String(taskId);
    }));
    
    setOpenMenuTaskId(null);
  
    try {
      await deleteTask(taskId);
      
      showUndoToast("Task deleted", 
        async () => {
          setTasks(prev => [...prev, taskToRestore, ...subtasksToRestore]); 
          try { await restoreTask(taskId); } 
          catch (e) { setTasks(prev => prev.filter(t => t.id !== taskId)); }
        },
        async () => {
          try { 
            await permanentDeleteTask(taskId); 
          }
          catch (e) { console.error("Failed to permanently delete", e); }
        }
      );
    } catch (e) { 
      if (taskToRestore) setTasks(prev => [...prev, taskToRestore, ...subtasksToRestore]);
      console.error(e); 
    }
  }

  async function handleToggleComplete(taskId, status) {
    const newStatus = !status;
    setTasks(p => p.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t));
    try { await toggleTaskComplete(taskId, newStatus); } catch (e) { setTasks(p => p.map(t => t.id === taskId ? { ...t, is_completed: status } : t)); }
  }

  async function handleToggleStar(taskId, status) {
    const newStatus = !status;
    if (isStarredMode && !newStatus) { setTasks(p => p.filter(t => t.id !== taskId)); } 
    else { setTasks(p => p.map(t => t.id === taskId ? { ...t, is_starred: newStatus } : t)); }
    try { await toggleTaskStar(taskId, newStatus); } catch (e) { loadTasks(); }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const findContainer = (items) => {
        if (items.find(i => i.id === active.id)) return items; 
        for (const item of items) {
            if (item.children && item.children.length > 0) {
                const found = findContainer(item.children);
                if (found) return found;
            }
        }
        return null;
    };

    const activeContainer = findContainer(activeRoots);
    
    if (activeContainer) {
        const oldIndex = activeContainer.findIndex(t => t.id === active.id);
        const newIndex = activeContainer.findIndex(t => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedGroup = arrayMove(activeContainer, oldIndex, newIndex);
            
            const updateTree = (nodes) => {
               if (nodes.find(n => n.id === active.id)) return reorderedGroup;
               return nodes.map(node => ({
                   ...node,
                   children: node.children ? updateTree(node.children) : []
               }));
            };

            const newActiveRoots = updateTree(activeRoots);

            const flatten = (nodes) => {
                let flat = [];
                nodes.forEach(n => {
                    flat.push(n); 
                    if (n.children && n.children.length > 0) {
                        flat.push(...flatten(n.children)); 
                    }
                });
                return flat;
            };

            const flatActive = flatten(newActiveRoots);
            
            // Just flatten completed tasks as is, no tree structure usually needed for state unless expanding
            const flattenCompleted = (nodes) => {
                 let flat = [];
                 nodes.forEach(n => {
                    flat.push(n);
                    if(n.children) flat.push(...flattenCompleted(n.children));
                 });
                 return flat;
            }
            const flatCompleted = flattenCompleted(completedRoots);
            
            setTasks([...flatActive, ...flatCompleted]);

            if (list) {
                const reorderedIds = reorderedGroup.map(t => t.id);
                reorderTasks(list.id, reorderedIds).catch(console.error);
            }
        }
    }
  }

  const openMenu = (e, taskId, isSubtask) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setOpenMenuTaskId(taskId);
    setIsMenuForSubtask(isSubtask);
  };

  const hasContent = editorOpen || tasks.length > 0;

  /* ================= SUB-COMPONENTS ================= */
  
  const DateTrigger = ({ value, onChange }) => (
    <label className={styles.iconOnlyBtn} title="Select Date">
      <CalendarIcon />
      <input type="date" className={styles.hiddenDateInput} value={value || ""} onChange={e => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} />
    </label>
  );

  const DatePill = ({ value, onClear }) => {
    if (!value) return null;
    return (
      <div className={styles.deadlinePill}>
        <CalendarIcon />
        <span>{formatSmartDate(value)}</span>
        <button className={styles.clearBtn} onClick={(e) => { e.preventDefault(); onClear(); }} title="Clear date">✕</button>
      </div>
    );
  };

  const renderTaskItem = (task, isSubtask = false) => {
    const isEditing = editingTaskId === task.id;
    const isAddingSub = addingSubtaskToId === task.id;
    const children = task.children || [];

    const content = (
      <div key={task.id} className={styles.taskContainer}>
        {isEditing ? (
          /* --- EDIT MODE --- */
          <div className={`${styles.taskEditor} ${styles.editorAnimate}`}>
            <textarea 
                ref={editTitleRef} 
                rows={1} 
                maxLength={TITLE_LIMIT} 
                className={styles.editorTitle} 
                value={editTitle} 
                // 🔥 FIX: Stop Propagation to prevent drag interference
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => { setEditTitle(e.target.value); resize(editTitleRef, 96); }} 
            />
            <textarea 
                ref={editDetailsRef} 
                maxLength={DETAILS_LIMIT} 
                className={styles.editorDetails} 
                value={editDetails} 
                // 🔥 FIX: Stop Propagation
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => { setEditDetails(e.target.value); resize(editDetailsRef, 160); }} 
            />
            <div className={styles.deadlineRow}>
               <button className={styles.deadlineBtn} onClick={() => setEditDueDate(getLocalISODate(new Date()))}>Today</button>
               <button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setEditDueDate(getLocalISODate(d)); }}>Tomorrow</button>
               <DateTrigger value={editDueDate} onChange={setEditDueDate} />
            </div>
            <DatePill value={editDueDate} onClear={() => setEditDueDate("")} />
            <div className={styles.editorActionsRight}>
              <button className={styles.cancelBtn} onClick={() => setEditingTaskId(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={saveEditTask} disabled={!editTitle.trim()}>Save</button>
            </div>
          </div>
        ) : (
          /* --- VIEW MODE --- */
          <li className={`${styles.taskItem} ${task.is_completed ? styles.completedTask : ""}`} onClick={(e) => { if (!isInteractive(e.target)) startEditTask(task); }}>
            <input type="checkbox" className={styles.checkbox} checked={!!task.is_completed} onChange={() => handleToggleComplete(task.id, !!task.is_completed)} onClick={(e) => e.stopPropagation()} />
            <div className={styles.taskText}>
              <span className={styles.taskTitle}>{task.title}</span>
              {task.description && <span className={styles.taskDetails}>{task.description}</span>}
              {task.due_date && (
                <span className={`${styles.taskDate} ${isOverdue(task.due_date) && !task.is_completed ? styles.overdue : ""}`}>
                  <CalendarIcon /> {formatSmartDate(task.due_date)}
                </span>
              )}
            </div>
            <div className={styles.taskActions}>
              <div className={styles.menuWrapper}><button className={styles.more} onClick={(e) => openMenu(e, task.id, isSubtask)}>⋮</button></div>
              <button className={`${styles.star} ${task.is_starred ? styles.starred : ""}`} onClick={(e) => { e.stopPropagation(); handleToggleStar(task.id, !!task.is_starred); }} />
            </div>
          </li>
        )}
        
        {children.length > 0 && (
            <SortableContext 
                items={children.map(c => c.id)} 
                strategy={verticalListSortingStrategy}
            >
                <ul className={styles.subtaskList}>
                    {children.map(child => renderTaskItem(child, true))}
                </ul>
            </SortableContext>
        )}

        {isAddingSub && (
          <div className={`${styles.taskEditor} ${styles.subtaskEditor} ${styles.editorAnimate}`}>
             <div className={styles.subtaskLine}></div>
             <textarea 
                ref={subTitleRef} 
                rows={1} 
                maxLength={TITLE_LIMIT} 
                className={styles.editorTitle} 
                placeholder="Subtask title" 
                value={subTitle} 
                // 🔥 FIX: Stop Propagation
                onKeyDown={(e) => e.stopPropagation()}
                onChange={e => { setSubTitle(e.target.value); resize(subTitleRef, 96); }} 
            />
             <textarea 
                className={styles.editorDetails} 
                maxLength={DETAILS_LIMIT} 
                placeholder="Details" 
                value={subDetails} 
                // 🔥 FIX: Stop Propagation
                onKeyDown={(e) => e.stopPropagation()}
                onChange={e => setSubDetails(e.target.value)} 
            />
             <div className={styles.deadlineRow}>
                <button className={styles.deadlineBtn} onClick={() => setSubDueDate(getLocalISODate(new Date()))}>Today</button>
                <button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setSubDueDate(getLocalISODate(d)); }}>Tomorrow</button>
                <DateTrigger value={subDueDate} onChange={setSubDueDate} />
             </div>
             <DatePill value={subDueDate} onClear={() => setSubDueDate("")} />
             <div className={styles.editorActionsRight}>
               <button className={styles.cancelBtn} onClick={() => setAddingSubtaskToId(null)}>Cancel</button>
               <button className={styles.saveBtn} onClick={saveSubtask} disabled={!subTitle.trim() || isSaving}>
                 {isSaving ? "Saving..." : "Save"}
               </button>
             </div>
          </div>
        )}
      </div>
    );

    if (!task.is_completed && !isStarredMode) {
        return <SortableTaskWrapper key={task.id} task={task}>{content}</SortableTaskWrapper>;
    }
    return content;
  };

  /* ================= MAIN RENDER ================= */
  return (
    <>
      <section className={`${styles.card} ${hasContent ? styles.cardExpanded : ""} ${isSingleView || isStarredMode ? styles.singleViewCard : ""}`}>
        <header className={styles.header}>
          <h3 className={styles.title}>{list ? list.name : "Starred Tasks"}</h3>
          {showListMenu && (
            <div className={styles.menuWrapper} ref={listMenuRef}>
              <button className={styles.menuButton} onClick={() => setListMenuOpen(p => !p)}>⋮</button>
              <div className={`${styles.dropdown} ${listMenuOpen ? styles.dropdownOpen : ""}`}>
                <button className={styles.menuItem} onClick={() => { setListMenuOpen(false); setRenameOpen(true); }}>Rename list</button>
                {!isDefaultList ? ( <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => onDeleteList(list.id)}>Delete list</button> ) : ( <><div className={styles.disabledItem}>Delete list</div><div className={styles.helperText}>The default list can’t be deleted</div></> )}
              </div>
            </div>
          )}
        </header>

        <div className={styles.contentWrapper}>
          {!editorOpen && (
            <button className={styles.addTaskButton} onClick={() => setEditorOpen(true)}>
              <span className={styles.plus}>＋</span> {isStarredMode ? "Add a starred task" : "Add a task"}
            </button>
          )}
          
          {editorOpen && (
             <div className={`${styles.taskEditor} ${styles.editorAnimate}`}>
              <textarea 
                ref={titleRef} 
                rows={1} 
                maxLength={TITLE_LIMIT} 
                className={styles.editorTitle} 
                placeholder="Title" 
                value={title} 
                // 🔥 FIX: Stop Propagation
                onKeyDown={(e) => e.stopPropagation()}
                onChange={e => { setTitle(e.target.value); resize(titleRef, 96); }} 
              />
              <textarea 
                ref={detailsRef} 
                maxLength={DETAILS_LIMIT} 
                className={styles.editorDetails} 
                placeholder="Details" 
                value={details} 
                // 🔥 FIX: Stop Propagation
                onKeyDown={(e) => e.stopPropagation()}
                onChange={e => { setDetails(e.target.value); resize(detailsRef, 160); }} 
              />
              <div className={styles.deadlineRow}>
                 <button className={styles.deadlineBtn} onClick={() => setDueDate(getLocalISODate(new Date()))}>Today</button>
                 <button className={styles.deadlineBtn} onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setDueDate(getLocalISODate(d)); }}>Tomorrow</button>
                 <DateTrigger value={dueDate} onChange={setDueDate} />
              </div>
              <DatePill value={dueDate} onClear={() => setDueDate("")} />
              <div className={styles.editorActionsRight}>
                 <button className={styles.cancelBtn} onClick={() => setEditorOpen(false)}>Cancel</button>
                 <button className={styles.saveBtn} onClick={saveTask} disabled={!title.trim() || isSaving}>
                   {isSaving ? "Saving..." : "Save"}
                 </button>
              </div>
            </div>
          )}

          {tasks.length === 0 && !editorOpen && (
            <div className={styles.empty}>
              <Lottie animationData={isStarredMode ? StarAnimation : EmptyTasksAnimation} loop style={isStarredMode ? { width: 150, height: 150 } : undefined} />
              <p>{isStarredMode ? "No starred tasks yet" : "No tasks yet"}</p>
            </div>
          )}

          {tasks.length > 0 && activeRoots.length === 0 && !editorOpen && (
             <div className={styles.empty}>
                <Lottie animationData={CompletedAnimation} loop={false} style={{ width: 180, height: 180 }} />
                <p>All tasks completed!</p>
             </div>
          )}
          
          <div className={styles.scrollContainer}>
             <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
             >
                <SortableContext 
                    items={activeRoots.map(t => t.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    <ul className={styles.taskList}>
                        {activeRoots.map(task => renderTaskItem(task, false))}
                    </ul>
                </SortableContext>
             </DndContext>

             {!isStarredMode && completedRoots.length > 0 && (
               <div className={styles.completedSection}>
                 <button className={styles.completedHeader} onClick={() => setShowCompleted(p => !p)}>
                   Completed ({completedRoots.length}) <span className={`${styles.chevron} ${showCompleted ? styles.rotate : ""}`}>▼</span>
                 </button>
                 {showCompleted && <ul className={styles.taskList}>{completedRoots.map(task => renderTaskItem(task, false))}</ul>}
               </div>
             )}
          </div>
        </div>
      </section>

      {openMenuTaskId && (
        <div className={`${styles.dropdown} ${styles.dropdownOpen}`} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: '200px' }} ref={taskMenuRef} onClick={(e) => e.stopPropagation()}>
           {!isStarredMode && !isMenuForSubtask && (<button className={styles.menuItem} onClick={() => { setOpenMenuTaskId(null); setAddingSubtaskToId(openMenuTaskId); }}><span>↳</span> Add a subtask</button>)}
           <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => handleDelete(openMenuTaskId)}><span>🗑</span> Delete</button>
        </div>
      )}
      {list && <RenameListModal isOpen={renameOpen} currentName={list.name} onCancel={() => setRenameOpen(false)} onRename={(n) => { setRenameOpen(false); onRenameList(list.id, n); }} />}
    </>
  );
}