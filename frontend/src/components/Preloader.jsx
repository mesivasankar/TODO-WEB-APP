import React from 'react';
import '../styles/Preloader.css';
import logoLight from '../assets/Logo-light.png';
import logoDark from '../assets/Logo-dark.png';
import { useTheme } from '../contexts/ThemeContext';

export default function Preloader({ message }) {
    const { theme } = useTheme();
    const currentLogo = theme === 'light' ? logoDark : logoLight;

    const containerStyle = {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
    };

    return (
        <div className="preloader" style={containerStyle}>
            <div className="preloader-logo">
                <img
                    src={currentLogo}
                    alt="App logo"
                    style={{ width: '120px', height: 'auto' }}
                />
            </div>
            {message && (
                <p className="preloader-message">
                    {message}
                </p>
            )}
        </div>
    );
}