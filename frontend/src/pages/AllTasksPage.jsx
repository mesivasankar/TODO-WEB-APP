import { useState, useEffect, useRef } from "react";
import React from 'react';
import { useOutletContext } from "react-router-dom";
import Lottie from "lottie-react";
import ListHidden from "../assets/animations/Lists are Hidden.json";
import ListTasksCard from "../components/ListTasksCard";
import styles from "./AllTasksPage.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { updateTask, reorderTasks } from "../api/tasksApi";
import { useToast } from "../contexts/ToastContext";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDndContext,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

function SortableCard({ list, items, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      listId: list.id,
      list: list
    }
  });
  const { active, over } = useDndContext();
  const isOver = over?.id === list.id;
  const isActiveList = active?.data.current?.type === 'list' || !active?.data.current?.type;

  let linePosition = '';
  if (isOver && active && isActiveList && items) {
    const activeIndex = items.findIndex(i => i.id === active.id);
    const overIndex = items.findIndex(i => i.id === list.id);
    linePosition = activeIndex < overIndex ? 'right' : 'left';
  }

  return (
    <div ref={setNodeRef} className={styles.cardContainer} style={{ opacity: isDragging ? 0.25 : 1 }}>
      {isOver && !isDragging && isActiveList && (
        <div className={`${styles.insertionLine} ${linePosition === 'right' ? styles.lineRight : styles.lineLeft}`} />
      )}
      <motion.div
        layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {React.cloneElement(children, { dragHandleProps: { ...attributes, ...listeners } })}
      </motion.div>
    </div>
  );
}

function SortablePill({ list, activeListId, taskCounts, scrollToCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none"
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.chip} ${activeListId === list.id ? styles.activeChip : ""} ${isDragging ? styles.draggingChip : ""}`}
      onClick={() => {
        if (!isDragging) {
          scrollToCard(list.id);
        }
      }}
    >
      <span className={styles.chipName}>{list.name}</span>
      <span className={styles.chipCount}>{taskCounts[list.id] || 0}</span>
    </button>
  );
}

export default function AllTasksPage() {
  const {
    lists,
    selectedListIds,
    activeListId,
    setActiveListId,
    taskCounts,
    onCountUpdate,
    onRenameList,
    onDeleteList,
    onReorderLists,
    onSortList,
    openCreateModal
  } = useOutletContext();

  const { showUndoToast } = useToast();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const scrollContainerRef = useRef(null);
  const chipNavRef = useRef(null);
  const isManualScrolling = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const isInternalActiveIdChange = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayedLists = isMobile ? lists : lists.filter((list) => selectedListIds.has(list.id));
  const count = displayedLists.length;
  const [activeList, setActiveList] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pillSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  // Sync scroll position when activeListId changes (from Pills)
  useEffect(() => {
    if (activeListId && displayedLists.length > 0) {
      if (isInternalActiveIdChange.current) {
        isInternalActiveIdChange.current = false;
        return;
      }

      const attemptScroll = () => {
        const cardElement = scrollContainerRef.current?.querySelector(`[data-list-id="${activeListId}"]`);
        if (cardElement) {
          scrollToCard(activeListId);
        } else {
          setTimeout(() => scrollToCard(activeListId), 50);
        }
      };
      attemptScroll();
    }
  }, [activeListId]); // Trigger when pill is clicked

  // Sync Pills position when activeListId changes
  useEffect(() => {
    if (!isMobile || !activeListId || !chipNavRef.current) return;

    const index = displayedLists.findIndex(l => l.id === activeListId);
    const chipElement = chipNavRef.current.children[index];

    if (chipElement) {
      chipElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeListId, isMobile, displayedLists.length]);

  // 🔥 Sync Card Swipe -> Pill Highlight
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      if (cardWidth === 0) return;

      // Calculate index based on scroll center
      const index = Math.round(scrollLeft / cardWidth);
      const currentList = displayedLists[index];

      if (currentList && activeListId !== currentList.id) {
        // Sync state to trigger pill highlight immediately during scroll snap
        isInternalActiveIdChange.current = true;
        setActiveListId(currentList.id);
      }
    };

    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, displayedLists, activeListId]);

  const scrollToCard = (listId) => {
    const cardElement = scrollContainerRef.current?.querySelector(`[data-list-id="${listId}"]`);
    if (cardElement && scrollContainerRef.current) {
      isManualScrolling.current = true;

      if (activeListId !== listId) {
        isInternalActiveIdChange.current = true;
        setActiveListId(listId);
      }

      cardElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });

      // Release lock after animation finishes
      setTimeout(() => { isManualScrolling.current = false; }, 600);
    }
  };

  const [activeDragTask, setActiveDragTask] = useState(null);

  function handleDragStart(event) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === 'list' || !type) {
      const activeId = active.id;
      const list = displayedLists.find(l => l.id === activeId);
      setActiveList(list);
      setActiveDragTask(null);
    } else if (type === 'task') {
      const task = active.data.current?.task;
      setActiveDragTask(task);
      setActiveList(null);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) {
      setActiveList(null);
      setActiveDragTask(null);
      return;
    }

    const activeType = active.data.current?.type || 'list';

    if (activeType === 'list') {
      if (active.id !== over.id) {
        const oldIndex = displayedLists.findIndex((l) => l.id === active.id);
        const newIndex = displayedLists.findIndex((l) => l.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(displayedLists, oldIndex, newIndex);

          if (isMobile) {
            onReorderLists(newOrder);
          } else {
            let selectedCursor = 0;
            const newGlobalLists = lists.map((list) => {
              if (selectedListIds.has(list.id)) {
                const replacement = newOrder[selectedCursor];
                selectedCursor++;
                return replacement;
              }
              return list;
            });
            onReorderLists(newGlobalLists);
          }
        }
      }
    } else if (activeType === 'task') {
      const draggedTask = active.data.current?.task;
      if (draggedTask) {
        const sourceListId = active.data.current?.listId;
        const overType = over.data.current?.type;

        let targetListId = null;
        if (overType === 'list') {
          targetListId = over.data.current?.listId;
        } else if (overType === 'task') {
          targetListId = over.data.current?.listId;
        }

        if (targetListId) {
          // 1. RESTRICTION: Subtask should not be movable between lists!
          const isSubtask = draggedTask.parent_task_id || draggedTask.parentTaskId;
          if (!(isSubtask && sourceListId !== targetListId)) {
            if (sourceListId === targetListId) {
              if (active.id !== over.id) {
                const siblingItems = active.data.current?.items || [];
                const oldIndex = siblingItems.findIndex(t => t.id === active.id);
                const newIndex = siblingItems.findIndex(t => t.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                  const reorderedTasks = arrayMove(siblingItems, oldIndex, newIndex);

                  window.dispatchEvent(new CustomEvent('tasks-reordered', {
                    detail: { listId: sourceListId, reorderedTasks }
                  }));

                  // Set global sync lock
                  window.isDraggingOrSyncing = true;

                  // Perform database persistent update in the background
                  reorderTasks(sourceListId, reorderedTasks.map(t => t.id))
                    .catch(err => {
                      console.error("Failed to persist task order in same list", err);
                    })
                    .finally(() => {
                      window.isDraggingOrSyncing = false;
                      window.dispatchEvent(new Event('app-data-changed'));
                    });
                }
              }
            } else {
              const sourceList = lists.find(l => l.id === sourceListId);
              const targetList = lists.find(l => l.id === targetListId);
              if (targetList && sourceList && (!targetList.task_sort_option || targetList.task_sort_option === 'MY_ORDER')) {
                // Retrieve flat task array from drag context payload
                const allSourceTasks = active.data.current?.allTasks || [];
                const draggedTaskObj = allSourceTasks.find(t => t.id === draggedTask.id) || draggedTask;
                const draggedSubtasks = allSourceTasks.filter(t => {
                  const pid = t.parent_task_id || t.parentTaskId;
                  return String(pid) === String(draggedTask.id);
                });

                // Compute target index and complete target sort-order array
                const targetItems = over.data.current?.items || [];
                const targetTaskIds = targetItems.map(t => t.id).filter(id => id !== draggedTask.id);

                let targetIndex = null;
                if (overType === 'task') {
                  const idx = targetItems.findIndex(t => t.id === over.id || t.clientKey === over.id);
                  if (idx !== -1) {
                    targetIndex = idx;
                  }
                }

                // 1. Instantly dispatch optimistic move event to source and target lists
                window.dispatchEvent(new CustomEvent('task-moved-between-lists', {
                  detail: {
                    task: draggedTaskObj,
                    subtasks: draggedSubtasks,
                    sourceListId,
                    targetListId,
                    targetIndex
                  }
                }));

                // 2. Instantly show Undo Toast
                showUndoToast(`Task moved to "${targetList.name}"`, async () => {
                  // Instantly dispatch reverse optimistic event
                  window.dispatchEvent(new CustomEvent('task-moved-between-lists', {
                    detail: {
                      task: draggedTaskObj,
                      subtasks: draggedSubtasks,
                      sourceListId: targetListId,
                      targetListId: sourceListId
                    }
                  }));

                  // Set global sync lock
                  window.isDraggingOrSyncing = true;

                  try {
                    await updateTask(draggedTask.id, {
                      listId: sourceList.id,
                      category: sourceList.category
                    });
                  } catch (err) {
                    console.error("Failed to undo task movement between lists", err);
                  } finally {
                    window.isDraggingOrSyncing = false;
                    window.dispatchEvent(new Event('app-data-changed'));
                  }
                });

                // Set global sync lock
                window.isDraggingOrSyncing = true;

                // 3. Make the API request in the background
                updateTask(draggedTask.id, {
                  listId: targetList.id,
                  category: targetList.category
                })
                  .then(async () => {
                    // Always chain reorder tasks inside the target list to persist exact drop position
                    const finalTargetIdx = (targetIndex !== null && targetIndex !== undefined) ? targetIndex : targetTaskIds.length;
                    targetTaskIds.splice(finalTargetIdx, 0, draggedTask.id);
                    await reorderTasks(targetList.id, targetTaskIds);
                  })
                  .catch(err => {
                    console.error("Failed to move task between lists", err);
                    // Rollback local state optimistically if backend request failed
                    window.dispatchEvent(new CustomEvent('task-moved-between-lists', {
                      detail: {
                        task: draggedTaskObj,
                        subtasks: draggedSubtasks,
                        sourceListId: targetListId,
                        targetListId: sourceListId
                      }
                    }));
                  })
                  .finally(() => {
                    window.isDraggingOrSyncing = false;
                    window.dispatchEvent(new Event('app-data-changed'));
                  });
              }
            }
          }
        }
      }
    }

    // Synced at the very end of the drop call, batched together for instantaneous display!
    setActiveList(null);
    setActiveDragTask(null);
  }

  function handlePillDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedLists.findIndex((l) => l.id === active.id);
    const newIndex = displayedLists.findIndex((l) => l.id === over.id);
    const newOrder = arrayMove(displayedLists, oldIndex, newIndex);
    onReorderLists(newOrder);
    scrollToCard(active.id);
  }

  if (count === 0 && !isMobile) {
    return (
      <div className={styles.emptyState}>
        <Lottie animationData={ListHidden} loop className={styles.animation} />
        <p className={styles.text}>Select one or more lists from the sidebar to see your tasks.</p>
      </div>
    );
  }

  const getLayoutClass = () => {
    if (isMobile) return styles.mobileLayout;
    if (count === 1) return styles.singleView;
    if (count === 2) return styles.doubleView;
    if (count === 3) return styles.tripleView;
    if (count === 4) return styles.quadView;
    return styles.scrollView;
  };

  return (
    <div className={styles.pageWrapper}>
      {isMobile && (
        <div className={styles.chipNavWrapper}>
          <DndContext sensors={pillSensors} collisionDetection={closestCenter} onDragEnd={handlePillDragEnd}>
            <SortableContext items={displayedLists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              <div className={styles.chipNav} ref={chipNavRef}>
                {displayedLists.map((list) => (
                  <SortablePill
                    key={list.id}
                    list={list}
                    activeListId={activeListId}
                    taskCounts={taskCounts}
                    scrollToCard={scrollToCard}
                  />
                ))}
                <button
                  className={`${styles.chip} ${styles.createListPill}`}
                  onClick={openCreateModal}
                >
                  <span className={styles.plusIcon}>＋</span>
                  <span className={styles.chipName}>New List</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`${styles.cardsWrapper} ${getLayoutClass()}`}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedLists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {displayedLists.map((list) => (
                <div key={list.id} data-list-id={list.id} className={styles.anchorWrapper}>
                  <SortableCard
                    list={list}
                    items={displayedLists}
                  >
                    <ListTasksCard
                      key={`tasks-card-${list.clientKey || list.id}`}
                      list={list}
                      onRenameList={onRenameList}
                      onDeleteList={onDeleteList}
                      isSingleView={count === 1 && !isMobile}
                      onCountUpdate={onCountUpdate}
                      onSortList={onSortList}
                      disableInternalDnd={true}
                    />
                  </SortableCard>
                </div>
              ))}
            </AnimatePresence>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeList ? (
              <div className={styles.dragOverlayCard}>
                <span className={styles.overlayTitle}>{activeList.name}</span>
              </div>
            ) : activeDragTask ? (
              <div className={styles.dragOverlayTask}>
                <div className={styles.checkbox} />
                <span className={styles.taskTitle}>{activeDragTask.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}