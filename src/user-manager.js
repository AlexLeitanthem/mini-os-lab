// WHY: User manager handles authentication, user accounts, and role-based access control
// CONTEXT: Core OS component for security and multi-user support

class UserManager {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    // User database: username -> user object
    this.users = new Map();
    
    // Currently logged in users
    this.sessions = new Map();
    
    // User roles and their permissions
    this.roles = {
      admin: {
        level: 3,
        permissions: ['all'],
        description: 'System administrator - full access'
      },
      user: {
        level: 2,
        permissions: ['read', 'write_own', 'execute', 'create_files', 'run_apps'],
        description: 'Standard user - regular access'
      },
      guest: {
        level: 1,
        permissions: ['read_public', 'write_own_home'],
        description: 'Guest user - limited access'
      }
    };
    
    // Session timeout (30 minutes)
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000;
    
    // Password policy
    this.passwordPolicy = {
      minLength: 3, // Relaxed for demo
      requireUppercase: false,
      requireNumber: false
    };

    this._initialize();
  }

  /**
   * Initialize user manager with default users
   * @private
   */
  _initialize() {
    // Default users
    this.createUser({
      username: 'root',
      password: 'root',
      role: 'admin',
      homeDir: '/root',
      shell: '/bin/sh',
      uid: 0,
      gid: 0
    });

    this.createUser({
      username: 'admin',
      password: 'admin',
      role: 'admin',
      homeDir: '/home/admin',
      shell: '/bin/sh',
      uid: 1000,
      gid: 1000
    });

    this.createUser({
      username: 'user',
      password: 'user',
      role: 'user',
      homeDir: '/home/user',
      shell: '/bin/sh',
      uid: 1001,
      gid: 1001
    });

    this.createUser({
      username: 'guest',
      password: 'guest',
      role: 'guest',
      homeDir: '/home/guest',
      shell: '/bin/sh',
      uid: 1002,
      gid: 1002
    });
  }

  /**
   * Hash a password (simple hash for simulation)
   * @param {string} password - Plain text password
   * @returns {string} Hashed password
   * @private
   */
  _hashPassword(password) {
    // Simple hash - in production use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Create a new user
   * @param {object} options - User options
   * @returns {object|{error: string}} User object or error
   */
  createUser(options) {
    const { username, password, role = 'user', homeDir, shell = '/bin/sh', uid, gid } = options;

    // Validate username
    if (!username || username.length < 1) {
      return { error: 'Username is required' };
    }

    if (username.includes(' ') || username.includes('/')) {
      return { error: 'Invalid username characters' };
    }

    if (this.users.has(username)) {
      return { error: 'Username already exists' };
    }

    // Validate password
    if (!password || password.length < this.passwordPolicy.minLength) {
      return { error: `Password must be at least ${this.passwordPolicy.minLength} characters` };
    }
const user = {
      username,
      passwordHash: this._hashPassword(password),
      role: this.roles[role] ? role : 'user',
      homeDir: homeDir || `/home/${username}`,
      shell,
      uid: uid || (this.users.size + 1000),
      gid: gid || (this.users.size + 1000),
      created: new Date(),
      lastLogin: null,
      failedAttempts: 0,
      locked: false,
      // User groups
      groups: [role],
      // Environment variables
      env: {
        HOME: homeDir || `/home/${username}`,
        SHELL: shell,
        USER: username,
        LOGNAME: username,
        PATH: '/usr/bin:/bin'
      }
    };

    this.users.set(username, user);
    return user;
  }

  /**
   * Authenticate a user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {object|{error: string}} Session object or error
   */
  login(username, password) {
    const user = this.users.get(username);
    if (!user) {
      return { error: 'Invalid username or password' };
    }

    // Check if account is locked
    if (user.locked) {
      return { error: 'Account is locked. Too many failed attempts.' };
    }

    // Verify password
    if (user.passwordHash !== this._hashPassword(password)) {
      user.failedAttempts++;
      
      // Lock account after 5 failed attempts
      if (user.failedAttempts >= 5) {
        user.locked = true;
        return { error: 'Account locked due to too many failed attempts' };
      }
      
      return { error: `Invalid password (${5 - user.failedAttempts} attempts remaining)` };
    }

    // Successful login
    user.failedAttempts = 0;
    user.lastLogin = new Date();

    // Create session
    const sessionId = this._generateSessionId();
    const session = {
      id: sessionId,
      user: username,
      role: user.role,
      homeDir: user.homeDir,
      shell: user.shell,
      env: { ...user.env },
      loginTime: Date.now(),
      lastActivity: Date.now(),
      cwd: user.homeDir, // Start in home directory
      history: [],
      historyIndex: -1
    };

    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Log out a user
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success status
   */
  logout(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {object|undefined} Session object
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success status
   */
  touchSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Check for expired sessions
   */
  cleanupSessions() {
    const now = Date.now();
    const toRemove = [];
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.sessions.delete(id);
    }
  }

  /**
   * Get user information
   * @param {string} username - Username
   * @param {boolean} includeSensitive - Include sensitive data
   * @returns {object|null} User info
   */
  getUserInfo(username, includeSensitive = false) {
    const user = this.users.get(username);
    if (!user) return null;
    
    const info = {
      username: user.username,
      role: user.role,
      homeDir: user.homeDir,
      shell: user.shell,
      uid: user.uid,
      gid: user.gid,
      created: user.created,
      lastLogin: user.lastLogin,
      groups: user.groups,
      locked: user.locked
    };
    
    if (includeSensitive) {
      info.passwordHash = user.passwordHash;
      info.failedAttempts = user.failedAttempts;
    }
    
    return info;
  }

  /**
   * Change user password
   * @param {string} username - Username
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean|{error: string}} Success or error
   */
  changePassword(username, currentPassword, newPassword) {
    const user = this.users.get(username);
    if (!user) {
      return { error: 'User not found' };
    }

    // Verify current password
    if (user.passwordHash !== this._hashPassword(currentPassword)) {
      return { error: 'Current password is incorrect' };
    }

    // Validate new password
    if (newPassword.length < this.passwordPolicy.minLength) {
      return { error: `Password must be at least ${this.passwordPolicy.minLength} characters` };
    }

    if (newPassword === currentPassword) {
      return { error: 'New password must be different' };
    }

    user.passwordHash = this._hashPassword(newPassword);
    return true;
  }

  /**
   * Get all users (sanitized)
   * @returns {array} User list
   */
  listUsers() {
    const list = [];
    for (const [username, user] of this.users) {
      list.push({
        username: user.username,
        role: user.role,
        homeDir: user.homeDir,
        uid: user.uid,
        gid: user.gid,
        lastLogin: user.lastLogin,
        locked: user.locked
      });
    }
    return list;
  }

  /**
   * Get role information
   * @param {string} roleName - Role name
   * @returns {object|null} Role info
   */
  getRole(roleName) {
    return this.roles[roleName] || null;
  }

  /**
   * Get all roles
   * @returns {object} All roles
   */
  getRoles() {
    return this.roles;
  }

  /**
   * Check if user has permission
   * @param {string} username - Username
   * @param {string} permission - Permission to check
   * @returns {boolean} Whether user has permission
   */
  hasPermission(username, permission) {
    const user = this.users.get(username);
    if (!user) return false;
    
    const role = this.roles[user.role];
    if (!role) return false;
    
    if (role.permissions.includes('all')) return true;
    return role.permissions.includes(permission);
  }

  /**
   * Get currently logged in users
   * @returns {array} Active sessions
   */
  getLoggedInUsers() {
    const users = [];
    for (const [, session] of this.sessions) {
      users.push({
        username: session.user,
        role: session.role,
        loginTime: session.loginTime,
        idle: Date.now() - session.lastActivity,
        cwd: session.cwd
      });
    }
    return users;
  }

  /**
   * Get active session count
   * @returns {number} Number of active sessions
   */
  getActiveSessionCount() {
    return this.sessions.size;
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   * @private
   */
  _generateSessionId() {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Unlock a user account
   * @param {string} username - Username
   * @returns {boolean} Success status
   */
  unlockUser(username) {
    const user = this.users.get(username);
    if (!user) return false;
    
    user.locked = false;
    user.failedAttempts = 0;
    return true;
  }

  /**
   * Delete a user
   * @param {string} username - Username
   * @param {string} adminUser - Admin performing the deletion
   * @returns {boolean|{error: string}} Success or error
   */
  deleteUser(username, adminUser) {
    if (username === 'root') {
      return { error: 'Cannot delete root user' };
    }
    
    const admin = this.users.get(adminUser);
    if (!admin || admin.role !== 'admin') {
      return { error: 'Permission denied' };
    }
    
    // Remove sessions
    for (const [id, session] of this.sessions) {
      if (session.user === username) {
        this.sessions.delete(id);
      }
    }
    
    return this.users.delete(username);
  }

  /**
   * Reset user manager (for testing)
   */
  reset() {
    this.users.clear();
    this.sessions.clear();
    this._initialize();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserManager;
}