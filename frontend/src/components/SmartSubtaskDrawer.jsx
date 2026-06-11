import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SmartSubtaskDrawer.module.css";
import { suggestSubtasks, getAiUsage } from "../api/tasksApi";
import { useToast } from "../contexts/ToastContext";

// --- Custom SVGs for a polished look ---
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function SmartSubtaskDrawer({ isOpen, onClose, task, onApply }) {
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [newStepText, setNewStepText] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [quota, setQuota] = useState({ dailyLimit: 5, dailyRemaining: 5, isProduction: false });
  const { showUndoToast } = useToast();

  const drawerRef = useRef(null);
  const listEndRef = useRef(null);

  // Load initial suggestions from task title when opened
  useEffect(() => {
    if (isOpen && task) {
      fetchUsage();
      generateInitialSteps();
    } else {
      setSteps([]);
      setFeedback("");
      setNewStepText("");
    }
  }, [isOpen, task]);

  // Click outside to close drawer
  useEffect(() => {
    function handleClickOutside(e) {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target) && !e.target.closest("[data-testid='task-menu-btn']")) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const fetchUsage = async () => {
    try {
      const data = await getAiUsage();
      setQuota({ dailyLimit: data.dailyLimit, dailyRemaining: data.dailyRemaining, isProduction: data.isProduction });
    } catch (e) {
      console.error("Failed to load AI usage", e);
    }
  };

  const generateInitialSteps = async () => {
    setIsLoading(true);
    try {
      const res = await suggestSubtasks(task.title);
      setQuota({ dailyLimit: res.dailyLimit, dailyRemaining: res.dailyRemaining, isProduction: res.isProduction });
      const formatted = res.subtasks.map((title) => ({
        id: self.crypto.randomUUID(),
        title,
        selected: true
      }));
      setSteps(formatted);
    } catch (err) {
      console.error(err);
      showUndoToast(err.message || "Failed to generate suggestions. Try again.");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || isLoading) return;

    setIsLoading(true);
    const instruction = feedback.trim();
    setFeedback("");
    try {
      const res = await suggestSubtasks(task.title, instruction);
      setQuota({ dailyLimit: res.dailyLimit, dailyRemaining: res.dailyRemaining, isProduction: res.isProduction });
      const formatted = res.subtasks.map((title) => ({
        id: self.crypto.randomUUID(),
        title,
        selected: true
      }));
      setSteps(formatted);
    } catch (err) {
      console.error(err);
      showUndoToast(err.message || "Failed to refine suggestions. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStep = (index) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
  };

  const handleDeleteStep = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomStep = (e) => {
    e.preventDefault();
    if (!newStepText.trim()) return;

    const newStep = {
      id: self.crypto.randomUUID(),
      title: newStepText.trim(),
      selected: true
    };
    setSteps(prev => [...prev, newStep]);
    setNewStepText("");
    setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const startEditing = (index, text) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const saveEditing = (index) => {
    if (!editingText.trim()) {
      handleDeleteStep(index);
    } else {
      setSteps(prev => prev.map((s, i) => i === index ? { ...s, title: editingText.trim() } : s));
    }
    setEditingIndex(null);
  };

  const handleImport = async () => {
    const selectedSteps = steps.filter(s => s.selected).map(s => s.title);
    if (selectedSteps.length === 0) {
      showUndoToast("Please select at least one subtask to import.");
      return;
    }

    setIsLoading(true);
    try {
      await onApply(task, selectedSteps);
      onClose();
    } catch (err) {
      console.error(err);
      showUndoToast("Failed to apply subtasks.");
    } finally {
      setIsLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={styles.drawerBackdrop}>
          {/* Blurred Background Overlay */}
          <motion.div
            className={styles.backdropBlur}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sliding Panel */}
          <motion.div
            ref={drawerRef}
            className={styles.drawerPanel}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
          >
            {/* Header */}
            <header className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.sparkleBg}><SparklesIcon /></div>
                <div>
                  <h3 className={styles.title}>Smart Subtask Designer</h3>
                  <p className={styles.subtitle}>Iterate and customize AI steps for: "{task?.title}"</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
                <CloseIcon />
              </button>
            </header>

            {/* Main Area */}
            <div className={styles.body}>
              {isLoading && steps.length === 0 ? (
                <div className={styles.loaderContainer}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>Actdone AI is designing subtasks...</p>
                </div>
              ) : (
                <div className={styles.listContainer}>
                  {steps.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyEmoji}>💡</span>
                      <p>No subtasks generated yet. Type in the refinement bar below to create customized steps!</p>
                    </div>
                  ) : (
                    <ul className={styles.stepList}>
                      {steps.map((step, idx) => {
                        const isEditing = editingIndex === idx;
                        return (
                          <motion.li
                            key={step.id}
                            className={`${styles.stepItem} ${step.selected ? styles.selectedStep : ""}`}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            {/* Checkbox Wrapper */}
                            <div className={styles.checkWrapper} onClick={() => handleToggleStep(idx)}>
                              <div className={`${styles.customCheckbox} ${step.selected ? styles.checkboxChecked : ""}`}>
                                {step.selected && <CheckIcon />}
                              </div>
                            </div>

                            {/* Text Input / Label */}
                            <div className={styles.textWrapper}>
                              {isEditing ? (
                                <input
                                  autoFocus
                                  className={styles.inlineInput}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={() => saveEditing(idx)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditing(idx);
                                    if (e.key === "Escape") setEditingIndex(null);
                                  }}
                                />
                              ) : (
                                <span
                                  className={styles.stepText}
                                  onClick={() => startEditing(idx, step.title)}
                                  title="Click to edit step"
                                >
                                  {step.title}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.actions}>
                              <button
                                className={styles.iconBtn}
                                onClick={() => handleDeleteStep(idx)}
                                title="Delete step"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </motion.li>
                        );
                      })}
                      <div ref={listEndRef} />
                    </ul>
                  )}

                  {/* Inline New Step Form */}
                  <form onSubmit={handleAddCustomStep} className={styles.addCustomForm}>
                    <input
                      type="text"
                      className={styles.customStepInput}
                      placeholder="Add custom task step..."
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                    />
                    <button type="submit" className={styles.addCustomBtn} title="Add step">
                      <PlusIcon />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer Workspace Panel */}
            <footer className={styles.footer}>
              {/* Feedback Refining Chat Box */}
              <form onSubmit={handleRefine} className={styles.refineForm}>
                <input
                  type="text"
                  className={styles.refineInput}
                  placeholder='Ask Actdone AI: "Make it more technical", "Add research steps"...'
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" className={styles.refineBtn} disabled={!feedback.trim() || isLoading} title="Send refinement request">
                  {isLoading ? <div className={styles.miniSpinner} /> : <SendIcon />}
                </button>
              </form>

              {/* Quota Indicator */}
              <div className={styles.quotaIndicator}>
                <span className={styles.quotaDot} style={{ backgroundColor: quota.dailyRemaining > 0 ? '#10b981' : '#ef4444' }} />
                <span className={styles.quotaText}>
                  {quota.isProduction
                    ? `AI Daily Quota: ${quota.dailyRemaining} of ${quota.dailyLimit} remaining`
                    : `Daily Quota: Unlimited (Local Dev Mode)`
                  }
                </span>
              </div>

              {/* Action Buttons */}
              <div className={styles.footerActions}>
                <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
                  Cancel
                </button>
                <button
                  className={styles.applyBtn}
                  onClick={handleImport}
                  disabled={isLoading || steps.filter(s => s.selected).length === 0}
                >
                  {isLoading ? "Importing..." : `Apply ${steps.filter(s => s.selected).length} Steps`}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
