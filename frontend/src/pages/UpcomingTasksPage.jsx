import React, { useEffect, useState } from "react";
import ListTasksCard from "../components/ListTasksCard";
import { getLists } from "../api/listsApi";
import styles from "./SmartTaskPage.module.css"; // 🔥 Shared CSS

export default function UpcomingTasksPage() {
  const [defaultListId, setDefaultListId] = useState(null);

  useEffect(() => {
    async function fetchDefaultList() {
      try {
        const lists = await getLists();
        const def = lists.find(l => l.is_default);
        if (def) setDefaultListId(def.id);
      } catch (err) {
        console.error("Failed to fetch default list", err);
      }
    }
    fetchDefaultList();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.cardsWrapper}>
        <ListTasksCard 
            isUpcomingMode={true} 
            defaultListId={defaultListId} 
        />
      </div>
    </div>
  );
}