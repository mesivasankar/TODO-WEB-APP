import Lottie from "lottie-react";
import loadingAnimation from "../assets/animations/Task Loader.json";
import styles from "./LoadingScreen.module.css";

export default function LoadingScreen({ text = "Preparing your workspace..." }) {
  return (
    <div className={styles.container}>
      <Lottie
        animationData={loadingAnimation}
        loop
        className={styles.animation}
      />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
