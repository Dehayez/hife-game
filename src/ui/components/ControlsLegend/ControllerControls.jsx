import React from 'react';
import { LegendGroup, LegendSection, LegendKeys, LegendKey, ControllerButton, ControllerStick } from './subComponents.jsx';

export function ControllerControls({ isShootingMode, isApocalypseMode, controllerType = 'xbox' }) {
  const resolvedType = controllerType === 'generic' ? 'xbox' : controllerType;
  const controllerLabel = resolvedType === 'playstation' ? 'PlayStation' : 'Xbox';

  return (
    <>
      <LegendSection title="Movement">
        <LegendGroup label="Move">
          <LegendKeys>
            <ControllerStick side="left" controllerLabel={controllerLabel} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Sprint">
          <LegendKeys>
            <ControllerButton button="LT" controllerType={resolvedType} className="ui__legend-key--controller-lt" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Jump">
          <LegendKeys>
            <ControllerButton button="A" controllerType={resolvedType} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Fly" hint="hold">
          <LegendKeys>
            <ControllerButton button="A" controllerType={resolvedType} />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      {isShootingMode && (
        <LegendSection title="Combat">
          <LegendGroup label="Aim">
            <LegendKeys>
              <ControllerStick side="right" controllerLabel={controllerLabel} />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Bolt">
            <LegendKeys>
              <ControllerButton button="RT" controllerType={resolvedType} className="ui__legend-key--controller-rt" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Mortar" hint="hold">
            <LegendKeys>
              <ControllerButton button="RB" controllerType={resolvedType} className="ui__legend-key--controller-rb" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Release">
            <LegendKeys>
              <ControllerButton button="RT" controllerType={resolvedType} className="ui__legend-key--controller-rt" />
            </LegendKeys>
          </LegendGroup>

          <LegendGroup label="Speed (Herald)" hint="right stick push">
            <LegendKeys />
          </LegendGroup>
        </LegendSection>
      )}

      <LegendSection title="Abilities">
        <LegendGroup label="Swap">
          <LegendKeys>
            <ControllerButton button="Y" controllerType={resolvedType} className="ui__legend-key--controller-y" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Heal" hint="hold">
          <LegendKeys>
            <ControllerButton button="X" controllerType={resolvedType} className="ui__legend-key--controller-x" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Recharge">
          <LegendKeys>
            <ControllerButton button="X" controllerType={resolvedType} className="ui__legend-key--controller-x" />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Melee">
          <LegendKeys>
            <ControllerButton button="B" controllerType={resolvedType} className="ui__legend-key--controller-b" />
          </LegendKeys>
        </LegendGroup>
      </LegendSection>

      <LegendSection title="System">
        <LegendGroup label="View" hint="click">
          <LegendKeys>
            <ControllerStick side="right" controllerLabel={controllerLabel} />
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Open Menu">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">Start</LegendKey>
          </LegendKeys>
        </LegendGroup>

        <LegendGroup label="Scoreboard">
          <LegendKeys>
            <LegendKey className="ui__legend-key--char">Back</LegendKey>
          </LegendKeys>
        </LegendGroup>
      </LegendSection>
    </>
  );
}
