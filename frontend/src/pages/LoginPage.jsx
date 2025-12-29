import { Link } from "react-router-dom";
import styles from "./LoginPage.module.css";
import Logo from "../assets/Logo-light.png";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useState } from "react";

export default function LoginPage() {

  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {

      // const message =
      //   err.response?.data?.message ||
      //   err.response?.data?.error ||
      //   (typeof err.response?.data === "string" && err.response.data) ||
      //   err.message ||
      //   "Login failed";

      const message = err.message || "Login failed";


      setError(message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className={styles.page}>
      <section className={styles.left}>
        <div className={styles.brandGroup}>
          <img
            src={Logo}
            alt="Brand Logo"
            className={styles.logo}
          />
          <h1 className={styles.brandName}>ACTDONE</h1>
          <p className={styles.tagline}>
            PLAN, ACT, GET IT DONE...
          </p>
        </div>

        <div className={styles.copyright}>
          © {new Date().getFullYear()} Actdone
        </div>
      </section>

      <div className={styles.verticalDivider}></div>

      <section className={styles.right}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* <h2 className={styles.formTitle}>Log in</h2> */}
          {error && <div className={styles.error}>{error}</div>}

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />

          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />


            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className={`${styles.passwordToggle} ${password ? styles.visible : ""
                }`}
            >
              {showPassword ? "Hide" : "Show"}
            </button>

          </div>

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>

          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            className={styles.googleButton}
             disabled={loading}
            onClick={() =>
            (window.location.href =
              `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`)
            }
          >
            Continue with Google
          </button>

          <p className={styles.helperText}>
            New to Actdone?{" "}
            <Link to="/register" className={styles.link}>
              Create new account
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
