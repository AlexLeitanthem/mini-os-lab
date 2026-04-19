// WHY: Virtual file system simulates hierarchical storage with permissions
// CONTEXT: Core OS component providing file and directory operations

class FileSystem {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB
    this.maxFiles = options.maxFiles || 1000;
    
    // Root directory
    this.root = null;
    // Current file count
    this._fileCount = 0;
    // Used space
    this._usedSpace = 0;
    
    this._initialize();
  }

  /**
   * Create a new file system entry
   * @param {string} name - Entry name
   * @param {string} type - Entry type: 'file', 'directory', 'symlink'
   * @param {object} options - Entry options
   * @returns {object} File system entry
   * @private
   */
  _createEntry(name, type, options = {}) {
    return {
      name: name,
      type: type, // 'file', 'directory', 'symlink'
      id: this._fileCount++,
      // Permissions (octal): 755 = rwxr-xr-x, 644 = rw-r--r--
      mode: options.mode || (type === 'directory' ? 0o755 : 0o644),
      owner: options.owner || 'root',
      group: options.group || 'root',
      // Timestamps
      created: new Date(),
      modified: new Date(),
      accessed: new Date(),
      // Content
      content: type === 'file' ? (options.content || '') : null,
      children: type === 'directory' ? new Map() : null,
      // Symlink target
      linkTarget: options.linkTarget || null,
      // Size
      size: type === 'file' ? (options.content || '').length : 0,
      // Metadata
      metadata: options.metadata || {}
    };
  }

  /**
   * Initialize file system with default structure
   * @private
   */
  _initialize() {
    // Create root directory
    this.root = this._createEntry('', 'directory', { owner: 'root', mode: 0o755 });
    
    // Create default directory structure
    const dirs = [
      'bin',
      'etc',
      'home',
      'home/user',
      'home/guest',
      'tmp',
      'var',
      'var/log',
      'usr',
      'usr/lib',
      'proc',
      'sys',
      'dev',
      'lab',
      'projects',
      'projects/case-studies'
    ];
    
    for (const dir of dirs) {
      this.mkdir('/' + dir, 0o755, 'root', 'root', true);
    }
    
    // Create some default files
    this.writeFile('/etc/hostname', 'mini-os', 'root', 'root');
    this.writeFile('/etc/os-release', 
      'NAME="Mini OS"\nVERSION="1.0.0"\nID=mini-os\nPRETTY_NAME="Mini OS Simulation"',
      'root', 'root'
    );
    this.writeFile('/etc/passwd',
      'root:x:0:0:root:/root:/bin/sh\nuser:x:1000:1000:User:/home/user:/bin/sh\nguest:x:1001:1001:Guest:/home/guest:/bin/sh',
      'root', 'root', 0o644
    );
    this.writeFile('/home/user/.bashrc',
      '# .bashrc\nexport PATH="/usr/bin:/bin"\nexport HOME="/home/user"\nalias ll="ls -la"\nalias cls="clear"',
      'user', 'user'
    );
    this.writeFile('/home/user/readme.txt',
      'Welcome to Mini OS!\nThis is a simulated operating system built in JavaScript.\nType "help" to see available commands.',
      'user', 'user'
    );
    this.writeFile('/home/user/ece-quickstart.txt',
      'Mini OS Lab quickstart\n\n' +
      '1. Run "lab" to see the engineering walkthrough.\n' +
      '2. Run "signals" to inspect simulated signal quality.\n' +
      '3. Run "adc", "spectrum", and "comm" for acquisition and communication views.\n' +
      '4. Run "osi", "subnet", "route", and "dns" for Computer Networks topics.\n' +
      '5. Run "bus" to review communication buses and use cases.\n' +
      '6. Read /projects/ece-system-brief.txt for the system context.\n' +
      '7. Open /lab/telemetry.log, /lab/channel-report.txt, and /lab/routing-table.txt for diagnostics.\n',
      'user', 'user'
    );
    this.writeFile('/home/guest/welcome.txt',
      'Welcome, guest!\nYou have limited permissions in this system.',
      'guest', 'guest'
    );
    this.writeFile('/projects/ece-system-brief.txt',
      'Mini OS Lab // ECE System Brief\n\n' +
      'This browser-based project demonstrates operating-system concepts while connecting them to\n' +
      'Electronics and Communication Engineering ideas such as:\n' +
      '- resource sharing in constrained hardware\n' +
      '- scheduling behavior similar to RTOS task rotation\n' +
      '- sampled data acquisition using ADC-style pipelines\n' +
      '- signal quality tracking through spectrum and SNR summaries\n' +
      '- communication diagnostics through network-style commands\n' +
      '- OSI, routing, subnetting, and DNS for Computer Networks subject alignment\n' +
      '- hardware abstraction for devices, timers, storage, and links\n' +
      '- structured logging for telemetry and lab-style validation\n\n' +
      'Recommended demo path:\n' +
      '  help\n' +
      '  lab\n' +
      '  signals\n' +
      '  adc\n' +
      '  spectrum\n' +
      '  comm\n' +
      '  osi\n' +
      '  subnet\n' +
      '  route\n' +
      '  dns\n' +
      '  bus\n' +
      '  cat /lab/telemetry.log\n' +
      '  ping telemetry.lab\n',
      'user', 'user'
    );
    this.writeFile('/projects/communication-link.txt',
      'Communication Link Note\n\n' +
      'Example chain:\n' +
      'sensor payload -> packet formatter -> line coding -> QPSK mapper -> noisy channel ->\n' +
      'matched filter -> symbol detector -> CRC verification -> telemetry log\n\n' +
      'Related shell commands:\n' +
      '- comm\n' +
      '- spectrum\n' +
      '- ping telemetry.lab\n' +
      '- ifconfig\n',
      'user', 'user'
    );
    this.writeFile('/projects/adc-notes.txt',
      'ADC and Sampling Note\n\n' +
      'Sampling rate   : 48 kSamples/s\n' +
      'Resolution      : 12 bits\n' +
      'Reference       : 3.30 V\n' +
      'LSB estimate    : 0.81 mV\n' +
      'Design reminder : preserve headroom and anti-alias filtering before conversion\n',
      'user', 'user'
    );
    this.writeFile('/projects/networking-fundamentals.txt',
      'Computer Networks Fundamentals\n\n' +
      'Topics represented in Mini OS Lab:\n' +
      '- OSI layers and protocol mapping\n' +
      '- IPv4 subnetting and prefix lengths\n' +
      '- routing table interpretation\n' +
      '- DNS resolution and caching\n' +
      '- transport layer comparison: TCP vs UDP\n' +
      '- interface inspection with ifconfig and netstat\n',
      'user', 'user'
    );
    this.writeFile('/projects/case-studies/signal-chain.txt',
      'Signal Chain Notes\n\n' +
      'Sensor -> ADC -> buffer -> process scheduler -> storage -> network uplink\n\n' +
      'This mapping helps explain how OS building blocks support electronics systems:\n' +
      '- buffers protect sampling bursts\n' +
      '- scheduling balances compute work\n' +
      '- filesystems preserve logs\n' +
      '- device layers isolate hardware specifics\n',
      'user', 'user'
    );
    this.writeFile('/etc/bus-map.conf',
      'UART=debug_console, telemetry_bridge\n' +
      'SPI=flash_memory, adc_frontend\n' +
      'I2C=environment_sensor, rtc\n' +
      'CAN=motor_cluster, control_loop\n' +
      'ETHERNET=lab_gateway, dashboard_uplink\n',
      'root', 'root'
    );
    this.writeFile('/etc/rf-profile.conf',
      'IF_FREQUENCY=10.7MHz\n' +
      'TELEMETRY_BAND=433.92MHz\n' +
      'MODULATION=QPSK\n' +
      'CHANNEL_BANDWIDTH=25kHz\n' +
      'TARGET_LINK_MARGIN=10dB\n',
      'root', 'root'
    );
    this.writeFile('/etc/osi-reference.txt',
      'L7 Application  : HTTP, DNS, SMTP\n' +
      'L6 Presentation : formatting, encryption, compression\n' +
      'L5 Session      : setup and teardown of communication sessions\n' +
      'L4 Transport    : TCP, UDP, ports, segmentation\n' +
      'L3 Network      : IP addressing, routing\n' +
      'L2 Data Link    : MAC, framing, switching\n' +
      'L1 Physical     : media, electrical and optical signaling\n',
      'root', 'root'
    );
    this.writeFile('/lab/telemetry.log',
      '[08:10:14] LINK_UP      telemetry.lab    RSSI=-47 dBm\n' +
      '[08:10:15] SENSOR_SYNC  adc_frontend     sample_rate=48 kHz\n' +
      '[08:10:17] DMA_BUFFER   channel_A        status=stable\n' +
      '[08:10:19] BUS_CHECK    SPI flash        latency=3 ms\n' +
      '[08:10:23] PACKET_TX    uplink_eth0      loss=0.2%\n',
      'user', 'user'
    );
    this.writeFile('/lab/channel-report.txt',
      'Channel Report\n\n' +
      'Link margin  : 11.4 dB\n' +
      'Estimated BER: 2.1e-4\n' +
      'Noise floor  : -92 dBm\n' +
      'Interference : short burst near 2.4 GHz reference band\n' +
      'Recommendation: retain current coding rate and monitor uplink bursts\n',
      'user', 'user'
    );
    this.writeFile('/lab/spectrum-scan.txt',
      'Spectrum Scan Report\n\n' +
      '10.700 MHz : IF_STAGE   power -34.2 dBm\n' +
      '433.920 MHz: TELEMETRY  power -41.5 dBm\n' +
      '867.840 MHz: HARMONIC   power -62.4 dBm\n' +
      '2400.000 MHz: WIFI_REF  power -57.8 dBm\n',
      'user', 'user'
    );
    this.writeFile('/lab/routing-table.txt',
      'Routing Table Notes\n\n' +
      'default via 192.168.1.1 dev eth0 metric 10\n' +
      '192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100\n' +
      '10.10.0.0/16 via 192.168.1.254 dev eth0 metric 25\n' +
      '127.0.0.0/8 dev lo scope link\n',
      'user', 'user'
    );
    this.writeFile('/lab/dns-cache.txt',
      'DNS Cache Snapshot\n\n' +
      'telemetry.lab  A    98.41.127.45   TTL 300\n' +
      'gateway.lab    A    192.168.1.1    TTL 900\n' +
      'scope.lab      A    192.168.1.44   TTL 180\n' +
      'logger.lab     A    10.10.0.18     TTL 120\n',
      'user', 'user'
    );
    
    // Create log files
    this.writeFile('/var/log/system.log',
      '[SYSTEM] Mini OS initialized\n[KERNEL] Boot sequence started\n[INIT] Loading system services',
      'root', 'root'
    );
    
    this._usedSpace = this._calculateUsedSpace(this.root);
  }

  /**
   * Resolve a path string to a file system entry
   * @param {string} path - Path to resolve
   * @param {string} currentUser - Current user for symlink resolution
   * @param {number} depth - Recursion depth for symlinks
   * @returns {object|null} File system entry or null if not found
   */
  resolve(path, currentUser = null, depth = 0) {
    if (depth > 10) {
      return null; // Too many symlink levels
    }
    
    // Normalize path
    if (path === '') path = '/';
    const parts = path.split('/').filter(p => p !== '');
    
    let current = this.root;
    if (path.startsWith('/')) {
      current = this.root;
    }
    
    for (const part of parts) {
      if (current.type !== 'directory') {
        return null;
      }
      
      // Handle . and ..
      if (part === '.') {
        continue;
      }
      if (part === '..') {
        // Can't go above root
        if (current === this.root) continue;
        // Find parent - simplified approach
        const parentPath = this._getParentPath(path);
        if (parentPath === path) continue;
        return this.resolve(parentPath, currentUser, depth);
      }
      
      if (!current.children.has(part)) {
        return null;
      }
      
      current = current.children.get(part);
      
      // Handle symlinks
      if (current.type === 'symlink' && current.linkTarget) {
        return this.resolve(current.linkTarget, currentUser, depth + 1);
      }
    }
    
    return current;
  }

  /**
   * Get parent path from a full path
   * @param {string} path - Full path
   * @returns {string} Parent path
   * @private
   */
  _getParentPath(path) {
    const parts = path.split('/').filter(p => p !== '');
    parts.pop();
    return '/' + parts.join('/');
  }

  /**
   * Check if user has permission on an entry
   * @param {object} entry - File system entry
   * @param {string} action - 'read', 'write', 'execute'
   * @param {string} user - Username
   * @param {string} role - User role ('admin', 'user', 'guest')
   * @returns {boolean} Whether action is permitted
   */
  checkPermission(entry, action, user, role) {
    if (role === 'admin') return true; // Admin has full access
    
    const mode = entry.mode;
    const modeStr = mode.toString(8).padStart(3, '0');
    
    let digit;
    if (user === entry.owner) {
      digit = parseInt(modeStr[0], 10);
    } else if (user === entry.group || this._isUserInGroup(user, entry.group)) {
      digit = parseInt(modeStr[1], 10);
    } else {
      digit = parseInt(modeStr[2], 10);
    }
    
    switch (action) {
      case 'read': return (digit & 4) !== 0;
      case 'write': return (digit & 2) !== 0;
      case 'execute': return (digit & 1) !== 0;
      default: return false;
    }
  }

  /**
   * Check if user is in group (simplified)
   * @param {string} user - Username
   * @param {string} group - Group name
   * @returns {boolean} Whether user is in group
   * @private
   */
  _isUserInGroup(user, group) {
    // Simplified: user's primary group matches
    return user === group;
  }

  /**
   * Create a directory
   * @param {string} path - Directory path
   * @param {number} mode - Permission mode
   * @param {string} owner - Owner username
   * @param {string} group - Group name
   * @param {boolean} isInit - Whether this is during initialization
   * @returns {boolean} Success status
   */
  mkdir(path, mode = 0o755, owner = 'root', group = 'root', isInit = false) {
    const parts = path.split('/').filter(p => p !== '');
    let current = this.root;
    
    for (const part of parts) {
      if (!current.children.has(part)) {
        const newDir = this._createEntry(part, 'directory', { mode, owner, group });
        current.children.set(part, newDir);
        current = newDir;
      } else {
        current = current.children.get(part);
        if (current.type !== 'directory') {
          return false; // Path component is not a directory
        }
      }
    }
    
    return true;
  }

  /**
   * Create or overwrite a file with content
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} owner - Owner username
   * @param {string} group - Group name
   * @param {number} mode - Permission mode
   * @returns {boolean} Success status
   */
  writeFile(path, content, owner = 'root', group = 'root', mode = 0o644) {
    const { parentPath, name } = this._splitPath(path);
    const parent = this.resolve(parentPath);
    
    if (!parent || parent.type !== 'directory') {
      return false;
    }
    
    if (this._fileCount >= this.maxFiles) {
      return false; // Too many files
    }
    
    const newFile = this._createEntry(name, 'file', { content, owner, group, mode });
    parent.children.set(name, newFile);
    this._usedSpace += content.length;
    
    return true;
  }

  /**
   * Read file content
   * @param {string} path - File path
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {string|null} File content or null
   */
  readFile(path, user, role) {
    const entry = this.resolve(path);
    if (!entry || entry.type !== 'file') {
      return null;
    }
    
    if (!this.checkPermission(entry, 'read', user, role)) {
      return null;
    }
    
    entry.accessed = new Date();
    return entry.content;
  }

  /**
   * Append content to a file
   * @param {string} path - File path
   * @param {string} content - Content to append
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {boolean} Success status
   */
  appendFile(path, content, user, role) {
    const entry = this.resolve(path);
    if (!entry || entry.type !== 'file') {
      return false;
    }
    
    if (!this.checkPermission(entry, 'write', user, role)) {
      return false;
    }
    
    entry.content += content;
    entry.size = entry.content.length;
    entry.modified = new Date();
    this._usedSpace += content.length;
    
    return true;
  }

  /**
   * Delete a file or directory
   * @param {string} path - Path to delete
   * @param {string} user - Username
   * @param {string} role - User role
   * @param {boolean} recursive - Whether to delete recursively
   * @returns {boolean} Success status
   */
  remove(path, user, role, recursive = false) {
    if (path === '/') return false; // Can't delete root
    
    const entry = this.resolve(path);
    if (!entry) return false;
    
    // Check delete permission (write on parent)
    const { parentPath } = this._splitPath(path);
    const parent = this.resolve(parentPath);
    if (!this.checkPermission(parent, 'write', user, role)) {
      return false;
    }
    
    if (entry.type === 'directory' && entry.children.size > 0 && !recursive) {
      return false; // Directory not empty
    }
    
    // Remove from parent
    parent.children.delete(entry.name);
    this._usedSpace -= this._calculateEntrySize(entry);
    
    return true;
  }

  /**
   * List directory contents
   * @param {string} path - Directory path
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {Array<object>|null} Array of entries or null
   */
  listDir(path, user, role) {
    const entry = this.resolve(path);
    if (!entry || entry.type !== 'directory') {
      return null;
    }
    
    if (!this.checkPermission(entry, 'read', user, role)) {
      return null;
    }
    
    entry.accessed = new Date();
    const entries = [];
    
    for (const [name, child] of entry.children) {
      entries.push({
        name: name,
        type: child.type,
        size: child.size,
        mode: child.mode,
        modeStr: this._modeToString(child.mode),
        owner: child.owner,
        group: child.group,
        modified: child.modified,
        created: child.created
      });
    }
    
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Change file mode (permissions)
   * @param {string} path - File path
   * @param {number} mode - New mode
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {boolean} Success status
   */
  chmod(path, mode, user, role) {
    const entry = this.resolve(path);
    if (!entry) return false;
    
    if (user !== entry.owner && role !== 'admin') {
      return false;
    }
    
    entry.mode = mode;
    entry.modified = new Date();
    
    return true;
  }

  /**
   * Change file owner
   * @param {string} path - File path
   * @param {string} newOwner - New owner
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {boolean} Success status
   */
  chown(path, newOwner, user, role) {
    if (role !== 'admin') return false;
    
    const entry = this.resolve(path);
    if (!entry) return false;
    
    entry.owner = newOwner;
    entry.modified = new Date();
    
    return true;
  }

  /**
   * Create a symbolic link
   * @param {string} target - Link target
   * @param {string} path - Link path
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {boolean} Success status
   */
  symlink(target, path, user, role) {
    const { parentPath, name } = this._splitPath(path);
    const parent = this.resolve(parentPath);
    
    if (!parent || parent.type !== 'directory') {
      return false;
    }
    
    const link = this._createEntry(name, 'symlink', {
      linkTarget: target,
      owner: user,
      mode: 0o777
    });
    
    parent.children.set(name, link);
    return true;
  }

  /**
   * Get information about a path
   * @param {string} path - Path
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {object|null} Entry info or null
   */
  stat(path, user, role) {
    const entry = this.resolve(path);
    if (!entry) return null;
    
    // Need at least read permission on containing directory
    const { parentPath } = this._splitPath(path);
    const parent = this.resolve(parentPath);
    if (parent && !this.checkPermission(parent, 'read', user, role)) {
      return null;
    }
    
    entry.accessed = new Date();
    
    return {
      name: entry.name,
      type: entry.type,
      size: entry.size,
      mode: entry.mode,
      modeStr: this._modeToString(entry.mode),
      owner: entry.owner,
      group: entry.group,
      created: entry.created,
      modified: entry.modified,
      accessed: entry.accessed,
      id: entry.id,
      linkTarget: entry.linkTarget,
      childrenCount: entry.children ? entry.children.size : 0
    };
  }

  /**
   * Find files matching a pattern
   * @param {string} path - Starting path
   * @param {string} pattern - Name pattern (supports * and ?)
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {string[]} Array of matching paths
   */
  find(path, pattern, user, role) {
    const results = [];
    const entry = this.resolve(path);
    
    if (!entry || entry.type !== 'directory') {
      return results;
    }
    
    if (!this.checkPermission(entry, 'read', user, role)) {
      return results;
    }
    
    this._searchRecursive(entry, path, pattern, results, user, role);
    return results;
  }

  /**
   * Search recursively for matching files
   * @private
   */
  _searchRecursive(entry, currentPath, pattern, results, user, role) {
    if (entry.type === 'directory') {
      for (const [name, child] of entry.children) {
        const childPath = currentPath === '/' ? '/' + name : currentPath + '/' + name;
        
        if (this._matchPattern(name, pattern)) {
          results.push(childPath);
        }
        
        if (child.type === 'directory') {
          if (this.checkPermission(child, 'read', user, role)) {
            this._searchRecursive(child, childPath, pattern, results, user, role);
          }
        }
      }
    }
  }

  /**
   * Match a name against a pattern with wildcards
   * @param {string} name - Name to match
   * @param {string} pattern - Pattern with * and ?
   * @returns {boolean} Whether it matches
   * @private
   */
  _matchPattern(name, pattern) {
    if (!pattern) return true;
    
    // Convert glob pattern to regex
    let regex = '';
    for (const char of pattern) {
      if (char === '*') regex += '.*';
      else if (char === '?') regex += '.';
      else regex += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    return new RegExp('^' + regex + '$', 'i').test(name);
  }

  /**
   * Get directory tree as string
   * @param {string} path - Directory path
   * @param {string} user - Username
   * @param {string} role - User role
   * @returns {string} Tree string
   */
  tree(path, user, role) {
    const entry = this.resolve(path);
    if (!entry || entry.type !== 'directory') {
      return 'Not a directory';
    }
    
    if (!this.checkPermission(entry, 'read', user, role)) {
      return 'Permission denied';
    }
    
    const lines = [path === '/' ? '/' : path.split('/').pop()];
    this._buildTree(entry, '', lines, true, user, role);
    return lines.join('\n');
  }

  /**
   * Build tree recursively
   * @private
   */
  _buildTree(entry, prefix, lines, isLast, user, role) {
    if (entry.type !== 'directory') return;
    
    const children = Array.from(entry.children.values())
      .filter(c => this.checkPermission(c, 'read', user, role) || entry === this.root)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const last = i === children.length - 1;
      const connector = last ? '└── ' : '├── ';
      
      lines.push(prefix + connector + child.name + (child.type === 'directory' ? '/' : ''));
      
      if (child.type === 'directory') {
        const newPrefix = prefix + (last ? '    ' : '│   ');
        this._buildTree(child, newPrefix, lines, last, user, role);
      }
    }
  }

  /**
   * Get file system statistics
   * @returns {object} FS stats
   */
  getStats() {
    return {
      totalFiles: this._fileCount,
      usedSpace: this._usedSpace,
      maxFiles: this.maxFiles,
      maxFileSize: this.maxFileSize
    };
  }

  /**
   * Split path into parent directory and entry name
   * @param {string} path - Full path
   * @returns {{parentPath: string, name: string}}
   * @private
   */
  _splitPath(path) {
    const parts = path.split('/').filter(p => p !== '');
    const name = parts.pop() || '';
    const parentPath = '/' + parts.join('/');
    return { parentPath: parentPath === '/' ? '/' : parentPath || '/', name };
  }

  /**
   * Convert mode to string representation
   * @param {number} mode - Permission mode
   * @returns {string} Permission string
   * @private
   */
  _modeToString(mode) {
    const perms = mode.toString(8).padStart(3, '0');
    let result = '';
    for (const digit of perms) {
      const d = parseInt(digit, 10);
      result += (d & 4) ? 'r' : '-';
      result += (d & 2) ? 'w' : '-';
      result += (d & 1) ? 'x' : '-';
    }
    return result;
  }

  /**
   * Calculate size of an entry including children
   * @param {object} entry - Entry to measure
   * @returns {number} Size in bytes
   * @private
   */
  _calculateEntrySize(entry) {
    let size = entry.content ? entry.content.length : 0;
    if (entry.children) {
      for (const child of entry.children.values()) {
        size += this._calculateEntrySize(child);
      }
    }
    return size;
  }

  /**
   * Calculate total used space
   * @param {object} entry - Entry to start from
   * @returns {number} Total size
   * @private
   */
  _calculateUsedSpace(entry) {
    return this._calculateEntrySize(entry);
  }

  /**
   * Reset file system (for testing)
   */
  reset() {
    this._fileCount = 0;
    this._usedSpace = 0;
    this._initialize();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileSystem;
}
