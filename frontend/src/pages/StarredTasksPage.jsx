import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import ListTasksCard from "../components/ListTasksCard";
import styles from "./SmartTaskPage.module.css"; // Shared CSS

export default function StarredTasksPage() {
  const { lists, onRenameList, onDeleteList } = useOutletContext();

  // Find the default list to assign new starred tasks to
  const defaultList = lists.find(l => l.is_default) || lists[0];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.cardsWrapper}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <ListTasksCard
            list={null}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            isStarredMode={true}
            defaultListId={defaultList?.id}
          />
        </motion.div>
      </div>
    </div>
  );
}