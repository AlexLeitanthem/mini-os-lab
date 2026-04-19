// WHY: Utility functions used throughout the mini OS simulation
// CONTEXT: Core helper functions for path manipulation, formatting, and common operations

/**
 * Utility functions for Mini OS
 */
const Utils = {
  /**
   * Generate a unique ID
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} Unique ID
   */
  generateId(prefix = '') {
    return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate numeric PID (process ID)
   * @returns {number} Unique numeric ID
   */
  generatePid() {
    return Math.floor(Math.random() * 9000) + 1000;
  },

  /**
   * Simple hash function for strings (for password simulation)
   * @param {string} str - String to hash
   * @returns {string} Hashed string
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  },

  /**
   * Resolve a path relative to a base path
   * @param {string} path - Path to resolve
   * @param {string} cwd - Current working directory
   * @returns {string} Resolved absolute path
   */
  resolvePath(path, cwd) {
    if (!path) return cwd;
    
    let resolvedPath = path.startsWith('/') ? path : `${cwd}/${path}`;
    
    // Normalize path
    const parts = resolvedPath.split('/').filter(p => p !== '');
    const normalized = [];
    
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        normalized.pop();
      } else {
        normalized.push(part);
      }
    }
    
    return '/' + normalized.join('/');
  },

  /**
   * Get parent directory and basename from a path
   * @param {string} path - Full path
   * @returns {{parent: string, name: string}} Parent path and entry name
   */
  splitPath(path) {
    const normalized = this.resolvePath(path, '/');
    const parts = normalized.split('/').filter(p => p !== '');
    const name = parts.pop() || '/';
    const parent = '/' + parts.join('/');
    return { parent: parent === '/' ? '/' : parent, name };
  },

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Size in bytes
   * @param {boolean} human - Whether to use human-readable format
   * @returns {string} Formatted size
   */
  formatBytes(bytes, human = false) {
    if (bytes === 0) return human ? '0 B' : '0';
    if (!human) return bytes.toString();
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  },

  /**
   * Format milliseconds to time string
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const s = seconds % 60;
    const m = minutes % 60;
    const h = hours;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  /**
   * Get current date/time formatted
   * @returns {string} Formatted date/time
   */
  getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString();
  },

  /**
   * Parse command line with operators (> >> |)
   * @param {string} input - Command line input
   * @returns {{commands: Array<{cmd: string, args: string[]}>, redirects: Array<{type: string, target: string}>}}
   */
  parseCommandLine(input) {
    const result = {
      commands: [],
      redirects: []
    };
    
    // Split by pipe, handling redirects
    const parts = input.split('|').map(p => p.trim()).filter(p => p);
    
    for (let part of parts) {
      // Handle redirects
      let redirect = null;
      
      if (part.includes('>>')) {
        const idx = part.indexOf('>>');
        redirect = { type: 'append', target: part.substring(idx + 2).trim() };
        part = part.substring(0, idx).trim();
      } else if (part.includes('>')) {
        const idx = part.indexOf('>');
        redirect = { type: 'write', target: part.substring(idx + 1).trim() };
        part = part.substring(0, idx).trim();
      }
      
      if (redirect) result.redirects.push(redirect);
      
      // Parse command and arguments
      const tokens = part.split(/\s+/).filter(t => t);
      if (tokens.length > 0) {
        result.commands.push({
          cmd: tokens[0],
          args: tokens.slice(1)
        });
      }
    }
    
    return result;
  },

  /**
   * Parse flags from arguments
   * @param {string[]} args - Arguments array
   * @returns {{flags: Map<string, string|true>, positional: string[]}}
   */
  parseArgs(args) {
    const flags = new Map();
    const positional = [];
    
    let i = 0;
    while (i < args.length) {
      if (args[i].startsWith('-')) {
        const flag = args[i];
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          // Check if next arg is a value (not another flag)
          const nextArg = args[i + 1];
          // Common flag values that should be captured
          if (/^\d+$/.test(nextArg) || /^[a-zA-Z0-9_-]+$/.test(nextArg)) {
            // Only capture as value if current flag expects one (like -n 10)
            // For simplicity, capture numeric values
            if (/^\d+$/.test(nextArg)) {
              flags.set(flag, parseInt(nextArg, 10));
              i += 2;
              continue;
            }
          }
        }
        flags.set(flag, true);
        i++;
      } else {
        positional.push(args[i]);
        i++;
      }
    }
    
    return { flags, positional };
  },

  /**
   * Check if permission mode allows an action
   * @param {number} mode - Permission mode (octal)
   * @param {string} action - 'read', 'write', or 'execute'
   * @param {string} userType - 'owner', 'group', or 'other'
   * @returns {boolean} Whether action is allowed
   */
  hasPermission(mode, action, userType = 'other') {
    const perms = mode.toString(8).padStart(3, '0');
    const digit = parseInt(perms[userType === 'owner' ? 0 : userType === 'group' ? 1 : 2], 10);
    
    switch (action) {
      case 'read': return (digit & 4) !== 0;
      case 'write': return (digit & 2) !== 0;
      case 'execute': return (digit & 1) !== 0;
      default: return false;
    }
  },

  /**
   * Format permission mode to string (rwxrwxrwx)
   * @param {number} mode - Permission mode (octal)
   * @returns {string} Permission string
   */
  modeToString(mode) {
    const perms = mode.toString(8).padStart(3, '0');
    let result = '';
    
    for (const digit of perms) {
      const d = parseInt(digit, 10);
      result += (d & 4) ? 'r' : '-';
      result += (d & 2) ? 'w' : '-';
      result += (d & 1) ? 'x' : '-';
    }
    
    return result;
  },

  /**
   * Deep clone an object
   * @param {any} obj - Object to clone
   * @returns {any} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = this.deepClone(obj[key]);
    }
    return cloned;
  },

  /**
   * Wait for specified milliseconds (async)
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Pad string to fixed width
   * @param {string} str - String to pad
   * @param {number} width - Target width
   * @param {string} char - Padding character
   * @param {boolean} right - Pad on right (default: left)
   * @returns {string} Padded string
   */
  pad(str, width, char = ' ', right = false) {
    str = String(str);
    while (str.length < width) {
      if (right) {
        str += char;
      } else {
        str = char + str;
      }
    }
    return str;
  },

  /**
   * Create a debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}