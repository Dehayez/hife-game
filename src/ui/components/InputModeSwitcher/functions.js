export function getModeDisplayName(mode) {
  const names = {
    keyboard: 'Keyboard & Mouse',
    controller: 'Controller',
  };
  return names[mode] || mode;
}

