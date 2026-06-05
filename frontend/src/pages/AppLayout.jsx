import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/SideBar";
import ProfileMenu from "../components/ProfileMenu"; 
import CreateListModal from "../components/CreateListModal"; 
import SearchSpotlight from "../components/SearchSpotlight";
import ShortcutCheatSheet from "../components/ShortcutCheatSheet";
import styles from "./AppLayout.module.css";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

import LogoLight from "../assets/Logo-light.png"; 
import LogoDark from "../assets/Logo-dark.png";   

import useAuth from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext"; 
import { useToast } from "../contexts/ToastContext";
import {
  getLists,
  createList, 
  renameListApi,
  deleteListApi,
  reorderLists,
  restoreListApi,
  updateListSortApi,
} from "../api/listsApi";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [lists, setLists] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_lists');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isListsLoading, setIsListsLoading] = useState(() => {
    return !localStorage.getItem('cached_lists');
  });
  
  // 🔥 NEW: Lifted state to share counts between cards and sidebar
  const [taskCounts, setTaskCounts] = useState({});

  const { user, logout } = useAuth(); 
  const { theme, toggleTheme } = useTheme(); 
  const { showUndoToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeListId, setActiveListId] = useState(() => {
    return localStorage.getItem("activeListId") || null;
  });

  const [selectedListIds, setSelectedListIds] = useState(() => {
    const saved = localStorage.getItem("selectedListIds");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // 🔥 FIXED: Logo follows the active application theme
  const currentLogo = theme === 'dark' ? LogoLight : LogoDark;

  // 🔥 STRICT FIX: Ensure NO "?" ever appears. Fallback to 'A' (Actdone) if name/email are missing during sync.
  const userInitial = (user?.name?.trim() || user?.email?.trim() || "A").charAt(0).toUpperCase();

  // 🔥 NEW: Dynamic Favicon Switcher (Strictly Browser/System Based)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateFavicon = () => {
      const isBrowserDark = mediaQuery.matches;
      const favicon = document.getElementById("favicon");
      if (favicon) {
        favicon.href = isBrowserDark ? LogoLight : LogoDark;
      }
    };

    updateFavicon(); // Set initial favicon based on current browser preference

    // Dynamically react if the browser/OS theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateFavicon);
    } else {
      mediaQuery.addListener(updateFavicon);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateFavicon);
      } else {
        mediaQuery.removeListener(updateFavicon);
      }
    };
  }, []);

  useKeyboardShortcuts([
    { key: "l", ctrlCmd: true, action: () => setIsCreateModalOpen(true) },
    { key: "k", ctrlCmd: true, action: () => setIsSearchOpen(true) },
    { key: "d", ctrlCmd: true, action: () => toggleTheme(theme === 'dark' ? 'light' : 'dark') },
    { key: "?", shift: true, action: () => setIsCheatSheetOpen(true), allowInInput: false },
    { key: "Escape", action: () => {
        setIsSearchOpen(false);
        setIsCreateModalOpen(false);
        setIsCheatSheetOpen(false);
      }, allowInInput: true 
    }
  ]);

  useEffect(() => {
    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function init() {
      try {
        const data = await getLists();
        setLists(data);
        localStorage.setItem('cached_lists', JSON.stringify(data));
        
        const validIds = new Set(data.map((l) => l.id));
        const savedActiveId = localStorage.getItem("activeListId");
        
        if (savedActiveId && validIds.has(savedActiveId)) {
          setActiveListId(savedActiveId);
        } else if (data.length > 0) {
          const defaultList = data.find((l) => l.is_default === true) || data[0];
          setActiveListId(defaultList.id);
        }

        const validatedSelection = new Set([...selectedListIds].filter((id) => validIds.has(id)));
        if (validatedSelection.size === 0 && data.length > 0) {
           const def = data.find(l => l.is_default) || data[0];
           validatedSelection.add(def.id);
        }
        setSelectedListIds(validatedSelection);
      } catch (error) { 
        console.error("Failed to load lists", error); 
      } finally { 
        setIsListsLoading(false); 
      }
    }
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedListIds", JSON.stringify([...selectedListIds]));
    if (activeListId) localStorage.setItem("activeListId", activeListId);
  }, [selectedListIds, activeListId]);

  // 🔥 NEW: Global count handler
  const handleCountUpdate = useCallback((listId, count) => {
    setTaskCounts(prev => {
      if (prev[listId] === count) return prev;
      return { ...prev, [listId]: count };
    });
  }, []);

  async function handleCreateList(name, category) {
    const tempId = self.crypto.randomUUID(); 
    const optimisticList = { id: tempId, clientKey: tempId, name, category, is_default: false, isOptimistic: true };
    setIsCreateModalOpen(false);
    setLists((prev) => [...prev, optimisticList]);
    setSelectedListIds((prev) => new Set(prev).add(tempId));
    setActiveListId(tempId);

    try {
      const createdList = await createList(name, category);
      setLists((prev) => prev.map(list => list.id === tempId ? { ...createdList, clientKey: tempId, isNewlyCreated: true } : list));
      setSelectedListIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          next.add(createdList.id);
          return next;
      });
      setActiveListId(createdList.id);
    } catch (error) {
      setLists((prev) => prev.filter(list => list.id !== tempId));
      setSelectedListIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
      });
    }
  }

  function toggleListSelection(listId) {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
        if (activeListId === listId && next.size > 0) setActiveListId([...next][0]);
      } else {
        next.add(listId);
        setActiveListId(listId);
      }
      return next;
    });
  }

  async function handleRenameList(listId, newName) {
    setLists((prev) => prev.map((list) => list.id === listId ? { ...list, name: newName } : list));
    try { await renameListApi(listId, newName); } catch (err) { console.error(err); }
  }

  async function handleDeleteList(listId) {
    const listToDelete = lists.find((l) => l.id === listId);
    if (!listToDelete || listToDelete.is_default === true) return;

    const currentIndex = lists.findIndex((l) => l.id === listId);
    let nextActiveId = activeListId;
    if (activeListId === listId) {
      const remainingLists = lists.filter((l) => l.id !== listId);
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      nextActiveId = remainingLists[nextIndex]?.id || null;
    }

    const wasSelected = selectedListIds.has(listId);

    // Optimistic UI updates
    setLists((prev) => prev.filter((l) => l.id !== listId));
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      next.delete(listId);
      return next;
    });
    if (nextActiveId) setActiveListId(nextActiveId);

    try {
      await deleteListApi(listId);
      
      showUndoToast(`List "${listToDelete.name}" deleted`, async () => {
        // Undo Callback: Restore locally
        setLists((prev) => {
          const next = [...prev];
          next.splice(currentIndex, 0, listToDelete);
          return next;
        });
        if (wasSelected) {
          setSelectedListIds((prev) => {
            const next = new Set(prev);
            next.add(listId);
            return next;
          });
        }
        if (activeListId === listId) {
          setActiveListId(listId);
        }

        // Restore in DB
        try {
          await restoreListApi(listId);
        } catch (err) {
          console.error("Failed to restore list", err);
          // Rollback state if restore fails
          setLists((prev) => prev.filter((l) => l.id !== listId));
          setSelectedListIds((prev) => {
            const next = new Set(prev);
            next.delete(listId);
            return next;
          });
          if (activeListId === listId && nextActiveId) {
            setActiveListId(nextActiveId);
          }
        }
      });
    } catch (err) {
      console.error("Failed to delete list", err);
      // Revert optimistic delete if API fails
      setLists((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 0, listToDelete);
        return next;
      });
      if (wasSelected) {
        setSelectedListIds((prev) => {
          const next = new Set(prev);
          next.add(listId);
          return next;
        });
      }
      if (activeListId === listId) {
        setActiveListId(listId);
      }
    }
  }

  async function handleReorderLists(newLists) {
    setLists(newLists);
    try { await reorderLists(newLists.map(l => l.id)); } catch(err) { console.error(err); }
  }

  async function handleSortList(listId, sortOption) {
    setLists((prev) => prev.map((list) => list.id === listId ? { ...list, task_sort_option: sortOption } : list));
    try { await updateListSortApi(listId, sortOption); } catch (err) { console.error(err); }
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <button className={`${styles.menuButton} ${!isSidebarOpen ? styles.menuButtonActive : ''}`} onClick={() => setIsSidebarOpen((p) => !p)}>☰</button>
          <div className={styles.logoContainer}>
            <img src={currentLogo} alt="Actdone" className={styles.logoImage} />
            <span className={styles.appName}>ACTDONE</span>
          </div>
        </div>
        <div className={styles.navRight} style={{ position: 'relative', display: 'flex', gap: '16px', alignItems: 'center' }}>
           <button className={styles.searchNavBtn} onClick={() => setIsSearchOpen(true)} title="Search" id="search-btn">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
           </button>
           <button className={styles.profileAvatar} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} id="avatar-btn">{userInitial}</button>
           {isProfileMenuOpen && (
             <ProfileMenu user={user} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} onClose={() => setIsProfileMenuOpen(false)} />
           )}
        </div>
      </header>

      <div className={styles.body}>
        {isSidebarOpen && <div className={styles.mobileOverlay} onClick={() => setIsSidebarOpen(false)} />}
        <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <Sidebar
            isOpen={isSidebarOpen}
            lists={lists}
            selectedListIds={selectedListIds}
            onToggleList={toggleListSelection}
            onListsChange={setLists}
            openCreateModal={() => setIsCreateModalOpen(true)}
            taskCounts={taskCounts} // 🔥 Pass global counts to Sidebar
            isListsLoading={isListsLoading}
          />
        </div>

        <main className={`${styles.mainContent} ${isSidebarOpen ? styles.blurredOnMobile : ""}`}>
          <Outlet
            context={{
              lists,
              selectedListIds,
              activeListId,
              setActiveListId,
              taskCounts, // 🔥 Pass down
              onCountUpdate: handleCountUpdate, // 🔥 Pass down handler
              onRenameList: handleRenameList,
              onDeleteList: handleDeleteList,
              onReorderLists: handleReorderLists,
              onSortList: handleSortList,
              openCreateModal: () => setIsCreateModalOpen(true)
            }}
          />
        </main>
      </div>

      <CreateListModal 
        isOpen={isCreateModalOpen} 
        onCancel={() => setIsCreateModalOpen(false)} 
        onCreate={handleCreateList} 
      />
      <SearchSpotlight 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
      <ShortcutCheatSheet 
        isOpen={isCheatSheetOpen} 
        onClose={() => setIsCheatSheetOpen(false)} 
      />
    </div>
  );
}