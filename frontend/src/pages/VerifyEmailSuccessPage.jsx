import { useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./VerifyEmailPage.module.css";

export default function VerifyEmailSuccessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email verified</h1>

        <p className={styles.message}>
          Your email address has been verified successfully.
          You can now log in to your account.
        </p>

        <Link to="/login" className={styles.loginButton}>
          Go to login
        </Link>
      </div>
    </div>
  );
}
