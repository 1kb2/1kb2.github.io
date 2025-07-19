// Windows XP Portfolio - Static Frontend Version

// Global state
let windows = {};
let nextZIndex = 100;
let activeWindowId = null;
let startMenuOpen = false;
let selectedIcon = null;
let paperclipVisible = true;

// Portfolio data
const portfolioData = {
  about: {
    title: "About Me - Portfolio",
    content: `
      <div class="xp-portfolio-section">
        <h2>About Me</h2>
        <p>Welcome to my retro Windows XP portfolio! I'm a passionate developer with expertise in:</p>
        <ul>
          <li><strong>Frontend Development:</strong> React, TypeScript, HTML5, CSS3</li>
          <li><strong>Backend Development:</strong> Node.js, Express, Python</li>
          <li><strong>Databases:</strong> PostgreSQL, MongoDB</li>
          <li><strong>Cybersecurity:</strong> CTF competitions, penetration testing</li>
          <li><strong>DevOps:</strong> Docker, CI/CD, Cloud platforms</li>
        </ul>
        <h3>Experience</h3>
        <p>With several years of experience in software development and cybersecurity, I enjoy creating innovative solutions and participating in security challenges.</p>
        <h3>Interests</h3>
        <p>Beyond coding, I'm passionate about retro computing, game development, and contributing to open-source projects.</p>
      </div>
    `
  },
  projects: {
    title: "Projects - Portfolio",
    content: `
      <div class="xp-portfolio-section">
        <h2>Featured Projects</h2>
        <div class="xp-projects-grid">
          <div class="xp-project-card">
            <h3>Windows XP Portfolio</h3>
            <p><strong>Tech Stack:</strong> React, TypeScript, CSS3</p>
            <p>Interactive Windows XP-themed portfolio with authentic retro styling, draggable windows, and animated assistant.</p>
          </div>
          <div class="xp-project-card">
            <h3>E-Commerce Platform</h3>
            <p><strong>Tech Stack:</strong> Node.js, PostgreSQL, React</p>
            <p>Full-stack e-commerce solution with user authentication, payment processing, and admin dashboard.</p>
          </div>
          <div class="xp-project-card">
            <h3>Security Scanner Tool</h3>
            <p><strong>Tech Stack:</strong> Python, Flask, SQLAlchemy</p>
            <p>Automated vulnerability scanner for web applications with detailed reporting and remediation suggestions.</p>
          </div>
          <div class="xp-project-card">
            <h3>Real-time Chat App</h3>
            <p><strong>Tech Stack:</strong> Socket.io, Express, MongoDB</p>
            <p>Multi-room chat application with real-time messaging, file sharing, and user presence indicators.</p>
          </div>
        </div>
      </div>
    `
  },
  ctf: {
    title: "CTF Writeups - Portfolio",
    content: `
      <div class="xp-portfolio-section">
        <h2>CTF Writeups & Security Research</h2>
        <div class="xp-project-card">
          <h3>HackTheBox - Machine: Legacy</h3>
          <p><strong>Difficulty:</strong> Easy | <strong>Points:</strong> 20</p>
          <p>Exploited MS08-067 vulnerability in Windows XP system. Used Metasploit to gain initial access and escalated privileges through token impersonation.</p>
          <p><strong>Tools Used:</strong> Nmap, Metasploit, Meterpreter</p>
        </div>
        <div class="xp-project-card">
          <h3>PicoCTF - Web Exploitation</h3>
          <p><strong>Challenge:</strong> SQL Injection | <strong>Points:</strong> 150</p>
          <p>Identified and exploited blind SQL injection vulnerability to extract sensitive database information using time-based techniques.</p>
          <p><strong>Tools Used:</strong> Burp Suite, SQLMap, Python</p>
        </div>
        <div class="xp-project-card">
          <h3>TryHackMe - Blue Room</h3>
          <p><strong>Topic:</strong> Windows Exploitation | <strong>Difficulty:</strong> Easy</p>
          <p>Comprehensive walkthrough of EternalBlue exploit (MS17-010) with post-exploitation techniques and defense strategies.</p>
          <p><strong>Tools Used:</strong> Nmap, Metasploit, Mimikatz</p>
        </div>
      </div>
    `
  },
  experience: {
    title: "Experience - Portfolio",
    content: `
      <div class="xp-portfolio-section">
        <h2>Professional Experience</h2>
        <div class="xp-experience-item">
          <h3>Senior Full Stack Developer</h3>
          <div class="xp-experience-date">2022 - Present | TechCorp Solutions</div>
          <p>Lead development of enterprise web applications using React and Node.js. Mentored junior developers and implemented CI/CD pipelines that reduced deployment time by 60%.</p>
        </div>
        <div class="xp-experience-item">
          <h3>Cybersecurity Analyst</h3>
          <div class="xp-experience-date">2020 - 2022 | SecureNet Inc.</div>
          <p>Conducted penetration testing and vulnerability assessments for Fortune 500 clients. Discovered and reported 50+ security vulnerabilities with 95% fix rate.</p>
        </div>
        <div class="xp-experience-item">
          <h3>Software Developer</h3>
          <div class="xp-experience-date">2018 - 2020 | StartupTech</div>
          <p>Developed and maintained full-stack applications using Python/Django and React. Collaborated with cross-functional teams to deliver features on tight deadlines.</p>
        </div>
        <div class="xp-experience-item">
          <h3>Junior Developer Intern</h3>
          <div class="xp-experience-date">2017 - 2018 | CodeCraft Studios</div>
          <p>Gained hands-on experience in web development, database design, and agile methodologies. Contributed to multiple client projects and learned industry best practices.</p>
        </div>
      </div>
    `
  },
  explorer: {
    title: "Portfolio Explorer",
    content: `
      <div class="xp-file-explorer">
        <div class="xp-explorer-toolbar">
          <button class="xp-explorer-button">Back</button>
          <button class="xp-explorer-button">Forward</button>
          <button class="xp-explorer-button">Up</button>
          <button class="xp-explorer-button">Refresh</button>
        </div>
        <div class="xp-explorer-content">
          <div class="xp-explorer-sidebar">
            <div class="xp-tree-item">📁 Portfolio</div>
            <div class="xp-tree-item" style="padding-left: 20px;">📄 About Me</div>
            <div class="xp-tree-item" style="padding-left: 20px;">📁 Projects</div>
            <div class="xp-tree-item" style="padding-left: 20px;">🔐 CTF Writeups</div>
            <div class="xp-tree-item" style="padding-left: 20px;">💼 Experience</div>
            <div class="xp-tree-item" style="padding-left: 20px;">📧 Contact</div>
          </div>
          <div class="xp-explorer-main">
            <h3>Portfolio File Explorer</h3>
            <p>Navigate through the portfolio sections using the sidebar or double-click the desktop icons.</p>
            <br>
            <p><strong>Available Sections:</strong></p>
            <ul>
              <li>About Me - Personal information and skills</li>
              <li>Projects - Featured development work</li>
              <li>CTF Writeups - Security challenge solutions</li>
              <li>Experience - Professional background</li>
            </ul>
            <br>
            <p>Use the toolbar buttons to navigate or refresh the current view.</p>
          </div>
        </div>
      </div>
    `
  }
};

// Paperclip messages
const paperclipMessages = [
  "Hi! I'm Starry, your file navigation assistant. Need help opening files?",
  "Double-click the About Me icon to learn more about the developer!",
  "Try opening the Projects folder to see coding work and demos.",
  "The CTF Writeups file contains cybersecurity challenge solutions.",
  "Open the Experience document to view professional background.",
  "The File Explorer shows all available portfolio sections.",
  "Click any desktop icon twice quickly to open that file or folder.",
  "Each icon represents a different section of content to explore.",
  "Want to see technical skills? Open the About Me file first.",
  "The Projects folder has interactive demos and code samples.",
  "CTF Writeups contains detailed security analysis and solutions.",
  "Experience file shows work history and professional achievements.",
  "File Explorer lets you browse through all portfolio content.",
  "Try opening multiple files at once - they'll appear as separate windows.",
  "Each file contains unique content worth exploring in detail.",
  "Pro tip: You can have several files open simultaneously for easy comparison.",
  "My 12 points represent different file types you can open here!",
  "I'm here to help you navigate and access all the portfolio files!"
];

// Utility functions
function generateId() {
  return 'window_' + Math.random().toString(36).substr(2, 9);
}

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('clock').textContent = timeString;
}

function createDesktopIcons() {
  const iconConfigs = {
    about: { color: '#4096FF', type: 'about' },
    projects: { color: '#FF6C94', type: 'projects' },
    ctf: { color: '#FF4444', type: 'ctf' },
    experience: { color: '#00BC48', type: 'experience' },
    explorer: { color: '#FFC433', type: 'explorer' }
  };

  Object.keys(iconConfigs).forEach(iconId => {
    const iconEl = document.querySelector(`[data-icon="${iconId}"]`);
    if (iconEl) {
      iconEl.innerHTML = getDesktopIconSVG(iconConfigs[iconId].color, iconConfigs[iconId].type);
    }
  });
}

function getDesktopIconSVG(color, iconType) {
  let iconContent = '';
  
  switch(iconType) {
    case 'about':
      iconContent = `
        <rect x="12" y="8" width="8" height="8" fill="#ffdbac" stroke="#000" stroke-width="0.5"/>
        <rect x="14" y="10" width="2" height="2" fill="#000"/>
        <rect x="18" y="10" width="2" height="2" fill="#000"/>
        <rect x="15" y="13" width="2" height="2" fill="#000"/>
        <rect x="10" y="18" width="12" height="10" fill="#0000ff" stroke="#000" stroke-width="0.5"/>
        <rect x="12" y="20" width="8" height="2" fill="#fff"/>
      `;
      break;
    case 'projects':
      iconContent = `
        <rect x="4" y="8" width="24" height="16" fill="#c0c0c0" stroke="#000" stroke-width="0.5"/>
        <rect x="6" y="10" width="20" height="2" fill="#000080"/>
        <rect x="6" y="14" width="16" height="1" fill="#000"/>
        <rect x="6" y="16" width="12" height="1" fill="#000"/>
        <rect x="6" y="18" width="14" height="1" fill="#000"/>
        <rect x="6" y="20" width="10" height="1" fill="#000"/>
      `;
      break;
    case 'ctf':
      iconContent = `
        <rect x="6" y="8" width="20" height="16" fill="#800000" stroke="#000" stroke-width="0.5"/>
        <rect x="12" y="12" width="8" height="8" fill="#ffff00" stroke="#000" stroke-width="0.5"/>
        <rect x="14" y="14" width="4" height="4" fill="#000"/>
        <rect x="15" y="15" width="2" height="2" fill="#ff0000"/>
        <rect x="8" y="6" width="2" height="4" fill="#008000"/>
        <rect x="22" y="6" width="2" height="4" fill="#008000"/>
      `;
      break;
    case 'experience':
      iconContent = `
        <rect x="6" y="8" width="20" height="16" fill="#ffffff" stroke="#000" stroke-width="0.5"/>
        <rect x="8" y="4" width="16" height="8" fill="#800000" stroke="#000" stroke-width="0.5"/>
        <rect x="10" y="6" width="12" height="2" fill="#ffff00"/>
        <rect x="8" y="12" width="16" height="1" fill="#000"/>
        <rect x="8" y="14" width="12" height="1" fill="#000"/>
        <rect x="8" y="16" width="14" height="1" fill="#000"/>
        <rect x="8" y="18" width="10" height="1" fill="#000"/>
      `;
      break;
    case 'explorer':
      iconContent = `
        <rect x="4" y="12" width="24" height="12" fill="#ffff00" stroke="#000" stroke-width="0.5"/>
        <rect x="4" y="10" width="12" height="4" fill="#008000" stroke="#000" stroke-width="0.5"/>
        <rect x="6" y="16" width="4" height="2" fill="#0000ff"/>
        <rect x="12" y="16" width="4" height="2" fill="#0000ff"/>
        <rect x="18" y="16" width="4" height="2" fill="#0000ff"/>
        <rect x="6" y="20" width="4" height="2" fill="#ff0000"/>
        <rect x="12" y="20" width="4" height="2" fill="#ff0000"/>
      `;
      break;
    default:
      iconContent = `<rect x="8" y="8" width="16" height="16" fill="#c0c0c0" stroke="#000" stroke-width="0.5"/>`;
  }

  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated;">
    <defs>
      <filter id="retro-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="0" flood-opacity="0.8" flood-color="#000"/>
      </filter>
    </defs>
    <rect width="30" height="30" x="1" y="1" fill="${color}" rx="0" stroke="#000" stroke-width="1" filter="url(#retro-shadow)"/>
    <rect width="28" height="2" x="2" y="2" fill="#fff" fill-opacity="0.8"/>
    <rect width="2" height="28" x="2" y="2" fill="#fff" fill-opacity="0.8"/>
    <rect width="28" height="2" x="2" y="29" fill="#000" fill-opacity="0.3"/>
    <rect width="2" height="28" x="29" y="2" fill="#000" fill-opacity="0.3"/>
    ${iconContent}
  </svg>`;
}

function createWindow(windowId) {
  if (windows[windowId]) {
    activateWindow(windowId);
    return;
  }

  const data = portfolioData[windowId];
  if (!data) return;

  const id = generateId();
  const windowEl = document.createElement('div');
  windowEl.className = 'xp-window active';
  windowEl.id = id;
  windowEl.style.left = Math.random() * 300 + 100 + 'px';
  windowEl.style.top = Math.random() * 200 + 50 + 'px';
  windowEl.style.width = '500px';
  windowEl.style.height = '400px';
  windowEl.style.zIndex = ++nextZIndex;

  windowEl.innerHTML = `
    <div class="xp-window-header">
      <div class="xp-window-title">${data.title}</div>
      <div class="xp-window-controls">
        <button class="xp-window-control minimize">_</button>
        <button class="xp-window-control maximize">□</button>
        <button class="xp-window-control close">×</button>
      </div>
    </div>
    <div class="xp-window-content">${data.content}</div>
  `;

  document.getElementById('windows-container').appendChild(windowEl);

  windows[id] = {
    id: id,
    windowId: windowId,
    title: data.title,
    element: windowEl,
    isMinimized: false,
    isMaximized: false,
    isActive: true,
    originalSize: { width: 500, height: 400 },
    originalPosition: { x: parseInt(windowEl.style.left), y: parseInt(windowEl.style.top) }
  };

  activeWindowId = id;
  updateTaskbar();
  setupWindowEvents(id);
}

function setupWindowEvents(windowId) {
  const windowObj = windows[windowId];
  const windowEl = windowObj.element;
  const header = windowEl.querySelector('.xp-window-header');
  const closeBtn = windowEl.querySelector('.close');
  const minimizeBtn = windowEl.querySelector('.minimize');
  const maximizeBtn = windowEl.querySelector('.maximize');

  // Window dragging
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.xp-window-controls')) return;
    
    isDragging = true;
    dragOffset.x = e.clientX - windowEl.offsetLeft;
    dragOffset.y = e.clientY - windowEl.offsetTop;
    activateWindow(windowId);
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  function handleDrag(e) {
    if (!isDragging || windowObj.isMaximized) return;
    
    windowEl.style.left = (e.clientX - dragOffset.x) + 'px';
    windowEl.style.top = Math.max(0, e.clientY - dragOffset.y) + 'px';
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  // Window controls
  closeBtn.addEventListener('click', () => closeWindow(windowId));
  minimizeBtn.addEventListener('click', () => minimizeWindow(windowId));
  maximizeBtn.addEventListener('click', () => maximizeWindow(windowId));

  // Window activation
  windowEl.addEventListener('mousedown', () => activateWindow(windowId));
}

function activateWindow(windowId) {
  // Deactivate all windows
  Object.values(windows).forEach(win => {
    win.element.classList.remove('active');
    win.element.querySelector('.xp-window-header').classList.add('inactive');
    win.element.querySelector('.xp-window-title').classList.add('inactive');
    win.isActive = false;
  });

  // Activate target window
  if (windows[windowId]) {
    const windowObj = windows[windowId];
    windowObj.element.classList.add('active');
    windowObj.element.querySelector('.xp-window-header').classList.remove('inactive');
    windowObj.element.querySelector('.xp-window-title').classList.remove('inactive');
    windowObj.element.style.zIndex = ++nextZIndex;
    windowObj.isActive = true;
    windowObj.isMinimized = false;
    windowObj.element.style.display = 'block';
    activeWindowId = windowId;
    updateTaskbar();
  }
}

function closeWindow(windowId) {
  if (windows[windowId]) {
    windows[windowId].element.remove();
    delete windows[windowId];
    updateTaskbar();
  }
}

function minimizeWindow(windowId) {
  if (windows[windowId]) {
    windows[windowId].element.style.display = 'none';
    windows[windowId].isMinimized = true;
    windows[windowId].isActive = false;
    updateTaskbar();
  }
}

function maximizeWindow(windowId) {
  const windowObj = windows[windowId];
  if (!windowObj) return;

  if (windowObj.isMaximized) {
    // Restore
    windowObj.element.style.width = windowObj.originalSize.width + 'px';
    windowObj.element.style.height = windowObj.originalSize.height + 'px';
    windowObj.element.style.left = windowObj.originalPosition.x + 'px';
    windowObj.element.style.top = windowObj.originalPosition.y + 'px';
    windowObj.element.classList.remove('maximized');
    windowObj.isMaximized = false;
  } else {
    // Maximize
    windowObj.originalSize = { 
      width: parseInt(windowObj.element.style.width), 
      height: parseInt(windowObj.element.style.height) 
    };
    windowObj.originalPosition = { 
      x: parseInt(windowObj.element.style.left), 
      y: parseInt(windowObj.element.style.top) 
    };
    windowObj.element.classList.add('maximized');
    windowObj.isMaximized = true;
  }
}

function updateTaskbar() {
  const taskbarButtons = document.getElementById('taskbar-buttons');
  taskbarButtons.innerHTML = '';

  Object.values(windows).forEach(windowObj => {
    const button = document.createElement('button');
    button.className = 'xp-taskbar-button' + (windowObj.isActive ? ' active' : '');
    button.textContent = windowObj.title;
    button.addEventListener('click', () => {
      if (windowObj.isMinimized) {
        activateWindow(windowObj.id);
      } else if (windowObj.isActive) {
        minimizeWindow(windowObj.id);
      } else {
        activateWindow(windowObj.id);
      }
    });
    taskbarButtons.appendChild(button);
  });
}

// Paperclip assistant
let currentMessageIndex = 0;
let paperclipAnimating = false;

function updatePaperclipMessage() {
  const messageEl = document.getElementById('paperclip-message');
  if (messageEl && paperclipVisible) {
    messageEl.textContent = paperclipMessages[currentMessageIndex];
    currentMessageIndex = (currentMessageIndex + 1) % paperclipMessages.length;
  }
}

function animatePaperclip() {
  if (!paperclipVisible) return;
  
  const characterEl = document.getElementById('paperclip-character');
  const animations = ['bounce', 'wiggle', 'spin', 'wave', 'blink'];
  const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
  
  characterEl.className = 'xp-paperclip-character ' + randomAnimation;
  paperclipAnimating = true;
  
  setTimeout(() => {
    characterEl.className = 'xp-paperclip-character';
    paperclipAnimating = false;
  }, 1000);
}

function hidePaperclip() {
  document.getElementById('paperclip').style.display = 'none';
  paperclipVisible = false;
  
  // Return after 30 seconds
  setTimeout(() => {
    document.getElementById('paperclip').style.display = 'block';
    paperclipVisible = true;
    currentMessageIndex = Math.floor(Math.random() * paperclipMessages.length);
    updatePaperclipMessage();
  }, 30000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  createDesktopIcons();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updatePaperclipMessage, 8000);
  setInterval(animatePaperclip, 12000);

  // Desktop icons
  document.querySelectorAll('.xp-desktop-icon').forEach(icon => {
    icon.addEventListener('dblclick', (e) => {
      e.preventDefault();
      const windowId = icon.dataset.window;
      createWindow(windowId);
    });

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      // Deselect all icons
      document.querySelectorAll('.xp-desktop-icon').forEach(i => i.classList.remove('selected'));
      // Select this icon
      icon.classList.add('selected');
      selectedIcon = icon.dataset.window;
    });
  });

  // Desktop click
  document.getElementById('desktop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.querySelectorAll('.xp-desktop-icon').forEach(i => i.classList.remove('selected'));
      selectedIcon = null;
    }
  });

  // Start button
  document.getElementById('start-button').addEventListener('click', (e) => {
    e.stopPropagation();
    startMenuOpen = !startMenuOpen;
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    if (startMenuOpen) {
      startMenu.style.display = 'block';
      startButton.classList.add('active');
    } else {
      startMenu.style.display = 'none';
      startButton.classList.remove('active');
    }
  });

  // Start menu items
  document.querySelectorAll('.xp-start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const windowId = item.dataset.window;
      createWindow(windowId);
      
      // Close start menu
      document.getElementById('start-menu').style.display = 'none';
      document.getElementById('start-button').classList.remove('active');
      startMenuOpen = false;
    });
  });

  // Close start menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.xp-start-menu') && !e.target.closest('.xp-start-button')) {
      document.getElementById('start-menu').style.display = 'none';
      document.getElementById('start-button').classList.remove('active');
      startMenuOpen = false;
    }
  });

  // Context menu
  document.getElementById('desktop').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
  });

  document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
  });

  // Paperclip close button
  document.getElementById('paperclip-close').addEventListener('click', hidePaperclip);

  // Initial paperclip message
  updatePaperclipMessage();
});