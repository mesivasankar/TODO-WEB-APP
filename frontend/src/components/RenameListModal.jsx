import { useState, useEffect } from "react";
import styles from "./RenameListModal.module.css";

export default function RenameListModal({
  isOpen,
  currentName,
  onCancel,
  onRename,
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(currentName || "");
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onRename(name.trim());
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={styles.title}>Rename list</h3>

        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            className={styles.input}
            value={name}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setName(e.target.value)}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onCancel}
            >
              Cancel
            </button>

            <button type="submit" className={styles.save}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
