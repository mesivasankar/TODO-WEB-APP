import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { searchTasks } from '../api/tasksApi';
import styles from './CommandPalette.module.css';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  // 1. Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // 2. Handle Search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchTasks(query);
        setResults(data.tasks || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const run = (action) => {
    action();
    setOpen(false);
    setQuery('');
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px' }}>
        <Command className={styles.container} shouldFilter={false} loop>
          <Command.Input
            className={styles.input}
            placeholder="Type to search tasks..."
            value={query}
            onValueChange={setQuery}
            autoFocus
          />

          <Command.List className={styles.list}>
            {/* Quick Actions (Only shown when NOT searching) */}
            {!query && (
              <Command.Group heading="Actions" className={styles.group}>
                <div className={styles.groupHeading}>Navigation</div>

                <Command.Item className={styles.item} onSelect={() => run(() => navigate('/app/all'))}>
                  <span>Go to All Tasks</span>
                </Command.Item>

                {/* 🔥 ADDED: Missing Navigation Options */}
                <Command.Item className={styles.item} onSelect={() => run(() => navigate('/app/today'))}>
                  <span>Go to Today</span>
                </Command.Item>

                <Command.Item className={styles.item} onSelect={() => run(() => navigate('/app/upcoming'))}>
                  <span>Go to Upcoming</span>
                </Command.Item>

                <Command.Item className={styles.item} onSelect={() => run(() => navigate('/app/starred'))}>
                  <span>Go to Starred</span>
                </Command.Item>

                <Command.Item className={styles.item} onSelect={() => run(() => navigate('/app/analytics'))}>
                  <span>View Analytics</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <div className={styles.groupHeading}>Results</div>
            )}

            {results.map((task) => (
              <Command.Item
                key={task.id}
                className={styles.item}
                onSelect={() => run(() => navigate(`/app/list/${task.list_id}`))}
              >
                <span>{task.is_completed ? "✅" : "⬜"} {task.title}</span>
                <span className={styles.shortcut}>{task.list_name || 'Inbox'}</span>
              </Command.Item>
            ))}

            {query && results.length === 0 && (
              <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>No results found.</div>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}