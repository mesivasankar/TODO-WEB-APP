import React from 'react';
import '../styles/preloader.css';
import logoLight from '../assets/Logo-light.png';
import logoDark from '../assets/Logo-dark.png';



export default function Preloader() {
    return (
        <div className="preloader">
            <div className="preloader-logo">
                <img className="logo-light" src={logoLight} alt="App logo" />
                {/* <img className="logo-dark" src={logoDark} alt="App logo" /> */}
            </div>
        </div>
    );
}
