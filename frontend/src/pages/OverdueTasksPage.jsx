import React from "react";
import ListTasksCard from "../components/ListTasksCard";
// import styles from "./ListTasksPage.module.css";
import styles from "./SmartTaskPage.module.css"; // 🔥 Shared CSS



const OverdueTasksPage = () => {
  return (
    <div className={styles.pageContainer}>
      <ListTasksCard 
        isOverdueMode={true} 
        isSingleView={true} 
      />
    </div>
  );
};

export default OverdueTasksPage;