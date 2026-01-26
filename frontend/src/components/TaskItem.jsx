import styles from "./TaskItem.module.css";

export default function TaskItem({ task, onToggle }) {
  const handleToggle = () => {
    onToggle(task.id);
  };

  return (
    <div
      className={`${styles.taskItem} ${
        task.is_completed ? styles.completed : ""
      }`}
      onClick={handleToggle}
    >
      <input
        type="checkbox"
        checked={task.is_completed}
        onChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        className={styles.checkbox}
      />

      <span className={styles.title}>{task.title}</span>
    </div>
  );
}
