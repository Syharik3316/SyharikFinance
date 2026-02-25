import React from 'react';

export default function ScenarioStage({
  backgroundUrl,
  backgroundClassName,
  leftHud,
  onExit,
  children,
}) {
  const style = backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined;

  return (
    <div className={`scenario-stage ${backgroundClassName || ''}`} style={style}>
      <div className="scenario-ui">
        <div className="hud">
          <div className="hud-left">{leftHud}</div>
          <button className="secondary-btn" type="button" onClick={onExit}>
            Выйти
          </button>
        </div>
        <div className="stage-content">{children}</div>
      </div>
    </div>
  );
}

