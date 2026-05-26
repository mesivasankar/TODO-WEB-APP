import { useState, useEffect } from "react";
import { fetchMatrixTasks, addMatrixTask, deleteMatrixTask, updateMatrixTask } from "../../api/matrixApi";
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core";
import { useToast } from "../../contexts/ToastContext";
import styles from "./PriorityMatrix.module.css";

const quadrants = [
  { id: 1, title: "Urgent & Important", color: "#f87171", action: "DO IT NOW" },
  { id: 2, title: "Not Urgent & Important", color: "#818cf8", action: "SCHEDULE IT" },
  { id: 3, title: "Urgent & Not Important", color: "#fbbf24", action: "DELEGATE IT" },
  { id: 4, title: "Not Urgent & Not Important", color: "#34d399", action: "ELIMINATE IT" },
];

/* ============================================================
   SUB-COMPONENT: DRAGGABLE TASK CARD
   ============================================================ */
function MatrixDraggableTask({ 
  task, 
  qColor, 
  onToggle, 
  onDelete, 
  editingId, 
  editText, 
  setEditText, 
  handleSaveEdit, 
  setEditingId 
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, sourceQuadrant: task.quadrant },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.taskCard} ${task.is_completed ? styles.completed : ""} ${isDragging ? styles.dragging : ""}`}
      {...attributes}
    >
      {/* Premium Grip Handle: drag only active from here, preserving click/select area */}
      <div className={styles.gripHandle} {...listeners} title="Drag to re-prioritize">
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.4 }}>
          <circle cx="2" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="15" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      </div>

      <div className={styles.cardLeft}>
        <div className={styles.checkboxWrapper} onClick={() => onToggle(task)}>
          <input
            type="checkbox"
            checked={task.is_completed}
            onChange={() => { }} // handled by click wrapper
            className={styles.checkbox}
          />
          <span
            className={styles.customCheck}
            style={{
              borderColor: qColor,
              backgroundColor: task.is_completed ? qColor : "transparent"
            }}
          />
        </div>

        {editingId === task.id ? (
          <input
            autoFocus
            maxLength="50"
            className={styles.editInput}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => handleSaveEdit(task.id)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(task.id)}
          />
        ) : (
          <span
            className={styles.taskText}
            onClick={() => {
              setEditingId(task.id);
              setEditText(task.task_text);
            }}
          >
            {task.task_text}
          </span>
        )}
      </div>

      <button onClick={() => onDelete(task.id)} className={styles.deleteBtn} title="Delete focus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: DROPPABLE QUADRANT ZONE
   ============================================================ */
function MatrixDroppableQuadrant({ quadrant, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id,
  });

  const glowClass = isOver ? styles.quadGlow : "";

  return (
    <div
      ref={setNodeRef}
      className={`${styles.quadrant} ${styles['quad' + quadrant.id]} ${glowClass}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT: PRIORITY MATRIX
   ============================================================ */
export default function PriorityMatrix() {
  const [tasks, setTasks] = useState([]);
  const [inputs, setInputs] = useState({ 1: "", 2: "", 3: "", 4: "" });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeId, setActiveId] = useState(null);
  const { showUndoToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // preserves click versus drag actions
      },
    })
  );

  useEffect(() => {
    fetchMatrixTasks()
      .then((data) => {
        const taskList = Array.isArray(data) ? data : (data?.data || []);
        setTasks(taskList);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  const handleAdd = async (qId) => {
    const text = inputs[qId].trim();
    const qTasks = tasks.filter(t => t.quadrant === qId);
    if (!text || qTasks.length >= 2) return;

    try {
      const newTask = await addMatrixTask(text, qId);
      setTasks((prev) => [...prev, newTask]);
      setInputs({ ...inputs, [qId]: "" });
    } catch (err) { console.error("Add error:", err); }
  };

  const handleToggle = async (task) => {
    try {
      const updated = await updateMatrixTask(task.id, {
        is_completed: !task.is_completed
      });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (err) { console.error("Toggle error:", err); }
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await updateMatrixTask(id, { text: editText });
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
    } catch (err) { console.error("Edit error:", err); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMatrixTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error("Delete error:", err); }
  };

  /* ============================================================
     DRAG EVENTS ORCHESTRATION
     ============================================================ */
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const targetQuadrantId = Number(over.id);
    const task = active.data.current.task;
    const sourceQuadrantId = Number(active.data.current.sourceQuadrant);

    if (targetQuadrantId === sourceQuadrantId) return;

    // Check capacity constraint (Focus Lock - Max 2 items per quadrant)
    const targetQuadrantTasks = tasks.filter(t => t.quadrant === targetQuadrantId);
    if (targetQuadrantTasks.length >= 2) {
      const quadName = quadrants.find(q => q.id === targetQuadrantId)?.title || `Quadrant ${targetQuadrantId}`;
      showUndoToast(`Focus locked (2/2): Quadrant "${quadName}" is full!`);
      return;
    }

    // Optimistic state transition
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrantId } : t));

    try {
      await updateMatrixTask(task.id, { quadrant: targetQuadrantId });
    } catch (err) {
      console.error("Failed to move task:", err);
      // Revert optimistic sync
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: sourceQuadrantId } : t));
      showUndoToast("Failed to re-prioritize task. Reverted.");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerArea}>
        <h1 className={styles.header}>Priority Matrix</h1>
        <p className={styles.subtitle}>Filter and focus on your top 2 highest leverage tasks per quadrant.</p>
      </header>

      <div className={styles.matrixWrapper}>
        {/* Horizontal Axis Label (Top) */}
        <div className={styles.xAxisLabelTop}>
          <span>URGENT</span>
          <span>NOT URGENT</span>
        </div>

        <div className={styles.matrixContent}>
          {/* Vertical Axis Label (Left) */}
          <div className={styles.yAxisLabelLeft}>
            <span className={styles.axisTextVertical}>IMPORTANT</span>
            <span className={styles.axisTextVertical}>NOT IMPORTANT</span>
          </div>

          <div className={styles.gridContainer}>
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {/* The 4 Quadrants Grid */}
              <div className={styles.grid}>
                {quadrants.map((q) => {
                  const qTasks = tasks.filter((t) => t.quadrant === q.id);

                  return (
                    <MatrixDroppableQuadrant key={q.id} quadrant={q}>
                      <div className={styles.quadHeader}>
                        <div className={styles.titleRow}>
                          <span className={styles.badge} style={{ backgroundColor: q.color }}>Q{q.id}</span>
                          <h3 className={styles.quadTitle}>{q.title}</h3>
                        </div>
                        <span className={styles.quadAction} style={{ color: q.color }}>{q.action}</span>
                      </div>

                      <div className={styles.taskList}>
                        {qTasks.map((task) => (
                          <MatrixDraggableTask
                            key={task.id}
                            task={task}
                            qColor={q.color}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            editingId={editingId}
                            editText={editText}
                            setEditText={setEditText}
                            handleSaveEdit={handleSaveEdit}
                            setEditingId={setEditingId}
                          />
                        ))}

                        {qTasks.length === 0 && (
                          <div className={styles.emptyState}>
                            <span className={styles.emptyText}>EMPTY</span>
                          </div>
                        )}
                      </div>

                      {qTasks.length < 2 ? (
                        <div className={styles.inputWrapper}>
                          <input
                            className={styles.matrixInput}
                            maxLength="50"
                            value={inputs[q.id]}
                            onChange={(e) => setInputs({ ...inputs, [q.id]: e.target.value })}
                            placeholder="Add focus item..."
                            onKeyDown={(e) => e.key === "Enter" && handleAdd(q.id)}
                          />
                          <button className={styles.innerAddBtn} style={{ background: q.color }} onClick={() => handleAdd(q.id)}>+</button>
                        </div>
                      ) : (
                        <div className={styles.limitReached}>
                          <svg className={styles.lockIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          Focus Locked (2/2)
                        </div>
                      )}
                    </MatrixDroppableQuadrant>
                  );
                })}
              </div>

              {/* Glowing active drag card representation */}
              <DragOverlay>
                {activeId ? (() => {
                  const activeTask = tasks.find(t => t.id === activeId);
                  if (!activeTask) return null;
                  const q = quadrants.find(quad => quad.id === activeTask.quadrant);
                  return (
                    <div 
                      className={`${styles.taskCard} ${styles.dragOverlay}`} 
                      style={{ 
                        borderColor: q.color, 
                        transform: "rotate(3deg)", 
                        cursor: "grabbing",
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                    >
                      <div className={styles.gripHandle}>
                        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
                          <circle cx="2" cy="3" r="1.5" fill="currentColor"/>
                          <circle cx="2" cy="9" r="1.5" fill="currentColor"/>
                          <circle cx="2" cy="15" r="1.5" fill="currentColor"/>
                          <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
                          <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
                          <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
                        </svg>
                      </div>
                      <div className={styles.cardLeft}>
                        <div className={styles.checkboxWrapper}>
                          <span 
                            className={styles.customCheck} 
                            style={{ 
                              borderColor: q.color, 
                              backgroundColor: activeTask.is_completed ? q.color : "transparent" 
                            }} 
                          />
                        </div>
                        <span className={styles.taskText}>{activeTask.task_text}</span>
                      </div>
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>


          </div>
        </div>
      </div>
    </div>
  );
}