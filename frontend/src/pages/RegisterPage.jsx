import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import Logo from "../assets/Logo-light.png";
import useAuth from "../hooks/useAuth";
import { useState } from "react";


function validateEmailLocal(email) {
  if (!email) return "Email is required.";
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Please enter a valid email address.";
  }
  return "";
}

function validatePasswordLocal(password) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    return "Password must include at least one uppercase letter, one lowercase letter, one number, and one symbol.";
  }

  return "";
}


function validateNameLocal(name) {
  if (!name) return "Full name is required.";
  if (name.length < 2) {
    return "Name is too short.";
  }
  return "";
}


export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    name: "",
    general: "",
  });
  const [success, setSuccess] = useState(false);



  async function handleSubmit(e) {
    e.preventDefault();
    // setError("");

    const nameError = validateNameLocal(name);
    const emailError = validateEmailLocal(email);
    const passwordError = validatePasswordLocal(password);

    if (nameError || emailError || passwordError) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        general: "",
      });
      return;
    }

    setLoading(true);
    setErrors({ name: "", email: "", password: "", general: "" });

    try {
      await register({ name, email, password });
      setSuccess(true);

    } catch (err) {
      // const message =
      //   err.response?.data?.message ||
      //   err.response?.data?.error ||
      //   (typeof err.response?.data === "string" && err.response.data) ||
      //   err.message ||
      //   "Registration failed";


      const message =
        err.message ||
        "Registration failed";



      setErrors(prev => ({ ...prev, general: message }));





      if (message.toLowerCase().includes("email")) {
        setErrors(prev => ({ ...prev, email: message }));
      }
      else if (message.toLowerCase().includes("password")) {
        setErrors(prev => ({ ...prev, password: message }));
      }
      else if (message.toLowerCase().includes("name")) {
        setErrors(prev => ({ ...prev, name: message }));
      }
      else {
        setErrors(prev => ({ ...prev, general: message }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.left}>
        <div className={styles.brandGroup}>
          <img src={Logo} alt="Brand Logo" className={styles.logo} />
          <h1 className={styles.brandName}>ACTDONE</h1>
          <p className={styles.tagline}>PLAN, ACT, GET IT DONE...</p>
        </div>

        <div className={styles.copyright}>
          © {new Date().getFullYear()} Actdone
        </div>
      </section>

      <div className={styles.verticalDivider}></div>

      <section className={styles.right}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* {error && <div className={styles.error}>{error}</div>} */}

          {/* <input
            type="text"
            placeholder="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
          /> */}


          {errors.general && (
            <div className={styles.error}>{errors.general}</div>
          )}



          <input
            type="text"
            placeholder="Full name"
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors(prev => ({ ...prev, name: "" }));
            }}
            onBlur={() => {
              const message = validateNameLocal(name);
              if (message) {
                setErrors(prev => ({ ...prev, name: message }));
              }
            }}
          />


          {errors.name && (
            <p className={styles.fieldError}>{errors.name}</p>
          )}


          {/* <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          /> */}


          <input
            type="email"
            placeholder="Email"
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors(prev => ({ ...prev, email: "" }));
            }}
            onBlur={() => {
              const message = validateEmailLocal(email);
              if (message) {
                setErrors(prev => ({ ...prev, email: message }));
              }
            }}
          />


          {errors.email && (
            <p className={styles.fieldError}>{errors.email}</p>
          )}

          {/* <div className={styles.passwordWrapper}>
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
              onClick={() => setShowPassword((prev) => !prev)}
              className={`${styles.passwordToggle} ${password ? styles.visible : ""
                }`}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div> */}


          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: "" }));
              }}
              onBlur={() => {
                const message = validatePasswordLocal(password);
                if (message) {
                  setErrors(prev => ({ ...prev, password: message }));
                }
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className={`${styles.passwordToggle} ${password ? styles.visible : ""}`}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>


          {errors.password && (
            <p className={styles.fieldError}>{errors.password}</p>
          )}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading || success}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {success && (
            <div className={styles.success}>
              Verification email sent. Please check your inbox and verify your account.
            </div>
          )}


          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            className={styles.googleButton}
            onClick={() =>
              (window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`)
            }
          >
            Continue with Google
          </button>

          <p className={styles.helperText}>
            Have an account?{" "}
            <Link to="/login" className={styles.link}>
              Login
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
