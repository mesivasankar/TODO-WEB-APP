import { NavLink } from "react-router-dom";
import styles from "./SideBar.module.css";
import { reorderLists } from "../api/listsApi";
import { getSpecialTaskCounts } from "../api/tasksApi";
import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SunIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>);
const CalendarIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const GridIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>);
const AlertIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>);

// 🔥 Updated: Added count display
function SortableListItem({ list, selectedListIds, onToggleList, count }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1000 : "auto", opacity: isDragging ? 0.5 : 1, position: "relative" };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <label className={styles.listItem}>
        <div className={styles.listItemContent}>
          <input type="checkbox" checked={selectedListIds.has(list.id)} onChange={() => onToggleList(list.id)} onPointerDown={(e) => e.stopPropagation()} />
          <span className={styles.listName}>{list.name}</span>
        </div>
        {/* 🔥 NEW: Count badge aligned right */}
        {count > 0 && <span className={styles.listCount}>{count}</span>}
      </label>
    </div>
  );
}

export default function SideBar({ lists, selectedListIds, onToggleList, onListsChange, openCreateModal, taskCounts = {} }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [specialCounts, setSpecialCounts] = useState({ overdue: 0, today: 0, upcoming: 0, starred: 0 });

  const fetchSpecialCounts = async () => {
    try {
      const counts = await getSpecialTaskCounts();
      setSpecialCounts(counts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handleResize);
    window.addEventListener("app-data-changed", fetchSpecialCounts);
    fetchSpecialCounts();
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("app-data-changed", fetchSpecialCounts);
    };
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      onListsChange((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id);
        const newIndex = prev.findIndex((l) => l.id === over.id);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        reorderLists(newOrder.map(l => l.id)).catch(console.error);
        return newOrder;
      });
    }
  }

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navSection}>
        <NavLink to="/app/all" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon}>✔</span> <span className={styles.label}>All tasks</span>
        </NavLink>
        <NavLink to="/app/overdue" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon} style={{color: specialCounts.overdue > 0 ? 'var(--err-msg)' : 'inherit'}}><AlertIcon /></span> 
          <span className={styles.label}>Overdue</span>
          {specialCounts.overdue > 0 && <span className={styles.badge}>{specialCounts.overdue}</span>}
        </NavLink>
        <NavLink to="/app/today" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon}><SunIcon /></span> <span className={styles.label}>Today</span>
          {specialCounts.today > 0 && <span className={styles.genericBadge}>{specialCounts.today}</span>}
        </NavLink>
        <NavLink to="/app/upcoming" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon}><CalendarIcon /></span> <span className={styles.label}>Upcoming</span>
          {specialCounts.upcoming > 0 && <span className={styles.genericBadge}>{specialCounts.upcoming}</span>}
        </NavLink>
        <NavLink to="/app/starred" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon}>★</span> <span className={styles.label}>Starred</span>
          {specialCounts.starred > 0 && <span className={styles.genericBadge}>{specialCounts.starred}</span>}
        </NavLink>
        <NavLink to="/app/matrix" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
          <span className={styles.icon}><GridIcon /></span> <span className={styles.label}>Priority Matrix</span>
        </NavLink>
      </nav>

      {!isMobile && (
        <>
          <div className={styles.divider} />
          <div className={styles.listSection}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
                {lists.map(list => (
                  <SortableListItem 
                    key={list.id} 
                    list={list} 
                    selectedListIds={selectedListIds} 
                    onToggleList={onToggleList} 
                    count={taskCounts[list.id] || 0} // 🔥 Pass global count
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className={styles.createItem} onClick={openCreateModal}>
              <span className={styles.icon}>＋</span> <span className={styles.label}>Create new list</span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}