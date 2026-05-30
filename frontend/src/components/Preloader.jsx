import React from 'react';
import '../styles/Preloader.css';
import logoLight from '../assets/Logo-light.png';
import logoDark from '../assets/Logo-dark.png';
import { useTheme } from '../contexts/ThemeContext';

export default function Preloader() {
    // 1. Get the current theme
    const { theme } = useTheme();

    // 2. Select the correct logo
    // If theme is 'light', use Dark Logo (black text)
    // If theme is 'dark', use Light Logo (white text)
    const currentLogo = theme === 'light' ? logoDark : logoLight;

    // 3. Dynamic background color
    const containerStyle = {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e',
        // Ensure it covers the whole screen
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    return (
        <div className="preloader" style={containerStyle}>
            <div className="preloader-logo">
                <img 
                    src={currentLogo} 
                    alt="App logo" 
                    style={{ width: '120px', height: 'auto' }} // Adjust size as needed
                />
            </div>
            {/* You can add your CSS spinner here if you have one in preloader.css */}
        </div>
    );
}