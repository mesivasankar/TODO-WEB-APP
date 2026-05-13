import React from 'react';

export default function CategoryBadge({ category }) {
  // 1. Don't show anything for "Others" or empty categories
//   if (!category || category === 'OTHERS') return null;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      
      // Minimalist Style (Matches "Tomorrow" tag)
      backgroundColor: 'var(--surface-3)', 
      border: '1px solid var(--border)',
      color: 'var(--text-secondary)',
      
      fontSize: '11px',
      fontWeight: '500',
      padding: '2px 10px',     // Capsule padding
      borderRadius: '999px',   // Fully rounded pill
      marginLeft: '12px',      // Spacing from title
      
      textTransform: 'uppercase', // "WORK" looks cleaner than "Work"
      letterSpacing: '0.5px',
      userSelect: 'none',      // Prevent text selection
      verticalAlign: 'middle'
    }}>
      {category}
    </span>
  );
}