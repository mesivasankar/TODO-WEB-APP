import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { searchTasks } from "../api/tasksApi";
import styles from "./SearchSpotlight.module.css";
import { useNavigate } from "react-router-dom";

export default function SearchSpotlight({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      setResults([]);
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setIsLoading(true);
        try {
          const data = await searchTasks(query.trim());
          setResults(data.tasks || []);
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <span className={styles.loader}></span>}
          <button className={styles.escBadge} onClick={onClose}>ESC</button>
        </div>

        {results.length > 0 && (
          <div className={styles.resultsList}>
            {results.map((task) => (
              <div 
                key={task.id} 
                className={styles.resultItem}
                onClick={() => {
                   onClose();
                   if (task.list_id) navigate(`/app/all`); // Navigates to all, we could navigate to list but 'all' works fine
                }}
              >
                <div className={styles.resultIcon}>
                  {task.is_completed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  ) : (
                    <div className={styles.circle}></div>
                  )}
                </div>
                <div className={styles.resultText}>
                  <div className={styles.resultTitle} style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{task.title}</div>
                  <div className={styles.resultDetails}>
                    {task.list_name && <span className={styles.resultListBadge}>{task.list_name}</span>}
                    {task.description && <span className={styles.resultDesc}>{task.description}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {query && results.length === 0 && !isLoading && (
          <div className={styles.emptyState}>No tasks found matching "{query}"</div>
        )}
      </div>
    </div>,
    document.body
  );
}
