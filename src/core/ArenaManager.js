export class ArenaManager {
  constructor() {
    this.currentArena = 'standard'; // 'standard' or 'large'
  }

  getArenas() {
    return [
      { value: 'standard', label: 'Forest Plaza (20x20)' },
      { value: 'large', label: 'Ancient Grove (40x40)' }
    ];
  }

  getCurrentArena() {
    return this.currentArena;
  }

  setArena(arenaKey) {
    if (arenaKey === 'standard' || arenaKey === 'large') {
      this.currentArena = arenaKey;
      return true;
    }
    return false;
  }

  isLargeArena() {
    return this.currentArena === 'large';
  }
}

