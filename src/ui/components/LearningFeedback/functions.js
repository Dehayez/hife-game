/**
 * LearningFeedback/functions.js
 * 
 * Helper functions for learning feedback component.
 */

/**
 * Update learning progress display
 * @param {Object} learningManager - Learning manager instance
 * @param {Object} elements - UI elements to update
 * @returns {Object} Progress data
 */
export function updateLearningProgress(learningManager, elements) {
  if (!learningManager) return null;
  
  const progress = learningManager.getLearningProgress();
  
  if (elements.overallBar) {
    const overallPercent = Math.round(progress.overall.progress);
    elements.overallBar.style.width = `${overallPercent}%`;
  }
  
  if (elements.overallText) {
    elements.overallText.textContent = `${Math.round(progress.overall.progress)}%`;
  }
  
  if (elements.shootingBar) {
    const shootingPercent = Math.round(progress.shooting.progress);
    elements.shootingBar.style.width = `${shootingPercent}%`;
  }
  
  if (elements.shootingText) {
    elements.shootingText.textContent = `${Math.round(progress.shooting.progress)}%`;
  }
  
  if (elements.movementBar) {
    const movementPercent = Math.round(progress.movement.progress);
    elements.movementBar.style.width = `${movementPercent}%`;
  }
  
  if (elements.movementText) {
    elements.movementText.textContent = `${Math.round(progress.movement.progress)}%`;
  }
  
  return progress;
}

