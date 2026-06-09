/* components/HaloButton.jsx */
import React from 'react';

/**
 * HaloButton - a button component that adds a pulsing halo glow around it.
 * It expects all standard button props (onClick, disabled, className, etc.).
 * The pulsing effect is driven by the .pulse-halo CSS class defined in index.css.
 */
const HaloButton = ({ children, className = '', ...props }) => {
  return (
    <button className={`pulse-halo ${className}`} {...props}>
      {children}
    </button>
  );
};

export default HaloButton;
