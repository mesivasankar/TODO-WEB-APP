import { Link } from "react-router-dom";
import styles from "./LoginPage.module.css";
import env from "../config/env";
import LogoLight from "../assets/Logo-light.png";
import LogoDark from "../assets/Logo-dark.png";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";

export default function LoginPage() {

  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useTheme();

  const currentLogo = theme === 'light' ? LogoDark : LogoLight;

  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    if (!email) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

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
            src={currentLogo}
            alt="Brand Logo"
            className={styles.logo}
          />
          <h1 className={styles.brandName}>ACTDONE</h1>
          <p className={styles.tagline}>
            Plan, Act, Get It Done...
          </p>
        </div>

        <div className={styles.copyright}>
          © {new Date().getFullYear()} Actdone
        </div>
      </section>

      <div className={styles.verticalDivider}></div>

      <section className={styles.right}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* <h2 className={styles.formTitle}>Log in</h2> */}
          {error && <div className={styles.error}>{error}</div>}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className={`${styles.input} ${error ? styles.inputError : ""}`}
          />

          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className={`${styles.input} ${error ? styles.inputError : ""}`}
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
              `${env.apiBaseUrl}/api/auth/google`)
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
