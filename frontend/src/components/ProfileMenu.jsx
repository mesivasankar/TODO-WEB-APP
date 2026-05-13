import React, { useEffect, useRef, useState } from 'react';
import styles from './ProfileMenu.module.css';
import StatsDashboard from './StatsDashboard';

const ProfileMenu = ({ user, theme, toggleTheme, onLogout, onClose, onUpdateUser }) => {
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [showStats, setShowStats] = useState(false);

  // Close menu when clicking outside (Only if stats are NOT open)
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && !showStats) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [onClose, showStats]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    await onUpdateUser(editName);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
        setEditName(user?.name || "");
        setIsEditing(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <div className={styles.menuContainer} ref={menuRef}>
        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userHeader}>
              <div className={styles.userAvatar}>{userInitial}</div>
              {isEditing ? (
                  <div className={styles.nameWrapper}>
                      <input 
                          ref={inputRef}
                          className={styles.editInput}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          maxLength={30} 
                          placeholder="Your Name"
                      />
                      <div className={styles.saveActions}>
                          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSave}>
                            {/* Check Icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                          <button className={`${styles.actionBtn} ${styles.cancelBtn}`} onClick={() => { setIsEditing(false); setEditName(user?.name || ""); }}>
                            {/* X Icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className={styles.nameWrapper}>
                      <span className={styles.userName} title={user?.name}>{user?.name || 'User'}</span>
                      <button className={styles.editButton} onClick={() => setIsEditing(true)}>✎</button>
                  </div>
              )}
          </div>
        </div>

        <div className={styles.separator}></div>

        {/* Theme Switcher */}
        <div>
          <h4 className={styles.sectionTitle}>Theme</h4>
          <div className={styles.themeToggle}>
            <button className={`${styles.themeButton} ${theme === 'light' ? styles.activeTheme : ''}`} onClick={() => toggleTheme('light')}>☀ Light</button>
            <button className={`${styles.themeButton} ${theme === 'dark' ? styles.activeTheme : ''}`} onClick={() => toggleTheme('dark')}>☾ Dark</button>
          </div>
        </div>

        <div className={styles.separator}></div>

        {/* 🔥 FIXED: Proper Bar Chart Icon for Analytics */}
        <button className={styles.menuItem} onClick={() => setShowStats(true)}>
           <span className={styles.menuIcon}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
             </svg>
           </span>
           <span>View Analytics</span>
        </button>

        <div className={styles.separator}></div>

        {/* Logout */}
        <button className={styles.logoutButton} onClick={onLogout}>
          <span className={styles.menuIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </span>
          <span>Log out</span>
        </button>
      </div>

      {showStats && <StatsDashboard onClose={() => setShowStats(false)} />}
    </>
  );
};

export default ProfileMenu;