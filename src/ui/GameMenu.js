/**
 * GameMenu.js
 * 
 * Unified professional game menu/overlay system
 * Consolidates all UI components into a single, toggleable menu
 */

export class GameMenu {
  constructor(config) {
    this.isVisible = false;
    this.activeTab = 'settings';
    
    // Store config
    this.config = config || {};
    
    // Controller navigation state
    this.controllerNavigation = {
      enabled: false,
      currentTabIndex: 0,
      currentSectionIndex: 0,
      buttonPressed: new Set() // Track button states to prevent rapid firing
    };
    
    // Create menu structure
    this.createMenu();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up controller navigation
    this.setupControllerNavigation();
  }

  createMenu() {
    // Main menu overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'game-menu';
    this.overlay.setAttribute('aria-hidden', 'true');
    
    // Menu container
    this.container = document.createElement('div');
    this.container.className = 'game-menu__container';
    
    // Menu header
    this.header = document.createElement('div');
    this.header.className = 'game-menu__header';
    
    const title = document.createElement('h2');
    title.className = 'game-menu__title';
    title.textContent = 'Game Menu';
    this.header.appendChild(title);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'game-menu__close';
    closeButton.innerHTML = '✕';
    closeButton.setAttribute('aria-label', 'Close menu');
    closeButton.addEventListener('click', () => this.toggle());
    this.header.appendChild(closeButton);
    
    this.container.appendChild(this.header);
    
    // Menu tabs
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'game-menu__tabs';
    
    this.tabs = [
      { id: 'settings', label: 'Settings', icon: '⚙️' },
      { id: 'multiplayer', label: 'Multiplayer', icon: '🌐' },
      { id: 'controls', label: 'Controls', icon: '🎮' }
    ];
    
    this.tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = 'game-menu__tab';
      tabButton.dataset.tab = tab.id;
      tabButton.innerHTML = `<span class="game-menu__tab-icon">${tab.icon}</span><span class="game-menu__tab-label">${tab.label}</span>`;
      tabButton.addEventListener('click', () => this.switchTab(tab.id));
      this.tabsContainer.appendChild(tabButton);
    });
    
    this.container.appendChild(this.tabsContainer);
    
    // Menu content area
    this.content = document.createElement('div');
    this.content.className = 'game-menu__content';
    
    // Create tab panels
    this.panels = {};
    this.tabs.forEach(tab => {
      const panel = document.createElement('div');
      panel.className = 'game-menu__panel';
      panel.dataset.panel = tab.id;
      panel.setAttribute('aria-hidden', tab.id !== 'settings');
      this.content.appendChild(panel);
      this.panels[tab.id] = panel;
    });
    
    this.container.appendChild(this.content);
    
    this.overlay.appendChild(this.container);
    
    // Append to root element if provided, otherwise to body
    const root = document.getElementById('game-menu-root') || document.body;
    root.appendChild(this.overlay);
  }

  setupEventListeners() {
    // ESC key to toggle menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.toggle();
      }
    });
    
    // Close on overlay click (outside menu)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.toggle();
      }
    });
  }

  setupControllerNavigation() {
    // Poll for gamepad inputs (gamepad API doesn't fire events, need to poll)
    this.controllerPollInterval = null;
  }

  startControllerPolling() {
    if (this.controllerPollInterval) return;
    
    this.controllerPollInterval = setInterval(() => {
      this.handleControllerInput();
    }, 50); // Poll every 50ms
  }

  stopControllerPolling() {
    if (this.controllerPollInterval) {
      clearInterval(this.controllerPollInterval);
      this.controllerPollInterval = null;
    }
    this.controllerNavigation.buttonPressed.clear();
  }

  handleControllerInput() {
    const gamepads = navigator.getGamepads();
    if (!gamepads || gamepads.length === 0) return;
    
    const gamepad = gamepads[0]; // Use first connected gamepad
    if (!gamepad) return;

    // Xbox button mappings:
    // Button 8 = Back
    // Button 9 = Start (Menu/Options) - Handled in main.js gameLoop.tick to avoid conflicts
    // Button 4 = Left Bumper (LB)
    // Button 5 = Right Bumper (RB)
    // Button 0 = A

    // Note: Start button (9) is handled in main.js to avoid double-toggling
    // This menu handler only processes navigation when menu is open

    // Back button (8) - Close menu if open
    if (gamepad.buttons[8]?.pressed) {
      if (!this.controllerNavigation.buttonPressed.has(8)) {
        this.controllerNavigation.buttonPressed.add(8);
        if (this.isVisible) {
          this.toggle(); // Close menu
        }
      }
    } else {
      this.controllerNavigation.buttonPressed.delete(8);
    }

    // Left Bumper (4) - Navigate tabs left
    if (gamepad.buttons[4]?.pressed) {
      if (!this.controllerNavigation.buttonPressed.has(4)) {
        this.controllerNavigation.buttonPressed.add(4);
        this.navigateTab('left');
        // Prevent rapid navigation
        setTimeout(() => {
          this.controllerNavigation.buttonPressed.delete(4);
        }, 300);
      }
    }

    // Right Bumper (5) - Navigate tabs right
    if (gamepad.buttons[5]?.pressed) {
      if (!this.controllerNavigation.buttonPressed.has(5)) {
        this.controllerNavigation.buttonPressed.add(5);
        this.navigateTab('right');
        // Prevent rapid navigation
        setTimeout(() => {
          this.controllerNavigation.buttonPressed.delete(5);
        }, 300);
      }
    }

    // Left joystick navigation (for menu items)
    const leftStickX = gamepad.axes[0] || 0;
    const leftStickY = gamepad.axes[1] || 0;
    const stickThreshold = 0.5;
    
    if (Math.abs(leftStickX) > stickThreshold || Math.abs(leftStickY) > stickThreshold) {
      const direction = Math.abs(leftStickX) > Math.abs(leftStickY) 
        ? (leftStickX > 0 ? 'right' : 'left')
        : (leftStickY > 0 ? 'down' : 'up');
      
      const stickKey = `stick-${direction}`;
      if (!this.controllerNavigation.buttonPressed.has(stickKey)) {
        this.controllerNavigation.buttonPressed.add(stickKey);
        this.handleJoystickNavigation(direction);
        // Prevent rapid navigation
        setTimeout(() => {
          this.controllerNavigation.buttonPressed.delete(stickKey);
        }, 200);
      }
    }

    // A button (0) - Activate focused element
    if (gamepad.buttons[0]?.pressed) {
      if (!this.controllerNavigation.buttonPressed.has(0)) {
        this.controllerNavigation.buttonPressed.add(0);
        this.activateFocusedElement();
      }
    } else {
      this.controllerNavigation.buttonPressed.delete(0);
    }

    // D-pad up/down for section navigation
    const dpadY = gamepad.axes[7] || 0; // D-pad Y axis
    if (Math.abs(dpadY) > 0.5) {
      const direction = dpadY > 0 ? 'down' : 'up';
      const directionKey = `dpad-${direction}`;
      if (!this.controllerNavigation.buttonPressed.has(directionKey)) {
        this.controllerNavigation.buttonPressed.add(directionKey);
        this.handleJoystickNavigation(direction);
        // Prevent rapid navigation
        setTimeout(() => {
          this.controllerNavigation.buttonPressed.delete(directionKey);
        }, 200);
      }
    }
  }

  navigateTab(direction) {
    const tabIndex = this.tabs.findIndex(t => t.id === this.activeTab);
    let newIndex;
    
    if (direction === 'left') {
      newIndex = tabIndex - 1;
      if (newIndex < 0) newIndex = this.tabs.length - 1; // Wrap to last tab
    } else {
      newIndex = tabIndex + 1;
      if (newIndex >= this.tabs.length) newIndex = 0; // Wrap to first tab
    }
    
    this.switchTab(this.tabs[newIndex].id);
  }

  navigateNextTab() {
    this.navigateTab('right');
  }

  handleJoystickNavigation(direction) {
    // Get all focusable elements in current panel
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    // Find current focused element
    const currentFocused = document.activeElement;
    let currentIndex = Array.from(focusableElements).indexOf(currentFocused);
    
    // If nothing focused, start at first element
    if (currentIndex === -1) {
      currentIndex = 0;
      focusableElements[0]?.focus();
      this.highlightElement(focusableElements[0]);
      return;
    }

    // Simple linear navigation (one direction at a time)
    let nextIndex = currentIndex;

    switch (direction) {
      case 'up':
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = focusableElements.length - 1; // Wrap to last
        break;
      case 'down':
        nextIndex = currentIndex + 1;
        if (nextIndex >= focusableElements.length) nextIndex = 0; // Wrap to first
        break;
      case 'left':
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = focusableElements.length - 1; // Wrap to last
        break;
      case 'right':
        nextIndex = currentIndex + 1;
        if (nextIndex >= focusableElements.length) nextIndex = 0; // Wrap to first
        break;
    }

    // Ensure index is within bounds
    nextIndex = Math.max(0, Math.min(focusableElements.length - 1, nextIndex));
    
    // Focus next element
    if (focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
      this.highlightElement(focusableElements[nextIndex]);
    }
  }

  getFocusableElements() {
    const panel = this.getCurrentPanel();
    if (!panel) return [];

    // Get all focusable elements: buttons, inputs, selects
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(panel.querySelectorAll(selectors)).filter(el => {
      // Filter out hidden or disabled elements
      return !el.disabled && 
             el.offsetWidth > 0 && 
             el.offsetHeight > 0 &&
             window.getComputedStyle(el).visibility !== 'hidden';
    });
  }

  highlightElement(element) {
    // Remove previous highlight
    const prevHighlighted = this.getCurrentPanel()?.querySelector('.game-menu__focused');
    if (prevHighlighted) {
      prevHighlighted.classList.remove('game-menu__focused');
    }

    // Add highlight to current element
    if (element) {
      element.classList.add('game-menu__focused');
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  activateFocusedElement() {
    const focused = document.activeElement;
    if (!focused) {
      // If nothing focused, focus first element
      const focusable = this.getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
        this.highlightElement(focusable[0]);
      }
      return;
    }

    // Activate based on element type
    if (focused.tagName === 'BUTTON') {
      // Click button
      focused.click();
    } else if (focused.tagName === 'SELECT' || focused.tagName === 'INPUT') {
      // Focus input/select (already focused, so no action needed)
      // For selects, open dropdown on A button
      if (focused.tagName === 'SELECT') {
        focused.focus();
        focused.click();
      }
    }
  }


  getCurrentPanel() {
    return this.panels[this.activeTab];
  }

  switchTab(tabId) {
    if (!this.tabs.find(t => t.id === tabId)) return;
    
    this.activeTab = tabId;
    this.controllerNavigation.currentTabIndex = this.tabs.findIndex(t => t.id === tabId);
    this.controllerNavigation.currentSectionIndex = 0; // Reset section index when switching tabs
    
    // Update tab buttons
    this.tabsContainer.querySelectorAll('.game-menu__tab').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabId);
    });
    
    // Update panels
    Object.entries(this.panels).forEach(([id, panel]) => {
      const isActive = id === tabId;
      panel.setAttribute('aria-hidden', !isActive);
      panel.classList.toggle('is-active', isActive);
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.overlay.setAttribute('aria-hidden', !this.isVisible);
    this.overlay.classList.toggle('is-visible', this.isVisible);
    
    // Start/stop controller polling based on visibility
    if (this.isVisible) {
      this.startControllerPolling();
      // Focus management - focus first focusable element
      setTimeout(() => {
        const focusable = this.getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
          this.highlightElement(focusable[0]);
        }
      }, 100);
      // Reset navigation state when opening
      this.controllerNavigation.currentSectionIndex = 0;
      
      // Notify that menu is open (to block game inputs)
      if (this.config.onMenuOpen) {
        this.config.onMenuOpen();
      }
    } else {
      this.stopControllerPolling();
      // Remove any highlights
      const highlighted = document.querySelector('.game-menu__focused');
      if (highlighted) {
        highlighted.classList.remove('game-menu__focused');
      }
      
      // Notify that menu is closed (to allow game inputs)
      if (this.config.onMenuClose) {
        this.config.onMenuClose();
      }
    }
    
    // Callback for visibility change
    if (this.config.onVisibilityChange) {
      this.config.onVisibilityChange(this.isVisible);
    }
  }

  show() {
    if (!this.isVisible) {
      this.toggle();
    }
  }

  hide() {
    if (this.isVisible) {
      this.toggle();
    }
  }

  getVisibility() {
    return this.isVisible;
  }

  // Section management
  addSection(tabId, sectionConfig) {
    if (!this.panels[tabId]) {
      console.warn(`Tab ${tabId} does not exist`);
      return null;
    }
    
    const section = document.createElement('div');
    section.className = 'game-menu__section';
    if (sectionConfig.className) {
      section.classList.add(sectionConfig.className);
    }
    
    // Create section header (non-collapsible)
    if (sectionConfig.title) {
      const header = document.createElement('div');
      header.className = 'game-menu__section-header';
      
      const title = document.createElement('h3');
      title.className = 'game-menu__section-title';
      title.textContent = sectionConfig.title;
      header.appendChild(title);
      
      section.appendChild(header);
    }
    
    // Create content container (always visible)
    const content = document.createElement('div');
    content.className = 'game-menu__section-content';
    
    if (sectionConfig.content) {
      if (typeof sectionConfig.content === 'string') {
        content.innerHTML = sectionConfig.content;
      } else if (sectionConfig.content instanceof HTMLElement) {
        content.appendChild(sectionConfig.content);
      }
    }
    
    section.appendChild(content);
    
    this.panels[tabId].appendChild(section);
    return section;
  }

  // Remove section
  removeSection(tabId, sectionElement) {
    if (sectionElement && sectionElement.parentNode) {
      sectionElement.parentNode.removeChild(sectionElement);
    }
  }

  // Clear section
  clearSection(tabId) {
    if (this.panels[tabId]) {
      this.panels[tabId].innerHTML = '';
    }
  }

  // Get panel element
  getPanel(tabId) {
    return this.panels[tabId];
  }

  // Get section element
  getSection(tabId, className) {
    if (!this.panels[tabId]) return null;
    return this.panels[tabId].querySelector(`.game-menu__section.${className}`);
  }

  // Destroy menu
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

