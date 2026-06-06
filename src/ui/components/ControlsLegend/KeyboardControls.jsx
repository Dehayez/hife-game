import React from 'react';
import { LegendGroup, LegendSection, LegendKeys, LegendKey } from './subComponents.jsx';

const ARROW_KEYS = [
  { key: 'up', label: '↑', className: 'ui__legend-key--up' },
  { key: 'left', label: '←', className: 'ui__legend-key--left' },
  { key: 'down', label: '↓', className: 'ui__legend-key--down' },
  { key: 'right', label: '→', className: 'ui__legend-key--right' },
];

export function KeyboardControls({ isShootingMode, isApocalypseMode }) {
  return (
    <>
      <LegendSection title="Movement">
        <LegendGroup label="Move">
          <LegendKeys variant="arrows">
            {ARROW_KEYS.map((keyData) => (
              <LegendKey key={keyData.key} className={keyData.className}>
                {keyData.label}
              </LegendKey>
            ))}
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Sprint">
          <LegendKeys>
            <LegendKey className="ui__legend-key--shift" dangerouslySetInnerHTML={{ __html: '⇧ Shift' }} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump">
          <LegendKeys variant="jump">
            <LegendKey className="ui__legend-key--space">Space</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Fly" hint="hold">
          <LegendKeys variant="jump">
            <LegendKey className="ui__legend-key--space">Space</LegendKey>
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      {isShootingMode && (
        <LegendSection title="Combat">
          <LegendGroup label="Bolt">
            <LegendKeys>
              <LegendKey>🖱 Left Click</LegendKey>
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Mortar">
            <LegendKeys>
              <LegendKey>🖱 Right Click</LegendKey>
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Speed (Herald)" hint="cursor distance">
            <LegendKeys />
          </LegendGroup>
        </LegendSection>
      )}

      {isApocalypseMode && (
        <LegendSection title="Survive">
          <LegendGroup label="Dig">
            <LegendKeys><LegendKey className="ui__legend-key--char">G</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Raise">
            <LegendKeys><LegendKey className="ui__legend-key--char">R</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Flatten">
            <LegendKeys><LegendKey className="ui__legend-key--char">T</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Plant Tree">
            <LegendKeys><LegendKey className="ui__legend-key--char">P</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Place Block">
            <LegendKeys><LegendKey className="ui__legend-key--char">B</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Chop / Break">
            <LegendKeys><LegendKey className="ui__legend-key--char">F</LegendKey></LegendKeys>
          </LegendGroup>
          <LegendGroup label="Block Type">
            <LegendKeys>
              <LegendKey className="ui__legend-key--char">1</LegendKey>
              <LegendKey className="ui__legend-key--char">2</LegendKey>
              <LegendKey className="ui__legend-key--char">3</LegendKey>
            </LegendKeys>
          </LegendGroup>
        </LegendSection>
      )}

      <LegendSection title="Abilities">
        <LegendGroup label="Swap">
          <LegendKeys><LegendKey className="ui__legend-key--char">C</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Heal" hint="hold">
          <LegendKeys><LegendKey className="ui__legend-key--char">H</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Recharge">
          <LegendKeys><LegendKey className="ui__legend-key--char">H</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Melee">
          <LegendKeys><LegendKey className="ui__legend-key--char">F</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Speed Boost">
          <LegendKeys><LegendKey className="ui__legend-key--char">E</LegendKey></LegendKeys>
        </LegendGroup>
      </LegendSection>

      <LegendSection title="System">
        <LegendGroup label="View">
          <LegendKeys><LegendKey className="ui__legend-key--char">V</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Open Menu">
          <LegendKeys><LegendKey className="ui__legend-key--char">Esc</LegendKey></LegendKeys>
        </LegendGroup>

        <LegendGroup label="Scoreboard">
          <LegendKeys><LegendKey className="ui__legend-key--char">Tab</LegendKey></LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}
