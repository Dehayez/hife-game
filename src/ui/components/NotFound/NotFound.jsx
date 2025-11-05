import React from 'react';
import './NotFound.scss';

/**
 * NotFound.jsx
 * 
 * 404 page component with Hife background and logo
 * Displays when a page is not found
 */
export function NotFound() {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="not-found">
      <div className="not-found__background">
        <div className="not-found__background-gradient"></div>
      </div>
      
      <div className="not-found__content">
        <div className="not-found__logo-wrapper">
          <img 
            src="/android-chrome-512x512.png" 
            alt="Hife Logo" 
            className="not-found__logo"
            width="256"
            height="256"
          />
        </div>
        
        <div className="not-found__text">
          <h1 className="not-found__title">404</h1>
          <p className="not-found__message">
            The path you're looking for doesn't exist in this magical forest.
          </p>
        </div>
        
        <button 
          className="not-found__button"
          onClick={handleGoHome}
          type="button"
        >
          Return to Game
        </button>
      </div>
    </div>
  );
}



