import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import styles from './ToastContext.module.css';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [isUndoing, setIsUndoing] = useState(false); 
  
  const isUndoneRef = useRef(false);

  // toast structure: { message, onUndo, onClose, id }
  const showUndoToast = useCallback((message, onUndoCallback, onCloseCallback) => {
    // 1. Force close existing toast immediately
    setToast((prev) => {
      // 🔥 FIX 1: Stop triggering Permanent Delete when a new toast replaces an old one
      // if (prev && prev.onClose && !isUndoneRef.current) {
      //   prev.onClose(); 
      // }
      return null;
    });

    // 2. Reset flags
    isUndoneRef.current = false;
    setIsUndoing(false); 

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
      // 🔥 FIX 2: Stop triggering Permanent Delete when clicking "X"
      // if (prev && prev.onClose && !isUndoneRef.current) {
      //   prev.onClose();
      // }
      return null;
    });
  }, []);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast((prev) => {
          if (prev && prev.id === toast.id) {
             // 🔥 FIX 3: Stop triggering Permanent Delete when Timer expires
             // if (prev.onClose && !isUndoneRef.current) {
             //   prev.onClose(); 
             // }
             return null;
          }
          return prev;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleUndo = async () => {
    if (!toast || !toast.onUndo || isUndoing) return;

    setIsUndoing(true); 
    isUndoneRef.current = true; 

    try {
      await toast.onUndo(); 
    } catch (error) {
      console.error("Undo failed", error);
    } finally {
      setToast(null); 
      setIsUndoing(false); 
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
            {toast.onUndo && (
              <button 
                className={styles.undoBtn} 
                onClick={handleUndo}
                disabled={isUndoing} 
                style={{ opacity: isUndoing ? 0.5 : 1, cursor: isUndoing ? 'default' : 'pointer' }} 
              >
                {isUndoing ? "Restoring..." : "Undo"}
              </button>
            )}
            <button 
              className={styles.closeBtn} 
              onClick={closeToast}
              disabled={isUndoing} 
            >✕</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}