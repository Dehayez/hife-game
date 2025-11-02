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
      { id: 'settings', label: 'Settings' },
      { id: 'multiplayer', label: 'Multiplayer' },
      { id: 'controls', label: 'Controls' }
    ];
    
    this.tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = 'game-menu__tab';
      tabButton.dataset.tab = tab.id;
      tabButton.innerHTML = `<span class="game-menu__tab-label">${tab.label}</span>`;
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
    
    // Open menu when clicking on select dropdowns (even if menu is closed)
    // Use document-level event delegation to catch all select elements
    const handleSelectInteraction = (e) => {
      const target = e.target;
      if (target.tagName === 'SELECT' && this.overlay.contains(target) && !this.isVisible) {
        e.preventDefault();
        e.stopPropagation();
        this.show();
        // Focus the select element after menu opens
        setTimeout(() => {
          target.focus();
          this.highlightElement(target);
        }, 100);
      }
    };
    
    // Use capture phase to catch events before they bubble
    document.addEventListener('mousedown', handleSelectInteraction, true);
    document.addEventListener('focus', handleSelectInteraction, true);
  }

  setupControllerNavigation() {
    // Poll for gamepad inputs (gamepad API doesn't fire events, need to poll)
    // Start polling immediately to handle A button when menu is closed
    this.controllerPollInterval = null;
    this.startControllerPolling();
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
    
    // A button (0) - Open menu if closed, or activate focused element if open
    // Handle this even when menu is closed
    if (gamepad.buttons[0]?.pressed) {
      if (!this.controllerNavigation.buttonPressed.has(0)) {
        this.controllerNavigation.buttonPressed.add(0);
        if (!this.isVisible) {
          // Open menu if closed
          this.show();
        } else {
          // Activate focused element if menu is open
          this.activateFocusedElement();
        }
      }
    } else {
      this.controllerNavigation.buttonPressed.delete(0);
    }

    // Only process navigation when menu is open
    if (!this.isVisible) return;

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

    // D-pad navigation (for menu items)
    // D-pad can be buttons 12-15 or axes 6-7
    // Try buttons first (more reliable)
    let dpadX = 0;
    let dpadY = 0;
    
    // Check D-pad buttons (12-15: up, down, left, right)
    if (gamepad.buttons[12]?.pressed) dpadY = -1; // Up
    if (gamepad.buttons[13]?.pressed) dpadY = 1;  // Down
    if (gamepad.buttons[14]?.pressed) dpadX = -1; // Left
    if (gamepad.buttons[15]?.pressed) dpadX = 1;  // Right
    
    // Fallback to axes if buttons don't work (some controllers use axes 6-7)
    if (gamepad.axes && gamepad.axes.length >= 8) {
      const dpadAxisH = gamepad.axes[6] || 0;
      const dpadAxisV = gamepad.axes[7] || 0;
      if (Math.abs(dpadAxisH) > 0.5) dpadX = dpadAxisH > 0 ? 1 : -1;
      if (Math.abs(dpadAxisV) > 0.5) dpadY = dpadAxisV > 0 ? 1 : -1;
    }
    
    if (dpadX !== 0 || dpadY !== 0) {
      const direction = dpadY !== 0 
        ? (dpadY > 0 ? 'down' : 'up')
        : (dpadX > 0 ? 'right' : 'left');
      
      const dpadKey = `dpad-${direction}`;
      if (!this.controllerNavigation.buttonPressed.has(dpadKey)) {
        this.controllerNavigation.buttonPressed.add(dpadKey);
        this.handleJoystickNavigation(direction);
        // Prevent rapid navigation
        setTimeout(() => {
          this.controllerNavigation.buttonPressed.delete(dpadKey);
        }, 200);
      }
    } else {
      // Clear all D-pad keys when not pressed
      ['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right'].forEach(key => {
        this.controllerNavigation.buttonPressed.delete(key);
      });
    }

  }

  navigateTab(direction) {
    const tabIndex = this.tabs.findIndex(t => t.id === this.activeTab);
    let newIndex;
    
    if (direction === 'left') {
      newIndex = tabIndex - 1;
      if (newIndex < 0) return; // Stop at first tab, don't wrap
    } else {
      newIndex = tabIndex + 1;
      if (newIndex >= this.tabs.length) return; // Stop at last tab, don't wrap
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

    // Get bounding rectangle of current element
    const currentRect = focusableElements[currentIndex].getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;

    let bestElement = null;
    let bestDistance = Infinity;

    // Find the closest element in the specified direction
    for (let i = 0; i < focusableElements.length; i++) {
      if (i === currentIndex) continue;

      const rect = focusableElements[i].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let isInDirection = false;
      let distance = 0;

      switch (direction) {
        case 'down':
          // Element must be below (higher Y) and horizontally aligned
          isInDirection = centerY > currentCenterY && 
                         Math.abs(centerX - currentCenterX) < Math.max(rect.width, currentRect.width);
          if (isInDirection) {
            // Prefer closest vertically, then closest horizontally
            distance = (centerY - currentCenterY) + Math.abs(centerX - currentCenterX) * 0.1;
          }
          break;
        case 'up':
          // Element must be above (lower Y) and horizontally aligned
          isInDirection = centerY < currentCenterY && 
                         Math.abs(centerX - currentCenterX) < Math.max(rect.width, currentRect.width);
          if (isInDirection) {
            distance = (currentCenterY - centerY) + Math.abs(centerX - currentCenterX) * 0.1;
          }
          break;
        case 'right':
          // Element must be to the right (higher X) and vertically aligned
          isInDirection = centerX > currentCenterX && 
                         Math.abs(centerY - currentCenterY) < Math.max(rect.height, currentRect.height);
          if (isInDirection) {
            distance = (centerX - currentCenterX) + Math.abs(centerY - currentCenterY) * 0.1;
          }
          break;
        case 'left':
          // Element must be to the left (lower X) and vertically aligned
          isInDirection = centerX < currentCenterX && 
                         Math.abs(centerY - currentCenterY) < Math.max(rect.height, currentRect.height);
          if (isInDirection) {
            distance = (currentCenterX - centerX) + Math.abs(centerY - currentCenterY) * 0.1;
          }
          break;
      }

      if (isInDirection && distance < bestDistance) {
        bestDistance = distance;
        bestElement = focusableElements[i];
      }
    }

    // If no element found in that direction, stop (don't wrap)
    if (!bestElement) return;

    // Focus the best element
    bestElement.focus();
    this.highlightElement(bestElement);
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
    const wasVisible = this.isVisible;
    this.isVisible = !this.isVisible;
    this.overlay.setAttribute('aria-hidden', !this.isVisible);
    this.overlay.classList.toggle('is-visible', this.isVisible);
    
    // Controller polling runs continuously (started in setupControllerNavigation)
    // Only manage focus when opening menu
    if (this.isVisible) {
      // Switch to first tab when opening menu
      if (!wasVisible && this.tabs.length > 0) {
        this.switchTab(this.tabs[0].id);
      }
      
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

