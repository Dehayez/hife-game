import React from 'react';
import { LegendGroup, LegendSection, LegendKeys, LegendKey, XboxButton } from './subComponents.jsx';

export function ControllerControls({ isShootingMode }) {
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
            <span style={{ fontSize: '13px', opacity: 0.9, marginLeft: '4px' }}>(Hold)</span>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Melee:">
          <LegendKeys>
            <XboxButton button="B" className="ui__legend-key--xbox-b" />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}

