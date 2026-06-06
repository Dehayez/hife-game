export function toTitleCase(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const CHARACTER_PORTRAIT_OVERRIDES = {
  draco: '/assets/characters/herald/idle_front.png'
};

export function getCharacterPortraitSrc(characterName) {
  return (
    CHARACTER_PORTRAIT_OVERRIDES[characterName] ||
    `/assets/characters/${characterName}/idle_front.png`
  );
}

const CHARACTER_DISPLAY_NAMES = {
  draco: 'Draco'
};

export function getCharacterDisplayName(characterName) {
  return CHARACTER_DISPLAY_NAMES[characterName] || toTitleCase(characterName);
}

