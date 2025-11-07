import React from 'react';
import { LegendGroup, LegendSection, LegendKeys, LegendKey, ControllerButton, ControllerStick } from './subComponents.jsx';

export function ControllerControls({ isShootingMode, controllerType = 'xbox' }) {
  const resolvedType = controllerType === 'generic' ? 'xbox' : controllerType;
  const controllerLabel = resolvedType === 'playstation' ? 'PlayStation' : 'Xbox';

  return (
    <>
      <LegendSection>
        <LegendGroup label="Move:">
          <LegendKeys>
            <ControllerStick side="left" controllerLabel={controllerLabel} />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      <LegendSection>
        <LegendGroup label="Run:">
          <LegendKeys>
            <ControllerButton button="LT" controllerType={resolvedType} className="ui__legend-key--controller-lt" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump:">
          <LegendKeys>
            <ControllerButton button="A" controllerType={resolvedType} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Levitate:">
          <LegendKeys>
            <ControllerButton button="A" controllerType={resolvedType} />
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
              <ControllerStick side="right" controllerLabel={controllerLabel} />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Bolt:">
            <LegendKeys>
              <ControllerButton button="RT" controllerType={resolvedType} className="ui__legend-key--controller-rt" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Mortar Hold:">
            <LegendKeys>
              <ControllerButton button="RB" controllerType={resolvedType} className="ui__legend-key--controller-rb" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Release:">
            <LegendKeys>
              <ControllerButton button="RT" controllerType={resolvedType} className="ui__legend-key--controller-rt" />
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
            <ControllerButton button="Y" controllerType={resolvedType} className="ui__legend-key--controller-y" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Heal:">
          <LegendKeys>
            <ControllerButton button="X" controllerType={resolvedType} className="ui__legend-key--controller-x" />
            <span style={{ fontSize: '13px', opacity: 0.9, marginLeft: '4px' }}>(Hold)</span>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Melee:">
          <LegendKeys>
            <ControllerButton button="B" controllerType={resolvedType} className="ui__legend-key--controller-b" />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}

