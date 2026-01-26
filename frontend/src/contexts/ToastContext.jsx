import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import styles from './ToastContext.module.css';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [isUndoing, setIsUndoing] = useState(false); // 🔥 New: Lock state for double-click prevention
  
  // We use a Ref to track if the toast was closed via "Undo"
  // so we don't trigger the permanent delete (onClose) if they successfully undid it.
  const isUndoneRef = useRef(false);

  // toast structure: { message, onUndo, onClose, id }
  const showUndoToast = useCallback((message, onUndoCallback, onCloseCallback) => {
    // 1. Force close existing toast immediately (triggering its onClose if pending)
    setToast((prev) => {
      if (prev && prev.onClose && !isUndoneRef.current) {
        prev.onClose();
      }
      return null;
    });

    // 2. Reset flags
    isUndoneRef.current = false;
    setIsUndoing(false); // Reset lock

    // 3. Show new toast after small delay
    setTimeout(() => {
      setToast({ 
        message, 
        onUndo: onUndoCallback,
        onClose: onCloseCallback, 
        id: Date.now() 
      });
    }, 50);
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => {
      // If closing manually (X button) and not undone, trigger onClose (Permanent Delete)
      if (prev && prev.onClose && !isUndoneRef.current) {
        prev.onClose();
      }
      return null;
    });
  }, []);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        // When timer expires, remove toast. 
        // This triggers the state update logic below to fire onClose.
        setToast((prev) => {
          if (prev && prev.id === toast.id) {
             if (prev.onClose && !isUndoneRef.current) {
                prev.onClose(); 
             }
             return null;
          }
          return prev;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleUndo = async () => {
    // 🔥 FIX: Prevent double execution
    if (!toast || !toast.onUndo || isUndoing) return;

    setIsUndoing(true); // Lock immediately
    isUndoneRef.current = true; // Mark as undone so onClose doesn't fire

    try {
      await toast.onUndo(); 
    } catch (error) {
      console.error("Undo failed", error);
    } finally {
      setToast(null); // Close immediately after undoing
      setIsUndoing(false); // Unlock
    }
  };

  return (
    <ToastContext.Provider value={{ showUndoToast }}>
      {children}
      
      {/* GLOBAL TOAST COMPONENT */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={styles.toastContent}>
            <span className={styles.message}>{toast.message}</span>
            <button 
              className={styles.undoBtn} 
              onClick={handleUndo}
              disabled={isUndoing} // 🔥 Disable button physically
              style={{ opacity: isUndoing ? 0.5 : 1, cursor: isUndoing ? 'default' : 'pointer' }} // Visual feedback
            >
              {isUndoing ? "Restoring..." : "Undo"}
            </button>
            <button 
              className={styles.closeBtn} 
              onClick={closeToast}
              disabled={isUndoing} // Prevent closing while restoring
            >✕</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}