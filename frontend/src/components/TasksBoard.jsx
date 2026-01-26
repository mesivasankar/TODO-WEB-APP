import { useOutletContext } from "react-router-dom";
import ListTasksCard from "./ListTasksCard";
import styles from "./TasksBoard.module.css";

export default function TasksBoard() {
  const {
    lists,
    selectedListIds,
    onRenameList,
    onDeleteList,
  } = useOutletContext();

  return (
    <div className={styles.board}>
      <div className={styles.scroller}>
        {lists
          .filter((list) => selectedListIds.has(list.id))
          .map((list) => (
            <ListTasksCard
              key={list.id}
              list={list}
              onRenameList={onRenameList}
              onDeleteList={onDeleteList}
            />
          ))}
      </div>
    </div>
  );
}
