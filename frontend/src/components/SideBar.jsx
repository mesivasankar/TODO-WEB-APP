import { NavLink } from "react-router-dom";
import styles from "./SideBar.module.css";
import { createList, reorderLists } from "../api/listsApi";
import CreateListModal from "./CreateListModal";
import { useState } from "react";

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sub-component for individual draggable list items
function SortableListItem({ list, selectedListIds, onToggleList }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : "auto", // Ensure dragging item is on top
    opacity: isDragging ? 0.5 : 1, // Visual feedback while dragging
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <label className={styles.listItem}>
        <input
          type="checkbox"
          checked={selectedListIds.has(list.id)}
          onChange={() => onToggleList(list.id)}
          // Stop propagation so clicking checkbox doesn't trigger drag
          onPointerDown={(e) => e.stopPropagation()} 
        />
        <span>{list.name}</span>
      </label>
    </div>
  );
}

export default function SideBar({
  isOpen,
  lists,
  selectedListIds,
  onToggleList,
  onListsChange,
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Setup sensors (input methods)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px movement before drag starts (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleCreateList(name) {
    const tempId = Date.now(); // Generate temporary ID
    const optimisticList = { id: tempId, name: name, is_default: false };

    // 1. Close Modal Immediately (UI feels instant)
    setIsCreateModalOpen(false);

    // 2. Optimistic Update: Show list immediately
    onListsChange((prev) => [...prev, optimisticList]);

    try {
      // 3. API Call in background
      const createdList = await createList(name);
      
      // 4. Swap Temp ID with Real ID from DB
      onListsChange((prev) => prev.map(list => list.id === tempId ? createdList : list));
    } catch (error) {
      console.error("Failed to create list", error);
      // 5. Revert on failure
      onListsChange((prev) => prev.filter(list => list.id !== tempId));
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      onListsChange((prevLists) => {
        const oldIndex = prevLists.findIndex((l) => l.id === active.id);
        const newIndex = prevLists.findIndex((l) => l.id === over.id);
        
        const newOrder = arrayMove(prevLists, oldIndex, newIndex);
        
        // Trigger API update in background
        // Map all IDs in new order to send to backend
        const orderedIds = newOrder.map(l => l.id);
        reorderLists(orderedIds).catch(err => console.error("Reorder failed", err));

        return newOrder;
      });
    }
  }

  return (
    <>
      <aside
        className={`${styles.sidebar} ${
          !isOpen ? styles.sidebarHidden : ""
        }`}
      >
        <nav className={styles.navSection}>
          <NavLink
            to="/app/all"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.icon}>✔</span>
            <span className={styles.label}>All tasks</span>
          </NavLink>

          <NavLink
            to="/app/starred"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.icon}>★</span>
            <span className={styles.label}>Starred</span>
          </NavLink>
        </nav>

        <div className={styles.divider} />

        <div className={styles.listSection}>
          {lists.length > 0 && (
            <div className={styles.listFadeIn}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={lists.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lists.map((list) => (
                    <SortableListItem
                      key={list.id}
                      list={list}
                      selectedListIds={selectedListIds}
                      onToggleList={onToggleList}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          <div
            className={styles.createItem}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span className={styles.icon}>＋</span>
            <span className={styles.label}>Create new list</span>
          </div>
        </div>
      </aside>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateList}
      />
    </>
  );
}