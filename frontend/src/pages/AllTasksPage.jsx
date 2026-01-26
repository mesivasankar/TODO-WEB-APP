import { useOutletContext } from "react-router-dom";
import Lottie from "lottie-react";
import ListHidden from "../assets/animations/Lists are Hidden.json";
import ListTasksCard from "../components/ListTasksCard";
import styles from "./AllTasksPage.module.css";
import { AnimatePresence, motion } from "framer-motion"; // 🔥 Import Framer Motion

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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Item Wrapper
function SortableCard({ list, children }) {
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
    opacity: isDragging ? 0.3 : 1, // Dim card while dragging
    zIndex: isDragging ? 1000 : "auto",
    touchAction: "none", // Critical for pointer events on touch devices
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={styles.cardContainer}
      {...attributes} 
      {...listeners}
    >
      {/* 🔥 Animation Wrapper */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }} // Ensure it fills container
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function AllTasksPage() {
  const { 
    lists, 
    selectedListIds, 
    onRenameList, 
    onDeleteList, 
    onReorderLists 
  } = useOutletContext();

  const selectedLists = lists.filter((list) => selectedListIds.has(list.id));
  const count = selectedLists.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = selectedLists.findIndex((l) => l.id === active.id);
    const newIndex = selectedLists.findIndex((l) => l.id === over.id);
    const newSelectedLists = arrayMove(selectedLists, oldIndex, newIndex);

    let selectedCursor = 0;
    const newGlobalLists = lists.map((list) => {
      if (selectedListIds.has(list.id)) {
        const replacement = newSelectedLists[selectedCursor];
        selectedCursor++;
        return replacement;
      }
      return list;
    });

    onReorderLists(newGlobalLists);
  }

  if (count === 0) {
    return (
      <div className={styles.emptyState}>
        <Lottie animationData={ListHidden} loop className={styles.animation} />
        <p className={styles.text}>Select one or more lists from the sidebar to see your tasks.</p>
      </div>
    );
  }

  /* 2. LAYOUT LOGIC */
  let layoutClass = "";
  if (count === 1) layoutClass = styles.singleView;
  else if (count <= 4) layoutClass = styles.splitView;
  else layoutClass = styles.scrollView;

  return (
    <div className={`${styles.cardsWrapper} ${layoutClass}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selectedLists.map(l => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {selectedLists.map((list) => (
              <SortableCard key={list.id} list={list}>
                <ListTasksCard
                  list={list}
                  onRenameList={onRenameList}
                  onDeleteList={onDeleteList}
                  isSingleView={count === 1}
                />
              </SortableCard>
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>
    </div>
  );
}