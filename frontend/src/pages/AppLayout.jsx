import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/SideBar";
import styles from "./AppLayout.module.css";
import logo from "../assets/Logo-light.png";
import useAuth from "../hooks/useAuth";
import {
  getLists,
  renameListApi,
  deleteListApi,
  reorderLists, // Import reorder API
} from "../api/listsApi";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lists, setLists] = useState([]);
  
  // 1. Initialize state from LocalStorage immediately to prevent flash
  const [selectedListIds, setSelectedListIds] = useState(() => {
    const saved = localStorage.getItem("selectedListIds");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const { user } = useAuth();

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : "?";

  useEffect(() => {
    async function init() {
      try {
        const data = await getLists();
        setLists(data);

        // 2. Validate stored IDs against the fresh data from API
        const validIds = new Set(data.map((l) => l.id));
        
        // Filter current selection to only include IDs that actually exist
        const validatedSelection = new Set(
          [...selectedListIds].filter((id) => validIds.has(id))
        );

        // 3. Fallback Logic: If selection is empty, select the Default List
        if (validatedSelection.size === 0) {
          const defaultList = data.find((l) => l.is_default === true);
          if (defaultList) {
            validatedSelection.add(defaultList.id);
          }
        }

        // Update state with the validated/fallback selection
        setSelectedListIds(validatedSelection);
        
      } catch (error) {
        console.error("Failed to load lists", error);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // 4. Persist to LocalStorage whenever selection changes
  useEffect(() => {
    localStorage.setItem(
      "selectedListIds",
      JSON.stringify([...selectedListIds])
    );
  }, [selectedListIds]);

  function toggleListSelection(listId) {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }

  async function handleRenameList(listId, newName) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, name: newName } : list
      )
    );
    try {
      await renameListApi(listId, newName);
    } catch (err) {
      console.error("Rename failed", err);
    }
  }

  async function handleDeleteList(listId) {
    const listToDelete = lists.find((l) => l.id === listId);
    if (!listToDelete || listToDelete.is_default === true) return;

    // 1. Snapshot previous state for rollback
    const previousLists = lists;
    const previousSelection = new Set(selectedListIds);

    // 2. Optimistic Update: Remove list immediately from UI
    setLists((prev) => prev.filter((l) => l.id !== listId));
    
    // Update selection immediately (fallback logic included)
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
        // If we deleted the last selected list, fallback to default immediately
        if (next.size === 0) {
           const defaultList = previousLists.find((l) => l.is_default === true);
           if (defaultList) next.add(defaultList.id);
        }
      }
      return next;
    });

    try {
      // 3. API Call in background
      await deleteListApi(listId);
    } catch (err) {
      console.error("Delete failed", err);
      // 4. Rollback on failure
      setLists(previousLists);
      setSelectedListIds(previousSelection);
    }
  }

  // 🔥 NEW: Handle Reorder globally
  async function handleReorderLists(newLists) {
    setLists(newLists); // Optimistic Update
    try {
        const orderedIds = newLists.map(l => l.id);
        await reorderLists(orderedIds);
    } catch(err) {
        console.error("Reorder failed", err);
    }
  }

  return (
    <div className={styles.appContainer}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <button
            className={`${styles.menuButton} ${!isSidebarOpen ? styles.menuButtonActive : ''}`}
            onClick={() => setIsSidebarOpen((p) => !p)}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            ☰
          </button>

          <img src={logo} alt="App Logo" className={styles.logoImage} />
          <span className={styles.appName}>Actdone</span>
        </div>

        <div className={styles.navRight}>
          <div className={styles.profileAvatar}>{userInitial}</div>
        </div>
      </header>

      <div className={styles.body}>
        <div className={`${styles.sidebarWrapper} ${!isSidebarOpen ? styles.sidebarClosed : ''}`}>
          <Sidebar
            isOpen={isSidebarOpen}
            lists={lists}
            selectedListIds={selectedListIds}
            onToggleList={toggleListSelection}
            onListsChange={setLists}
          />
        </div>

        <main className={styles.mainContent}>
          <Outlet
            context={{
              lists,
              selectedListIds,
              onRenameList: handleRenameList,
              onDeleteList: handleDeleteList,
              onReorderLists: handleReorderLists, // Pass down reorder handler
            }}
          />
        </main>
      </div>
    </div>
  );
}