/**
 * GameMenu.js
 * 
 * Unified professional game menu/overlay system
 * Consolidates all UI components into a single, toggleable menu
 */

import { isXboxController, checkXboxController, updateFooterContent, updateHeaderVisibility, updateBumperIcons } from './functions.js';
import { handleControllerInput, handleJoystickNavigation } from './navigation.js';
import { createXboxButtonElement } from '../XboxButton/helpers.js';

export class GameMenu {
  constructor(config) {
    this.isVisible = false;
    this.activeTab = 'multiplayer';
    
    // Store config
    this.config = config || {};
    this.inputManager = config.inputManager || null;
    
    // Controller navigation state
    this.controllerNavigation = {
      enabled: false,
      currentTabIndex: 0,
      currentSectionIndex: 0,
      buttonPressed: new Set()
    };
    
    // Sections tracking per tab
    this.tabSections = {};
    this.activeSection = {};
    
    // Xbox controller connection state
    this.isXboxControllerConnected = false;
    
    // Create menu structure
    this.createMenu();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up controller navigation
    this.setupControllerNavigation();
    
    // Set up Xbox controller detection
    this.setupXboxControllerDetection();
    
    // Initial check for Xbox controller
    this.checkXboxController();
    
    // Initial check for header visibility based on input mode
    this.updateHeaderVisibility();
  }

  createMenu() {
    // Main menu overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'game-menu ui__game-menu';
    this.overlay.setAttribute('aria-hidden', 'true');
    // Use inert attribute to prevent focus on hidden overlay
    this.overlay.setAttribute('inert', '');
    
    // Menu container
    this.container = document.createElement('div');
    this.container.className = 'game-menu__container ui__game-menu-container';
    
    // Menu header
    this.header = document.createElement('div');
    this.header.className = 'game-menu__header ui__game-menu-header';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'game-menu__close ui__game-menu-close';
    closeButton.innerHTML = '✕';
    closeButton.setAttribute('aria-label', 'Close menu');
    closeButton.addEventListener('click', () => this.toggle());
    this.header.appendChild(closeButton);
    
    this.container.appendChild(this.header);
    
    // Menu tabs
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'game-menu__tabs ui__game-menu-tabs';
    
    // LB icon (left of Settings)
    this.lbIcon = document.createElement('div');
    this.lbIcon.className = 'game-menu__bumper-icon game-menu__bumper-icon--lb ui__game-menu-icon';
    this.lbIcon.setAttribute('aria-label', 'Left Bumper');
    const lbButton = createXboxButtonElement('LB');
    if (lbButton) {
      this.lbIcon.appendChild(lbButton);
    }
    this.tabsContainer.appendChild(this.lbIcon);
    
    this.tabs = [
      { id: 'multiplayer', label: 'Multiplayer' },
      { id: 'settings', label: 'Settings' }
    ];
    
    this.tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = 'game-menu__tab ui__game-menu-tab';
      tabButton.dataset.tab = tab.id;
      tabButton.innerHTML = `<span class="game-menu__tab-label">${tab.label}</span>`;
      tabButton.addEventListener('click', () => this.switchTab(tab.id));
      this.tabsContainer.appendChild(tabButton);
    });
    
    // RB icon (right of Settings)
    this.rbIcon = document.createElement('div');
    this.rbIcon.className = 'game-menu__bumper-icon game-menu__bumper-icon--rb ui__game-menu-icon';
    this.rbIcon.setAttribute('aria-label', 'Right Bumper');
    const rbButton = createXboxButtonElement('RB');
    if (rbButton) {
      this.rbIcon.appendChild(rbButton);
    }
    this.tabsContainer.appendChild(this.rbIcon);
    
    this.container.appendChild(this.tabsContainer);
    
    // Sections navigation row (below tabs)
    this.sectionsContainer = document.createElement('div');
    this.sectionsContainer.className = 'game-menu__sections ui__game-menu-sections';
    
    // LT icon (left of sections)
    this.ltIcon = document.createElement('div');
    this.ltIcon.className = 'game-menu__trigger-icon game-menu__trigger-icon--lt ui__game-menu-icon';
    this.ltIcon.setAttribute('aria-label', 'Left Trigger');
    const ltButton = createXboxButtonElement('LT');
    if (ltButton) {
      this.ltIcon.appendChild(ltButton);
    }
    this.sectionsContainer.appendChild(this.ltIcon);
    
    this.sectionsList = document.createElement('div');
    this.sectionsList.className = 'game-menu__sections-list ui__game-menu-sections-list';
    this.sectionsContainer.appendChild(this.sectionsList);
    
    // RT icon (right of sections)
    this.rtIcon = document.createElement('div');
    this.rtIcon.className = 'game-menu__trigger-icon game-menu__trigger-icon--rt ui__game-menu-icon';
    this.rtIcon.setAttribute('aria-label', 'Right Trigger');
    const rtButton = createXboxButtonElement('RT');
    if (rtButton) {
      this.rtIcon.appendChild(rtButton);
    }
    // Prevent clicks from triggering shooting
    this.rtIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.rtIcon.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.rtIcon.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.sectionsContainer.appendChild(this.rtIcon);
    
    // Initially hidden, shown when tab has sections
    this.sectionsContainer.style.display = 'none';
    this.container.appendChild(this.sectionsContainer);
    
    // Menu content area
    this.content = document.createElement('div');
    this.content.className = 'game-menu__content ui__game-menu-content';
    
    // Create tab panels
    this.panels = {};
    this.tabs.forEach(tab => {
      const panel = document.createElement('div');
      panel.className = 'game-menu__panel ui__game-menu-panel';
      panel.dataset.panel = tab.id;
      const isActive = tab.id === 'multiplayer';
      panel.setAttribute('aria-hidden', !isActive);
      // Use inert attribute to prevent focus on hidden panels
      if (!isActive) {
        panel.setAttribute('inert', '');
      }
      this.content.appendChild(panel);
      this.panels[tab.id] = panel;
      
      // Initialize sections array for each tab
      if (!this.tabSections[tab.id]) {
        this.tabSections[tab.id] = [];
      }
    });
    
    this.container.appendChild(this.content);
    
    // Menu footer for commands
    this.footer = document.createElement('div');
    this.footer.className = 'game-menu__footer ui__game-menu-footer';
    
    // Create footer content based on input mode
    this.updateFooterContent();
    
    this.container.appendChild(this.footer);
    
    this.overlay.appendChild(this.container);
    
    // Append to root element if provided, otherwise to body
    const root = document.getElementById('game-menu-root') || document.body;
    root.appendChild(this.overlay);
  }
  
  updateFooterContent() {
    updateFooterContent(this.footer, this.inputManager);
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
    const handleSelectInteraction = (e) => {
      const target = e.target;
      if (target.tagName === 'SELECT' && this.overlay.contains(target) && !this.isVisible) {
        e.preventDefault();
        e.stopPropagation();
        this.show();
        setTimeout(() => {
          target.focus();
          this.highlightElement(target);
        }, 100);
      }
    };
    
    document.addEventListener('mousedown', handleSelectInteraction, true);
    document.addEventListener('focus', handleSelectInteraction, true);
  }

  setupControllerNavigation() {
    this.controllerPollInterval = null;
    this.startControllerPolling();
  }

  _isXboxController(gamepad) {
    return isXboxController(gamepad);
  }

  checkXboxController() {
    checkXboxController(this.inputManager, this);
  }

  setupXboxControllerDetection() {
    window.addEventListener('gamepadconnected', () => {
      setTimeout(() => this.checkXboxController(), 100);
    });
    
    window.addEventListener('gamepaddisconnected', () => {
      setTimeout(() => this.checkXboxController(), 100);
    });
    
    this.controllerCheckInterval = setInterval(() => {
      this.checkXboxController();
      this.updateHeaderVisibility();
    }, 1000);
  }

  updateHeaderVisibility() {
    updateHeaderVisibility(this.header, this.inputManager);
  }

  updateBumperIcons() {
    updateBumperIcons(this);
  }

  startControllerPolling() {
    if (this.controllerPollInterval) return;
    
    this.controllerPollInterval = setInterval(() => {
      this.handleControllerInput();
    }, 50);
  }

  stopControllerPolling() {
    if (this.controllerPollInterval) {
      clearInterval(this.controllerPollInterval);
      this.controllerPollInterval = null;
    }
    this.controllerNavigation.buttonPressed.clear();
  }

  handleControllerInput() {
    handleControllerInput(this);
  }

  navigateTab(direction) {
    const tabIndex = this.tabs.findIndex(t => t.id === this.activeTab);
    let newIndex;
    
    if (direction === 'left') {
      newIndex = (tabIndex - 1 + this.tabs.length) % this.tabs.length;
    } else {
      newIndex = (tabIndex + 1) % this.tabs.length;
    }
    
    this.switchTab(this.tabs[newIndex].id);
  }

  navigateNextTab() {
    this.navigateTab('right');
  }

  navigateSection(direction) {
    const sections = this.tabSections[this.activeTab];
    if (!sections || sections.length === 0) return;
    
    const currentSectionId = this.activeSection[this.activeTab] || sections[0].id;
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    
    if (currentIndex === -1) {
      this.switchSection(sections[0].id);
      return;
    }
    
    let newIndex;
    if (direction === 'left') {
      newIndex = (currentIndex - 1 + sections.length) % sections.length;
    } else {
      newIndex = (currentIndex + 1) % sections.length;
    }
    
    this.switchSection(sections[newIndex].id);
  }

  handleJoystickNavigation(direction) {
    handleJoystickNavigation(direction, this);
  }

  getFocusableElements() {
    const panel = this.getCurrentPanel();
    if (!panel) return [];

    const sections = this.tabSections[this.activeTab];
    let searchContainer = panel;
    
    if (sections && sections.length > 0) {
      const activeSectionId = this.activeSection[this.activeTab];
      if (activeSectionId) {
        const activeSection = sections.find(s => s.id === activeSectionId);
        if (activeSection && activeSection.element) {
          searchContainer = activeSection.element;
        }
      }
    }

    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(searchContainer.querySelectorAll(selectors)).filter(el => {
      return !el.disabled && 
             el.offsetWidth > 0 && 
             el.offsetHeight > 0 &&
             window.getComputedStyle(el).visibility !== 'hidden';
    });
  }

  highlightElement(element) {
    const sections = this.tabSections[this.activeTab];
    let searchContainer = this.getCurrentPanel();
    
    if (sections && sections.length > 0) {
      const activeSectionId = this.activeSection[this.activeTab];
      if (activeSectionId) {
        const activeSection = sections.find(s => s.id === activeSectionId);
        if (activeSection && activeSection.element) {
          searchContainer = activeSection.element;
        }
      }
    }
    
    const prevHighlighted = searchContainer?.querySelector('.game-menu__focused');
    if (prevHighlighted) {
      prevHighlighted.classList.remove('game-menu__focused');
    }

    if (element) {
      element.classList.add('game-menu__focused');
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  activateFocusedElement() {
    const focused = document.activeElement;
    if (!focused) {
      const focusable = this.getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
        this.highlightElement(focusable[0]);
      }
      return;
    }

    if (focused.tagName === 'BUTTON') {
      focused.click();
    } else if (focused.tagName === 'SELECT' || focused.tagName === 'INPUT') {
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
    
    // Remove focus from any element in panels that will be hidden
    Object.entries(this.panels).forEach(([id, panel]) => {
      if (id !== tabId) {
        const focusedElement = panel.querySelector(':focus');
        if (focusedElement) {
          focusedElement.blur();
        }
        // Also remove the focused class
        const focused = panel.querySelector('.game-menu__focused');
        if (focused) {
          focused.classList.remove('game-menu__focused');
        }
      }
    });
    
    this.activeTab = tabId;
    this.controllerNavigation.currentTabIndex = this.tabs.findIndex(t => t.id === tabId);
    this.controllerNavigation.currentSectionIndex = 0;
    
    this.tabsContainer.querySelectorAll('.game-menu__tab').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabId);
    });
    
    Object.entries(this.panels).forEach(([id, panel]) => {
      const isActive = id === tabId;
      panel.setAttribute('aria-hidden', !isActive);
      // Use inert attribute to prevent focus on hidden panels
      if (isActive) {
        panel.removeAttribute('inert');
      } else {
        panel.setAttribute('inert', '');
      }
      panel.classList.toggle('is-active', isActive);
    });
    
    this.updateSectionsNavigation();
    
    const sections = this.tabSections[tabId];
    if (sections && sections.length > 0) {
      const firstSectionId = sections[0].id;
      this.switchSection(firstSectionId);
    } else {
      this.activeSection[tabId] = null;
    }
    
    // Move focus to first focusable element in the newly active panel
    setTimeout(() => {
      const focusable = this.getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
        this.highlightElement(focusable[0]);
      }
    }, 0);
  }

  switchSection(sectionId) {
    const sections = this.tabSections[this.activeTab];
    if (!sections) return;
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    this.activeSection[this.activeTab] = sectionId;
    
    sections.forEach(s => {
      s.element.style.display = s.id === sectionId ? 'block' : 'none';
    });
    
    this.sectionsList.querySelectorAll('.game-menu__section-button').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.section === sectionId);
    });
    
    const index = sections.findIndex(s => s.id === sectionId);
    if (index !== -1) {
      this.controllerNavigation.currentSectionIndex = index;
    }
  }

  updateSectionsNavigation() {
    const sections = this.tabSections[this.activeTab];
    
    this.sectionsList.innerHTML = '';
    
    if (!sections || sections.length === 0) {
      this.sectionsContainer.style.display = 'none';
      return;
    }
    
    this.sectionsContainer.style.display = 'flex';
    
    sections.forEach(section => {
      const button = document.createElement('button');
      button.className = 'game-menu__section-button ui__game-menu-section-button';
      button.dataset.section = section.id;
      button.textContent = section.title;
      button.addEventListener('click', () => this.switchSection(section.id));
      
      const isActive = this.activeSection[this.activeTab] === section.id;
      button.classList.toggle('is-active', isActive);
      
      this.sectionsList.appendChild(button);
    });
  }

  toggle() {
    const wasVisible = this.isVisible;
    this.isVisible = !this.isVisible;
    this.overlay.setAttribute('aria-hidden', !this.isVisible);
    // Use inert attribute to prevent focus on hidden overlay
    if (this.isVisible) {
      this.overlay.removeAttribute('inert');
    } else {
      this.overlay.setAttribute('inert', '');
    }
    this.overlay.classList.toggle('is-visible', this.isVisible);
    
    this.updateHeaderVisibility();
    
    if (this.isVisible) {
      if (!wasVisible && this.tabs.length > 0) {
        this.switchTab(this.tabs[0].id);
      }
      
      const sections = this.tabSections[this.activeTab];
      if (sections && sections.length > 0 && !this.activeSection[this.activeTab]) {
        this.switchSection(sections[0].id);
      }
      
      setTimeout(() => {
        const focusable = this.getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
          this.highlightElement(focusable[0]);
        }
      }, 100);
      this.controllerNavigation.currentSectionIndex = 0;
      
      if (this.config.onMenuOpen) {
        this.config.onMenuOpen();
      }
    } else {
      // Remove focus from all panels when hiding menu
      Object.values(this.panels).forEach(panel => {
        const focusedElement = panel.querySelector(':focus');
        if (focusedElement) {
          focusedElement.blur();
        }
        const focused = panel.querySelector('.game-menu__focused');
        if (focused) {
          focused.classList.remove('game-menu__focused');
        }
      });
      
      const highlighted = document.querySelector('.game-menu__focused');
      if (highlighted) {
        highlighted.classList.remove('game-menu__focused');
      }
      
      if (this.config.onMenuClose) {
        this.config.onMenuClose();
      }
    }
    
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

  addSection(tabId, sectionConfig) {
    if (!this.panels[tabId]) {
      console.warn(`Tab ${tabId} does not exist`);
      return null;
    }
    
    if (!this.tabSections[tabId]) {
      this.tabSections[tabId] = [];
    }
    
    const sectionId = sectionConfig.className 
      ? sectionConfig.className.replace('game-menu__section--', '')
      : (sectionConfig.title || `section-${this.tabSections[tabId].length}`).toLowerCase().replace(/\s+/g, '-');
    
    const section = document.createElement('div');
    section.className = 'game-menu__section ui__game-menu-section';
    section.dataset.section = sectionId;
    if (sectionConfig.className) {
      section.classList.add(sectionConfig.className);
    }
    
    
    const content = document.createElement('div');
    content.className = 'game-menu__section-content ui__game-menu-section-content';
    
    if (sectionConfig.content) {
      if (typeof sectionConfig.content === 'string') {
        content.innerHTML = sectionConfig.content;
      } else if (sectionConfig.content instanceof HTMLElement) {
        content.appendChild(sectionConfig.content);
      }
    }
    
    section.appendChild(content);
    
    section.style.display = 'none';
    
    this.panels[tabId].appendChild(section);
    
    this.tabSections[tabId].push({
      id: sectionId,
      title: sectionConfig.title || sectionId,
      element: section
    });
    
    if (this.tabSections[tabId].length === 1 && this.activeTab === tabId) {
      this.activeSection[tabId] = sectionId;
      section.style.display = 'block';
    }
    
    if (this.activeTab === tabId) {
      this.updateSectionsNavigation();
    }
    
    return section;
  }

  removeSection(tabId, sectionElement) {
    if (sectionElement && sectionElement.parentNode) {
      sectionElement.parentNode.removeChild(sectionElement);
    }
  }

  clearSection(tabId) {
    if (this.panels[tabId]) {
      this.panels[tabId].innerHTML = '';
    }
  }

  getPanel(tabId) {
    return this.panels[tabId];
  }

  getSection(tabId, className) {
    if (!this.panels[tabId]) return null;
    return this.panels[tabId].querySelector(`.game-menu__section.${className}`);
  }

  destroy() {
    if (this.controllerCheckInterval) {
      clearInterval(this.controllerCheckInterval);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

