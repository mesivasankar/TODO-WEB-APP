import { useState, useEffect } from "react";
import { fetchMatrixTasks, addMatrixTask, deleteMatrixTask, updateMatrixTask } from "../../api/matrixApi";
import styles from "./PriorityMatrix.module.css";

const quadrants = [
  { id: 1, title: "Urgent & Important", color: "#ff4d4d", action: "DO IT NOW" },
  { id: 2, title: "Not Urgent & Important", color: "#4d94ff", action: "SCHEDULE IT" },
  { id: 3, title: "Urgent & Not Important", color: "#ffcc00", action: "DELEGATE IT" },
  { id: 4, title: "Not Urgent & Not Important", color: "#999999", action: "ELIMINATE IT" },
];

export default function PriorityMatrix() {
  const [tasks, setTasks] = useState([]);
  const [inputs, setInputs] = useState({ 1: "", 2: "", 3: "", 4: "" });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

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

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Priority Matrix</h1>
      <div className={styles.grid}>
        {quadrants.map((q) => {
          const qTasks = tasks.filter((t) => t.quadrant === q.id);
          
          return (
            <div key={q.id} className={styles.quadrant} style={{ borderTop: `4px solid ${q.color}` }}>
              <div className={styles.quadHeader}>
                <span className={styles.quadTitle}>{q.title}</span>
                <span className={styles.quadAction}>{q.action}</span>
              </div>
              
              <div className={styles.taskList}>
                {qTasks.map((task) => (
                  <div key={task.id} className={`${styles.taskCard} ${task.is_completed ? styles.completed : ""}`}>
                    <div className={styles.cardLeft}>
                      <input 
                        type="checkbox" 
                        checked={task.is_completed} 
                        onChange={() => handleToggle(task)}
                        className={styles.checkbox}
                      />
                      
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
                    
                    <div className={styles.hoverMenu}>
                      <button onClick={() => handleDelete(task.id)} className={styles.menuBtn}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>

              {qTasks.length < 2 ? (
                <div className={styles.inputWrapper}>
                  <input 
                    className={styles.matrixInput}
                    maxLength="50"
                    value={inputs[q.id]} 
                    onChange={(e) => setInputs({...inputs, [q.id]: e.target.value})}
                    placeholder="Add a focus..."
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(q.id)}
                  />
                  <button className={styles.innerAddBtn} onClick={() => handleAdd(q.id)}>+</button>
                </div>
              ) : (
                <div className={styles.limitReached}>🎯 Focus Locked (2/2)</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}