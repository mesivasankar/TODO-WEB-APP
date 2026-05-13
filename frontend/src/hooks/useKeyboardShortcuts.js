import { useEffect } from 'react';

export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if the user is typing in an input/textarea (except for Escape)
      const activeTag = document.activeElement.tagName.toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable;

      for (const shortcut of shortcuts) {
        const { key, ctrlCmd, shift, action, allowInInput } = shortcut;

        // Skip if input is focused and the shortcut shouldn't override it
        if (isInputFocused && !allowInInput) continue;

        const isKeyMatch = event.key.toLowerCase() === key.toLowerCase();
        const isCtrlCmdMatch = ctrlCmd ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const isShiftMatch = shift ? event.shiftKey : !event.shiftKey;

        if (isKeyMatch && isCtrlCmdMatch && isShiftMatch) {
          event.preventDefault();
          action(event);
          return; // Stop after first match
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
