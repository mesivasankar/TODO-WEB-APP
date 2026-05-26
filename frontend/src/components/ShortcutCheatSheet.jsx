import ReactDOM from "react-dom";
import styles from "./ShortcutCheatSheet.module.css";

export default function ShortcutCheatSheet({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["Ctrl", "L"], desc: "Create a new List" },
    { keys: ["Ctrl", "K"], desc: "Global Search" },
    { keys: ["Ctrl", "D"], desc: "Toggle Dark/Light Mode" },
    { keys: ["Shift", "?"], desc: "Show Keyboard Shortcuts" },
    { keys: ["Esc"], desc: "Close any Modal" },
  ];

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Keyboard Shortcuts</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.content}>
          {shortcuts.map((sc, idx) => (
            <div key={idx} className={styles.shortcutRow}>
              <span className={styles.desc}>{sc.desc}</span>
              <div className={styles.keys}>
                {sc.keys.map((k, i) => (
                  <span key={i} className={styles.keyBadge}>{k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
