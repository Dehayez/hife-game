import React, { useState, useEffect } from 'react';

function LegendGroup({ label, children, className = '' }) {
  return (
    <div className={`ui__legend-group ${className}`}>
      <span className="ui__legend-label">{label}</span>
      {children}
    </div>
  );
}

function LegendSection({ children, className = '' }) {
  return <div className={`ui__legend-section ${className}`}>{children}</div>;
}

function LegendKeys({ children, variant = 'run' }) {
  return <div className={`ui__legend-keys ui__legend-keys--${variant}`}>{children}</div>;
}

function LegendKey({ children, className = '', ...props }) {
  return (
    <div className={`ui__legend-key ${className}`} {...props}>
      {children}
    </div>
  );
}

function XboxButton({ label, button, className = '' }) {
  return (
    <LegendKey className={`ui__legend-key--xbox ui__legend-key--xbox-${button} ${className}`} title={`Xbox ${button}`}>
      <span className="xbox-button">{button}</span>
    </LegendKey>
  );
}

function KeyboardControls({ isShootingMode }) {
  const arrowKeys = [
    { key: 'up', label: '↑', className: 'ui__legend-key--up' },
    { key: 'left', label: '←', className: 'ui__legend-key--left' },
    { key: 'down', label: '↓', className: 'ui__legend-key--down' },
    { key: 'right', label: '→', className: 'ui__legend-key--right' },
  ];

  return (
    <>
      <LegendSection>
        <LegendGroup label="Move:">
          <LegendKeys variant="arrows">
            {arrowKeys.map((keyData) => (
              <LegendKey key={keyData.key} className={keyData.className}>
                {keyData.label}
              </LegendKey>
            ))}
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      <LegendSection>
        <LegendGroup label="Run:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--shift" dangerouslySetInnerHTML={{ __html: '⇧ Shift' }} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump:">
          <LegendKeys variant="jump">
            <LegendKey className="ui__legend-key--space">Space</LegendKey>
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      {isShootingMode && (
        <LegendSection>
          <div className="ui__legend-group" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
            <span className="ui__legend-label" style={{ fontWeight: '600', opacity: '1' }}>
              Shooting:
            </span>
          </div>

          <LegendGroup label="Bolt:">
            <LegendKeys>
              <LegendKey>🖱️ Left Click</LegendKey>
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Mortar:">
            <LegendKeys>
              <LegendKey>🖱️ Right Click</LegendKey>
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Speed (Herald):">
            <LegendKey style={{ minWidth: 'auto', fontSize: '10px', opacity: '0.7' }}>
              Cursor distance
            </LegendKey>
          </LegendGroup>
        </LegendSection>
      )}
    </>
  );
}

function ControllerControls({ isShootingMode }) {
  return (
    <>
      <LegendSection>
        <LegendGroup label="Move:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--xbox" title="Xbox Left Analog Stick">
              🎮 Left Stick
            </LegendKey>
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      <LegendSection>
        <LegendGroup label="Run:">
          <LegendKeys>
            <XboxButton button="LT" className="ui__legend-key--xbox-lt" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump:">
          <LegendKeys>
            <XboxButton button="A" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Levitate:">
          <LegendKeys>
            <XboxButton button="A" />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      {isShootingMode && (
        <LegendSection>
          <div className="ui__legend-group" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
            <span className="ui__legend-label" style={{ fontWeight: '600', opacity: '1' }}>
              Shooting:
            </span>
          </div>

          <LegendGroup label="Aim:">
            <LegendKeys>
              <LegendKey className="ui__legend-key--xbox" title="Xbox Right Analog Stick">
                🎮 Right Stick
              </LegendKey>
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Bolt:">
            <LegendKeys>
              <XboxButton button="RT" className="ui__legend-key--xbox-rt" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Mortar Hold:">
            <LegendKeys>
              <XboxButton button="RB" className="ui__legend-key--xbox-rb" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Release:">
            <LegendKeys>
              <XboxButton button="RT" className="ui__legend-key--xbox-rt" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Speed (Herald):">
            <LegendKey style={{ minWidth: 'auto', fontSize: '10px', opacity: '0.7' }}>
              Right stick push
            </LegendKey>
          </LegendGroup>
        </LegendSection>
      )}

      <LegendSection>
        <LegendGroup label="Swap:">
          <LegendKeys>
            <XboxButton button="Y" className="ui__legend-key--xbox-y" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Heal:">
          <LegendKeys>
            <XboxButton button="X" className="ui__legend-key--xbox-x" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Sword:">
          <LegendKeys>
            <XboxButton button="B" className="ui__legend-key--xbox-b" />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}

export function ControlsLegend({ inputManager, gameModeManager }) {
  const [inputMode, setInputMode] = useState(() => inputManager?.getInputMode() || 'keyboard');
  const [gameMode, setGameMode] = useState(() => gameModeManager?.getMode() || 'free-play');

  useEffect(() => {
    const updateFromManagers = () => {
      if (inputManager) {
        setInputMode(inputManager.getInputMode());
      }
      if (gameModeManager) {
        setGameMode(gameModeManager.getMode());
      }
    };

    // Initial update
    updateFromManagers();

    // Set up interval to check for changes (since managers don't emit events)
    const interval = setInterval(updateFromManagers, 100);

    return () => clearInterval(interval);
  }, [inputManager, gameModeManager]);

  const isShootingMode = gameMode === 'shooting';

  return (
    <div className="ui__legend-panel">
      <h3 className="ui__legend-title">Controls</h3>
      <div className="ui__legend-content">
        {inputMode === 'controller' ? (
          <ControllerControls isShootingMode={isShootingMode} />
        ) : (
          <KeyboardControls isShootingMode={isShootingMode} />
        )}
      </div>
    </div>
  );
}

