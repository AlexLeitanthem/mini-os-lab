// WHY: Kernel is the core of the OS, managing all subsystems and system calls
// CONTEXT: Central orchestrator that initializes and manages all OS components

class Kernel {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.version = '1.0.0';
    this.name = 'Mini OS';
    this.codename = 'JavaScript Dream';
    
    // OS Subsystems
    this.memoryManager = null;
    this.fileSystem = null;
    this.processManager = null;
    this.userManager = null;
    this.deviceManager = null;
    
    // System call table
    this.syscallTable = new Map();
    
    // System state
    this.state = 'booting'; // booting, running, shutting_down, halted
    this.bootTime = null;
    this.shutdownTime = null;
    
    // System log
    this.log = [];
    this.maxLogSize = options.maxLogSize || 500;
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Configuration
    this.config = {
      ...options,
      osName: this.name,
      version: this.version,
      hostname: options.hostname || 'mini-os'
    };

    this._initializeSyscalls();
  }

  /**
   * Initialize the kernel and all subsystems
   */
  async boot() {
    this._log('KERNEL', 'Boot sequence initiated');
    this.state = 'booting';
    this.bootTime = new Date();
    
    try {
      // Step 1: Initialize memory manager
      this._log('KERNEL', 'Initializing Memory Manager...');
      this.memoryManager = new MemoryManager();
      this._log('KERNEL', `Memory: ${this.memoryManager.TOTAL_SIZE} bytes available`);
      
      // Step 2: Initialize file system
      this._log('KERNEL', 'Initializing File System...');
      this.fileSystem = new FileSystem();
      this._log('KERNEL', 'File system mounted');

      // Step 3: Initialize process manager
      this._log('KERNEL', 'Initializing Process Manager...');
      this.processManager = new ProcessManager();
      
      // Step 4: Initialize user manager
      this._log('KERNEL', 'Initializing User Manager...');
      this.userManager = new UserManager();
      this._log('KERNEL', 'User authentication ready');
      
      // Step 5: Initialize device manager
      this._log('KERNEL', 'Initializing Device Manager...');
      this.deviceManager = new DeviceManager();
      this._log('KERNEL', 'Devices ready');
      
      // System fully initialized
      this.state = 'running';
      this._log('KERNEL', `*** ${this.name} v${this.version} "${this.codename}" is running ***`);
      
      // Notify boot complete
      this._emit('boot', { time: this.bootTime });
      
    } catch (error) {
      this._log('KERNEL', `CRITICAL: Boot failed - ${error.message}`);
      this.state = 'halted';
      throw error;
    }
  }

  /**
   * Shut down the system
   */
  async shutdown() {
    if (this.state !== 'running') return;
    
    this._log('KERNEL', 'Shutdown initiated');
    this.state = 'shutting_down';
    
    // Terminate all processes
    for (const [pid, process] of this.processManager.getAllProcesses()) {
      if (process.state !== this.processManager.STATES.TERMINATED) {
        this.processManager.terminateProcess(pid, 0);
      }
    }
    
    // Flush file system buffers
    this._log('KERNEL', 'Syncing filesystem...');
    
    // Stop scheduler
    this.processManager.stop();
    if (this.deviceManager && typeof this.deviceManager.stop === 'function') {
      this.deviceManager.stop();
    }

    this.state = 'halted';
    this.shutdownTime = new Date();
    this._log('KERNEL', 'System halted. Goodbye.');
    
    this._emit('shutdown', { time: this.shutdownTime });
  }

  /**
   * Reboot the system
   */
  async reboot() {
    this._log('KERNEL', 'Reboot initiated');
    await this.shutdown();
    
    // Reset all subsystems
    this.memoryManager.reset();
    this.fileSystem.reset();
    this.processManager.reset();
    this.userManager.reset();
    this.deviceManager.reset();
    
    // Reboot
    this.state = 'booting';
    this.bootTime = new Date();
    this.shutdownTime = null;
    await this.boot();
  }

  /**
   * Register a system call
   * @param {string} name - Syscall name
   * @param {Function} handler - Syscall handler
   */
  registerSyscall(name, handler) {
    this.syscallTable.set(name, handler);
  }

  /**
   * Execute a system call
   * @param {string} name - Syscall name
   * @param {Array} args - Arguments
   * @returns {any} Result
   */
  syscall(name, ...args) {
    const handler = this.syscallTable.get(name);
    if (!handler) {
      this._log('KERNEL', `Unknown syscall: ${name}`);
      return { error: `Unknown system call: ${name}` };
    }
    
    try {
      return handler(...args);
    } catch (error) {
      this._log('KERNEL', `Syscall error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Initialize all system calls
   * @private
   */
  _initializeSyscalls() {
    // File system syscalls
    this.registerSyscall('read', (path, user, role) => {
      return this.fileSystem.readFile(path, user, role);
    });
    
    this.registerSyscall('write', (path, content, user, role) => {
      return this.fileSystem.writeFile(path, content, user, role);
    });
    
    this.registerSyscall('append', (path, content, user, role) => {
      return this.fileSystem.appendFile(path, content, user, role);
    });
    
    this.registerSyscall('list', (path, user, role) => {
      return this.fileSystem.listDir(path, user, role);
    });
    
    this.registerSyscall('mkdir', (path, user, role) => {
      return this.fileSystem.mkdir(path, 0o755, user, user);
    });
    
    this.registerSyscall('remove', (path, user, role, recursive) => {
      return this.fileSystem.remove(path, user, role, recursive);
    });
    
    this.registerSyscall('stat', (path, user, role) => {
      return this.fileSystem.stat(path, user, role);
    });
    
    this.registerSyscall('chmod', (path, mode, user, role) => {
      return this.fileSystem.chmod(path, mode, user, role);
    });
    
    this.registerSyscall('chown', (path, owner, user, role) => {
      return this.fileSystem.chown(path, owner, user, role);
    });
    
    this.registerSyscall('find', (path, pattern, user, role) => {
      return this.fileSystem.find(path, pattern, user, role);
    });
    
    this.registerSyscall('tree', (path, user, role) => {
      return this.fileSystem.tree(path, user, role);
    });

    // Process syscalls
    this.registerSyscall('createProcess', (options) => {
      return this.processManager.createProcess(options);
    });
    
    this.registerSyscall('kill', (pid, signal) => {
      if (signal === 'SIGKILL' || signal === 9) {
        return this.processManager.terminateProcess(pid, 137);
      }
      if (signal === 'SIGTERM' || signal === 15) {
        return this.processManager.terminateProcess(pid, 143);
      }
      return this.processManager.sendSignal(pid, signal || 'SIGTERM');
    });
    
    this.registerSyscall('getProcess', (pid) => {
      return this.processManager.getProcess(pid);
    });
    
    this.registerSyscall('listProcesses', (full) => {
      return this.processManager.getProcessList(full);
    });

    // Memory syscalls
    this.registerSyscall('malloc', (pid, size) => {
      return this.memoryManager.allocate(pid, size);
    });
    
    this.registerSyscall('free', (pid) => {
      return this.memoryManager.deallocate(pid);
    });
    
    this.registerSyscall('memStats', () => {
      return this.memoryManager.getStats();
    });

    // User syscalls
    this.registerSyscall('login', (username, password) => {
      return this.userManager.login(username, password);
    });
    
    this.registerSyscall('logout', (sessionId) => {
      return this.userManager.logout(sessionId);
    });
    
    this.registerSyscall('changePassword', (username, oldPass, newPass) => {
      return this.userManager.changePassword(username, oldPass, newPass);
    });
    
    this.registerSyscall('whoami', (sessionId) => {
      const session = this.userManager.getSession(sessionId);
      return session ? { user: session.user, role: session.role } : null;
    });

    // Device syscalls
    this.registerSyscall('ping', (host) => {
      return this.deviceManager.ping(host);
    });
    
    this.registerSyscall('getNetworkInterfaces', () => {
      return this.deviceManager.getNetworkInterfaces();
    });
    
    this.registerSyscall('getDiskStats', () => {
      return this.deviceManager.getDiskStats();
    });

    // System info syscalls
    this.registerSyscall('uname', () => {
      return {
        name: this.name,
        version: this.version,
        codename: this.codename,
        hostname: this.config.hostname,
        bootTime: this.bootTime,
        state: this.state
      };
    });
    
    this.registerSyscall('uptime', () => {
      if (!this.bootTime) return 0;
      return Date.now() - this.bootTime.getTime();
    });
  }

  /**
   * Get comprehensive system status
   * @returns {object} System status
   */
  getStatus() {
    return {
      os: {
        name: this.name,
        version: this.version,
        codename: this.codename,
        hostname: this.config.hostname
      },
      state: this.state,
      bootTime: this.bootTime,
      uptime: this.bootTime ? Date.now() - this.bootTime.getTime() : 0,
      memory: this.memoryManager ? this.memoryManager.getStats() : null,
      processes: this.processManager ? this.processManager.getStats() : null,
      filesystem: this.fileSystem ? this.fileSystem.getStats() : null,
      devices: this.deviceManager ? this.deviceManager.listDevices() : null,
      users: this.userManager ? this.userManager.getLoggedInUsers() : null
    };
  }

  /**
   * Get system information (like uname)
   * @param {boolean} all - Whether to show all info
   * @returns {object|string} System info
   */
  getSystemInfo(all = false) {
    if (all) {
      return {
        name: this.name,
        version: this.version,
        codename: this.codename,
        hostname: this.config.hostname,
        bootTime: this.bootTime,
        state: this.state
      };
    }
    return `${this.name} v${this.version}`;
  }

  /**
   * Add entry to system log
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  _log(component, message, level = 'INFO') {
    const entry = {
      timestamp: Date.now(),
      component,
      message,
      level
    };
    
    this.log.push(entry);
    
    // Trim log if too large
    if (this.log.length > this.maxLogSize) {
      this.log = this.log.slice(-this.maxLogSize);
    }
    
    // Emit log event
    this._emit('log', entry);
    
    // Also log to console in development
    if (this.config.debug) {
      console.log(`[${entry.timestamp}] [${level}] [${component}] ${message}`);
    }
  }

  /**
   * Get system log
   * @param {object} options - Filter options
   * @returns {Array} Log entries
   */
  getLog(options = {}) {
    let entries = this.log;
    
    if (options.level) {
      entries = entries.filter(e => e.level === options.level);
    }
    if (options.component) {
      entries = entries.filter(e => e.component === options.component);
    }
    if (options.lines) {
      entries = entries.slice(-options.lines);
    }
    
    return entries;
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @private
   */
  _emit(event, data = {}) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          this._log('KERNEL', `Event handler error: ${error.message}`, 'ERROR');
        }
      }
    }
  }

  /**
   * Start the OS scheduler
   */
  start() {
    if (this.state === 'running') {
      this.processManager.start();
    }
  }

  /**
   * Stop the OS
   */
  stop() {
    this.processManager.stop();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Kernel;
}
