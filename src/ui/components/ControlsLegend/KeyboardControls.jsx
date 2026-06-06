import React from 'react';
import { LegendGroup, LegendSection, LegendKeys, LegendKey } from './subComponents.jsx';

export function KeyboardControls({ isShootingMode, isApocalypseMode }) {
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
        <LegendGroup label="Sprint:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--shift" dangerouslySetInnerHTML={{ __html: '⇧ Shift' }} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump:">
          <LegendKeys variant="jump">
            <LegendKey className="ui__legend-key--space">Space</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Fly:">
          <LegendKeys variant="jump">
            <LegendKey className="ui__legend-key--space">Space</LegendKey>
            <span style={{ fontSize: '13px', opacity: 0.9, marginLeft: '4px' }}>(hold)</span>
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

      {isApocalypseMode && (
        <LegendSection>
          <div className="ui__legend-group" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
            <span className="ui__legend-label" style={{ fontWeight: '600', opacity: '1' }}>
              Survive:
            </span>
          </div>

          <LegendGroup label="Dig:">
            <LegendKeys><LegendKey className="ui__legend-key--char">G</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Raise:">
            <LegendKeys><LegendKey className="ui__legend-key--char">R</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Flatten:">
            <LegendKeys><LegendKey className="ui__legend-key--char">T</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Plant Tree:">
            <LegendKeys><LegendKey className="ui__legend-key--char">P</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Place Block:">
            <LegendKeys><LegendKey className="ui__legend-key--char">B</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Chop/Break:">
            <LegendKeys><LegendKey className="ui__legend-key--char">F</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Block Type:">
            <LegendKeys>
              <LegendKey className="ui__legend-key--char">1</LegendKey>
              <LegendKey className="ui__legend-key--char">2</LegendKey>
              <LegendKey className="ui__legend-key--char">3</LegendKey>
            </LegendKeys>
          </LegendGroup>
        </LegendSection>
      )}

      <LegendSection>
        <LegendGroup label="Swap:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">C</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Heal:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">H</LegendKey>
            <span style={{ fontSize: '13px', opacity: 0.9, marginLeft: '4px' }}>(Hold)</span>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Recharge:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">H</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Melee:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">F</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Speed Boost:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">E</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="View:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">V</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Open Menu:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">ESC</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Scoreboard:">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">Tab</LegendKey>
          </LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}

