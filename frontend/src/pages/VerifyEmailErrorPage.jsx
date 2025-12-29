import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import styles from "./VerifyEmailPage.module.css";
import { resendVerificationEmail } from "../api/authApi";

export default function VerifyEmailErrorPage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getErrorMessage(reason) {
    switch (reason) {
      case "used":
        return "This verification link has already been used.";
      case "expired":
        return "This verification link has expired.";
      case "invalid":
        return "This verification link is invalid.";
      case "already-verified":
        return "Your email is already verified. You can log in.";
      default:
        return "Email verification failed.";
    }
  }

  async function handleResend() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await resendVerificationEmail(token);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to resend verification email");
      }
      setMessage("Verification email has been resent. Please check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email verification failed</h1>

        <p className={styles.message}>{getErrorMessage(reason)}</p>

        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {reason === "expired" && (
          <button
            onClick={handleResend}
            disabled={loading}
            className={styles.resendButton}
          >
            {loading ? "Resending..." : "Resend verification email"}
          </button>
        )}

        <Link to="/login" className={styles.loginLink}>
          Back to login
        </Link>
      </div>
    </div>
  );
}
