import React, { createContext, useContext, useState } from "react";
import FocusModeOverlay from "../components/Focus/FocusModeOverlay";

const FocusModeContext = createContext();

export function useFocusMode() {
  return useContext(FocusModeContext);
}

export function FocusModeProvider({ children }) {
  const [activeFocusTask, setActiveFocusTask] = useState(null);
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false);

  const startFocus = (task) => {
    setActiveFocusTask(task);
    setIsFocusOverlayOpen(true);
  };

  const stopFocus = () => {
    setActiveFocusTask(null);
    setIsFocusOverlayOpen(false);
  };

  return (
    <FocusModeContext.Provider value={{ activeFocusTask, isFocusOverlayOpen, startFocus, stopFocus }}>
      {children}
      {isFocusOverlayOpen && (
        <FocusModeOverlay 
          task={activeFocusTask} 
          onClose={stopFocus} 
        />
      )}
    </FocusModeContext.Provider>
  );
}
