import React, { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const cardRef = useRef(null);

  useEffect(() => {
    // Focus card for ESC key
    if (cardRef.current) cardRef.current.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.card}
        ref={cardRef}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 id="confirm-title" className={styles.title}>{title}</h2>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.btnNo}
            onClick={onCancel}
            aria-label="Cancel logout"
          >
            No
          </button>
          <button
            className={styles.btnYes}
            onClick={onConfirm}
            aria-label="Confirm logout"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
