import { useEffect, useState } from "react";
import styles from "./CreateListModal.module.css";

export default function CreateListModal({
  isOpen,
  onCancel,
  onCreate,
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isValid = name.trim().length > 0;

  async function handleCreate() {
    // 🔒 prevent duplicate submissions
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onCreate(name.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Create new list</h2>

        <input
          className={styles.input}
          type="text"
          placeholder="Enter name"
          value={name}
          autoFocus
          disabled={isSubmitting}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className={styles.actions}>
          <button
            className={styles.cancel}
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className={styles.done}
            disabled={!isValid || isSubmitting}
            onClick={handleCreate}
          >
            {isSubmitting ? "Creating..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
