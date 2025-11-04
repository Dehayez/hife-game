/**
 * LearningFeedback/index.js
 * 
 * UI component to display bot learning progress.
 * Shows statistics about how bots are learning from player behavior.
 */

import { updateLearningProgress } from './functions.js';

export function initLearningFeedback({ mount, learningManager }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__learning-feedback';
  
  const title = document.createElement('h3');
  title.className = 'ui__learning-feedback__title';
  title.textContent = 'Bot Learning Progress';
  
  const content = document.createElement('div');
  content.className = 'ui__learning-feedback__content';
  
  // Overall progress section
  const overallSection = document.createElement('div');
  overallSection.className = 'ui__learning-feedback__section';
  
  const overallLabel = document.createElement('div');
  overallLabel.className = 'ui__learning-feedback__label';
  overallLabel.textContent = 'Overall Progress';
  
  const overallProgress = document.createElement('div');
  overallProgress.className = 'ui__learning-feedback__progress';
  
  const overallBar = document.createElement('div');
  overallBar.className = 'ui__learning-feedback__progress-bar';
  
  const overallText = document.createElement('div');
  overallText.className = 'ui__learning-feedback__progress-text';
  
  overallProgress.appendChild(overallBar);
  overallProgress.appendChild(overallText);
  overallSection.appendChild(overallLabel);
  overallSection.appendChild(overallProgress);
  
  // Shooting progress section
  const shootingSection = document.createElement('div');
  shootingSection.className = 'ui__learning-feedback__section';
  
  const shootingLabel = document.createElement('div');
  shootingLabel.className = 'ui__learning-feedback__label';
  shootingLabel.textContent = 'Shooting Patterns';
  
  const shootingProgress = document.createElement('div');
  shootingProgress.className = 'ui__learning-feedback__progress';
  
  const shootingBar = document.createElement('div');
  shootingBar.className = 'ui__learning-feedback__progress-bar';
  
  const shootingText = document.createElement('div');
  shootingText.className = 'ui__learning-feedback__progress-text';
  
  shootingProgress.appendChild(shootingBar);
  shootingProgress.appendChild(shootingText);
  shootingSection.appendChild(shootingLabel);
  shootingSection.appendChild(shootingProgress);
  
  // Movement progress section
  const movementSection = document.createElement('div');
  movementSection.className = 'ui__learning-feedback__section';
  
  const movementLabel = document.createElement('div');
  movementLabel.className = 'ui__learning-feedback__label';
  movementLabel.textContent = 'Movement Patterns';
  
  const movementProgress = document.createElement('div');
  movementProgress.className = 'ui__learning-feedback__progress';
  
  const movementBar = document.createElement('div');
  movementBar.className = 'ui__learning-feedback__progress-bar';
  
  const movementText = document.createElement('div');
  movementText.className = 'ui__learning-feedback__progress-text';
  
  movementProgress.appendChild(movementBar);
  movementProgress.appendChild(movementText);
  movementSection.appendChild(movementLabel);
  movementSection.appendChild(movementProgress);
  
  // Stats section
  const statsSection = document.createElement('div');
  statsSection.className = 'ui__learning-feedback__stats';
  
  const statsText = document.createElement('div');
  statsText.className = 'ui__learning-feedback__stats-text';
  
  statsSection.appendChild(statsText);
  
  // Assemble
  content.appendChild(overallSection);
  content.appendChild(shootingSection);
  content.appendChild(movementSection);
  content.appendChild(statsSection);
  
  wrapper.appendChild(title);
  wrapper.appendChild(content);
  
  mount.appendChild(wrapper);
  
  // Update progress periodically
  let updateInterval = null;
  
  function updateProgress() {
    if (!learningManager) return;
    
    const progress = learningManager.getLearningProgress();
    
    // Update overall progress
    const overallPercent = Math.round(progress.overall.progress);
    overallBar.style.width = `${overallPercent}%`;
    overallText.textContent = `${overallPercent}%`;
    
    // Update shooting progress
    const shootingPercent = Math.round(progress.shooting.progress);
    shootingBar.style.width = `${shootingPercent}%`;
    shootingText.textContent = `${shootingPercent}%`;
    
    // Update movement progress
    const movementPercent = Math.round(progress.movement.progress);
    movementBar.style.width = `${movementPercent}%`;
    movementText.textContent = `${movementPercent}%`;
    
    // Update stats
    statsText.innerHTML = `
      <div><strong>Difficulty:</strong> ${progress.overall.difficulty}</div>
      <div><strong>Sessions:</strong> ${progress.overall.sessions}</div>
      <div><strong>Shooting Interval:</strong> ${progress.shooting.averageInterval}s</div>
      <div><strong>Preferred Range:</strong> ${progress.shooting.preferredRange}m</div>
      <div><strong>Patterns Learned:</strong> ${progress.movement.patternsLearned}</div>
      <div><strong>Engagement Distance:</strong> ${progress.combat.engagementDistance}m</div>
    `;
  }
  
  function startUpdates() {
    if (updateInterval) return;
    updateInterval = setInterval(updateProgress, 1000); // Update every second
    updateProgress(); // Initial update
  }
  
  function stopUpdates() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }
  
  // Start updates
  startUpdates();
  
  return {
    update: updateProgress,
    start: startUpdates,
    stop: stopUpdates,
    destroy: () => {
      stopUpdates();
      if (mount && wrapper.parentNode === mount) {
        mount.removeChild(wrapper);
      }
    }
  };
}

