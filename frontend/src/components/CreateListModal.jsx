import { useEffect, useState, useRef } from "react";
import styles from "./CreateListModal.module.css";

const CATEGORIES = [
  { id: "WORK", label: "Work" },
  { id: "PERSONAL", label: "Personal" },
  { id: "FINANCE", label: "Finance" },
  { id: "OTHERS", label: "Others" },
];

export default function CreateListModal({ isOpen, onCancel, onCreate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHERS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory("OTHERS");
      setIsSubmitting(false);
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isValid = name.trim().length > 0;
  const selectedCat = CATEGORIES.find((c) => c.id === category);

  async function handleCreate() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate(name.trim(), category);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Create new list</h2>

        <input
          className={styles.input}
          type="text"
          placeholder="Enter name"
          value={name}
          autoFocus
          disabled={isSubmitting}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className={styles.categoryWrapper}>
          <label className={styles.label}>CATEGORY</label>
          
          <div className={styles.customDropdown} ref={dropdownRef}>
            <div 
              className={`${styles.dropdownHeader} ${isDropdownOpen ? styles.headerActive : ""}`}
              onClick={() => !isSubmitting && setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className={styles.selectedLabel}>
                {selectedCat.label}
              </span>
              <span className={`${styles.chevron} ${isDropdownOpen ? styles.chevronUp : ""}`}>▾</span>
            </div>

            {isDropdownOpen && (
              <div className={styles.dropdownList}>
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className={`${styles.dropdownItem} ${category === cat.id ? styles.itemActive : ""}`}
                    onClick={() => {
                      setCategory(cat.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {cat.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.done} disabled={!isValid || isSubmitting} onClick={handleCreate}>
            {isSubmitting ? "Creating..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}