import { useOutletContext } from "react-router-dom";
import ListTasksCard from "../components/ListTasksCard";
import styles from "./SmartTaskPage.module.css"; // 🔥 Shared CSS

export default function StarredTasksPage() {
  const { lists, onRenameList, onDeleteList } = useOutletContext();

  // Find the default list to assign new starred tasks to
  const defaultList = lists.find(l => l.is_default) || lists[0];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.cardsWrapper}>
        <ListTasksCard
          list={null}
          onRenameList={onRenameList}
          onDeleteList={onDeleteList}
          isStarredMode={true}
          defaultListId={defaultList?.id}
        />
      </div>
    </div>
  );
}