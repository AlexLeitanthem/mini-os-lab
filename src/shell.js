// WHY: Shell provides interactive command-line interface to the OS
// CONTEXT: User-facing component that interprets commands and executes them through the kernel

class Shell {
  /**
   * @param {object} kernel - Kernel instance
   * @param {object} options - Shell options
   */
  constructor(kernel, options = {}) {
    this.kernel = kernel;
    this.session = null;
    this.outputCallback = options.outputCallback || console.log;
    
    // Shell state
    this.running = false;
    this.currentDirectory = '/';
    this.commandHistory = [];
    this.historyIndex = -1;
    this.maxHistory = options.maxHistory || 100;
    
    // Environment variables
    this.env = {
      PATH: '/usr/bin:/bin',
      HOME: '/home/user',
      USER: 'unknown',
      SHELL: '/bin/sh'
    };

    // Command registry
    this.commands = new Map();
    
    // Running background processes
    this.jobs = new Map();

    // Prompt configuration
    this.promptFormat = options.promptFormat || 'full'; // 'full' or 'short'

    this._registerDefaultCommands();
  }

  /**
   * Set active session
   * @param {object} session - User session
   */
  setSession(session) {
    if (session) {
      this.session = session;
      this.currentDirectory = session.cwd || session.homeDir || '/';
      this.env.USER = session.user;
      this.env.HOME = session.homeDir;
      this.env.SHELL = session.shell || '/bin/sh';
      if (session.env) {
        Object.assign(this.env, session.env);
      }
    } else {
      this.session = null;
      this.currentDirectory = '/';
      this.env.USER = 'unknown';
    }
  }

  /**
   * Register default built-in commands
   * @private
   */
  _registerDefaultCommands() {
    // System commands
    this.registerCommand('help', this._cmdHelp.bind(this), 'Show help information');
    this.registerCommand('uname', this._cmdUname.bind(this), 'Print system information');
    this.registerCommand('uptime', this._cmdUptime.bind(this), 'Show system uptime');
    this.registerCommand('date', this._cmdDate.bind(this), 'Print current date and time');
    this.registerCommand('whoami', this._cmdWhoami.bind(this), 'Print current user');
    this.registerCommand('who', this._cmdWho.bind(this), 'Show logged in users');
    this.registerCommand('passwd', this._cmdPasswd.bind(this), 'Change password');
    this.registerCommand('logout', this._cmdLogout.bind(this), 'Log out');
    this.registerCommand('shutdown', this._cmdShutdown.bind(this), 'Shut down the system');
    this.registerCommand('reboot', this._cmdReboot.bind(this), 'Reboot the system');
    this.registerCommand('echo', this._cmdEcho.bind(this), 'Display text or write to file');
    this.registerCommand('env', this._cmdEnv.bind(this), 'Show environment variables');
    this.registerCommand('export', this._cmdExport.bind(this), 'Set environment variable');
    this.registerCommand('clear', this._cmdClear.bind(this), 'Clear terminal screen');
    this.registerCommand('history', this._cmdHistory.bind(this), 'Show command history');
    this.registerCommand('cat', this._cmdCat.bind(this), 'Concatenate and display files');
    this.registerCommand('ls', this._cmdLs.bind(this), 'List directory contents');
    this.registerCommand('cd', this._cmdCd.bind(this), 'Change directory');
    this.registerCommand('pwd', this._cmdPwd.bind(this), 'Print working directory');
    this.registerCommand('mkdir', this._cmdMkdir.bind(this), 'Create directory');
    this.registerCommand('touch', this._cmdTouch.bind(this), 'Create empty file');
    this.registerCommand('rm', this._cmdRm.bind(this), 'Remove files or directories');
    this.registerCommand('cp', this._cmdCp.bind(this), 'Copy files');
    this.registerCommand('mv', this._cmdMv.bind(this), 'Move/rename files');
    this.registerCommand('chmod', this._cmdChmod.bind(this), 'Change permissions');
    this.registerCommand('chown', this._cmdChown.bind(this), 'Change ownership');
    this.registerCommand('find', this._cmdFind.bind(this), 'Search for files');
    this.registerCommand('tree', this._cmdTree.bind(this), 'Display directory tree');
    this.registerCommand('head', this._cmdHead.bind(this), 'Show first lines of file');
    this.registerCommand('tail', this._cmdTail.bind(this), 'Show last lines of file');
    this.registerCommand('wc', this._cmdWc.bind(this), 'Word/line/byte count');
    this.registerCommand('grep', this._cmdGrep.bind(this), 'Search text patterns');
    this.registerCommand('ps', this._cmdPs.bind(this), 'List processes');
    this.registerCommand('kill', this._cmdKill.bind(this), 'Terminate process');
    this.registerCommand('killall', this._cmdKillall.bind(this), 'Kill processes by name');
    this.registerCommand('nice', this._cmdNice.bind(this), 'Run with modified priority');
    this.registerCommand('free', this._cmdFree.bind(this), 'Show memory usage');
    this.registerCommand('df', this._cmdDf.bind(this), 'Show disk space');
    this.registerCommand('du', this._cmdDu.bind(this), 'Show directory sizes');
    this.registerCommand('ping', this._cmdPing.bind(this), 'Ping a host');
    this.registerCommand('ifconfig', this._cmdIfconfig.bind(this), 'Network interface config');
    this.registerCommand('netstat', this._cmdNetstat.bind(this), 'Network statistics');
    this.registerCommand('top', this._cmdTop.bind(this), 'Process activity viewer');
    this.registerCommand('calc', this._cmdCalc.bind(this), 'Calculator');
    this.registerCommand('edit', this._cmdEdit.bind(this), 'Text editor');
    this.registerCommand('dmesg', this._cmdDmesg.bind(this), 'Show kernel log');
    this.registerCommand('stat', this._cmdStat.bind(this), 'File status');
    this.registerCommand('ln', this._cmdLn.bind(this), 'Create links');
    this.registerCommand('alias', this._cmdAlias.bind(this), 'Create command alias');
    this.registerCommand('lab', this._cmdLab.bind(this), 'ECE lab walkthrough');
    this.registerCommand('signals', this._cmdSignals.bind(this), 'Signal integrity snapshot');
    this.registerCommand('bus', this._cmdBus.bind(this), 'Communication bus quick reference');
    this.registerCommand('adc', this._cmdAdc.bind(this), 'ADC and sampling snapshot');
    this.registerCommand('spectrum', this._cmdSpectrum.bind(this), 'Spectrum analyzer style summary');
    this.registerCommand('comm', this._cmdComm.bind(this), 'Digital communication chain summary');
    this.registerCommand('osi', this._cmdOsi.bind(this), 'OSI layer reference');
    this.registerCommand('subnet', this._cmdSubnet.bind(this), 'Subnetting quick example');
    this.registerCommand('route', this._cmdRoute.bind(this), 'Routing table summary');
    this.registerCommand('dns', this._cmdDns.bind(this), 'DNS resolution summary');
  }

  /**
   * Register a command
   * @param {string} name - Command name
   * @param {Function} handler - Command handler
   * @param {string} description - Command description
   */
  registerCommand(name, handler, description = '') {
    this.commands.set(name, { handler, description });
  }

  /**
   * Process user input and return output
   * @param {string} input - User input string
   * @returns {Promise<string>} Command output
   */
  async execute(input) {
    if (!input || !input.trim()) return '';
    
    const trimmed = input.trim();
    
    // Add to history
    this.commandHistory.push(trimmed);
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory.shift();
    }
    this.historyIndex = this.commandHistory.length;
    
    // Update session history if exists
    if (this.session && this.session.history) {
      this.session.history.push(trimmed);
    }

    // Handle history reference
    if (trimmed.startsWith('!')) {
      return this._handleHistoryRef(trimmed);
    }

    // Handle pipes and redirects
    const parsed = Utils.parseCommandLine(trimmed);
    
    if (parsed.commands.length === 1 && parsed.redirects.length === 0) {
      return this._executeSingle(trimmed);
    }
    
    return this._executePipeline(parsed);
  }

  /**
   * Execute a single command
   * @param {string} input - Command input
   * @returns {Promise<string>} Output
   * @private
   */
  async _executeSingle(input) {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0];
    const args = tokens.slice(1);

    // Check for background execution
    const bg = args[args.length - 1] === '&';
    if (bg) args.pop();

    // Handle aliases
    const command = this._resolveAlias(cmd);
    const cmdInfo = this.commands.get(command);

    if (!cmdInfo) {
      return `mini-os: command not found: ${cmd}`;
    }

    try {
      if (bg) {
        return this._executeBackground(command, args);
      }
      const result = await cmdInfo.handler(args);
      return result !== undefined && result !== null ? String(result) : '';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Execute pipeline with redirects
   * @param {object} parsed - Parsed command line
   * @returns {Promise<string>} Output
   * @private
   */
  async _executePipeline(parsed) {
    let output = '';
    
    for (let i = 0; i < parsed.commands.length; i++) {
      const { cmd, args } = parsed.commands[i];
      const cmdInfo = this.commands.get(cmd);
      
      if (!cmdInfo) {
        return `mini-os: command not found: ${cmd}`;
      }
      
      try {
        output = await cmdInfo.handler(args, output);
      } catch (error) {
        return `Error in ${cmd}: ${error.message}`;
      }
    }
    
    // Handle redirects
    for (const redirect of parsed.redirects) {
      const resolvedPath = Utils.resolvePath(redirect.target, this.currentDirectory);
      
      if (redirect.type === 'write') {
        const result = this.kernel.syscall('write', resolvedPath, output, 
          this.session?.user || 'root', this.session?.role || 'admin');
        if (!result) return `Permission denied: ${redirect.target}`;
        return '';
      } else if (redirect.type === 'append') {
        const existing = this.kernel.syscall('read', resolvedPath, 
          this.session?.user || 'root', this.session?.role || 'admin') || '';
        const result = this.kernel.syscall('append', resolvedPath, output, 
          this.session?.user || 'root', this.session?.role || 'admin');
        if (!result) return `Permission denied: ${redirect.target}`;
        return '';
      }
    }
    
    return output;
  }

  /**
   * Execute command in background
   * @param {string} command - Command name
   * @param {string[]} args - Arguments
   * @returns {string} Output
   * @private
   */
  _executeBackground(command, args) {
    const process = this.kernel.syscall('createProcess', {
      name: command,
      args: args,
      user: this.session?.user || 'root',
      parentPid: this.session?.pid || 0,
      background: true
    });
    
    if (process.error) {
      return process.error;
    }
    
    this.jobs.set(process.pid, {
      pid: process.pid,
      command: `${command} ${args.join(' ')}`,
      state: 'running'
    });
    
    return `[${process.pid}] ${command} ${args.join(' ')}\nProcess started in background.`;
  }

  /**
   * Handle history reference (!N)
   * @param {string} input - Input with history ref
   * @returns {string} Output
   * @private
   */
  _handleHistoryRef(input) {
    const num = parseInt(input.substring(1), 10);
    
    if (isNaN(num)) {
      return 'Usage: !<number> (e.g., !1 to run first command)';
    }
    
    const index = num - 1;
    if (index < 0 || index >= this.commandHistory.length) {
      return `History reference out of range (1-${this.commandHistory.length})`;
    }
    
    const cmd = this.commandHistory[index];
    this.outputCallback(`${cmd}`);
    return this._executeSingle(cmd);
  }

  /**
   * Resolve alias
   * @param {string} cmd - Command name
   * @returns {string} Resolved command
   * @private
   */
  _resolveAlias(cmd) {
    const aliases = this.env.ALIASES || {};
    return aliases[cmd] || cmd;
  }

  /**
   * Generate shell prompt
   * @returns {string} Prompt string
   */
  getPrompt() {
    if (!this.session) {
      return 'login: ';
    }

    const user = this.session.user;
    const hostname = this.kernel.config.hostname || 'mini-os';
    const cwd = this._shortenPath(this.currentDirectory);
    
    if (this.promptFormat === 'full') {
      const roleSymbol = this.session.role === 'admin' ? '#' : '$';
      return `${user}@${hostname}:${cwd}${roleSymbol} `;
    }
    
    return `${this.currentDirectory}> `;
  }

  /**
   * Shorten path for prompt display
   * @param {string} path - Full path
   * @returns {string} Shortened path
   * @private
   */
  _shortenPath(path) {
    if (path === '/') return '/';
    if (this.session && path.startsWith(this.session.homeDir)) {
      return '~' + path.substring(this.session.homeDir.length);
    }
    return path;
  }

  // ===== COMMAND IMPLEMENTATIONS =====

  _cmdHelp(args) {
    const categories = {
      'System': ['help', 'uname', 'uptime', 'date', 'whoami', 'who', 'passwd', 'logout', 'shutdown', 'reboot', 'dmesg'],
      'Filesystem': ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'cat', 'chmod', 'chown', 'find', 'tree', 'head', 'tail', 'wc', 'grep', 'stat', 'ln'],
      'Process': ['ps', 'kill', 'killall', 'nice', 'top'],
      'System Info': ['free', 'df', 'du'],
      'Network': ['ping', 'ifconfig', 'netstat'],
      'Shell': ['echo', 'env', 'export', 'clear', 'history', 'alias', 'calc', 'edit'],
      'ECE Lab': ['lab', 'signals', 'bus', 'adc', 'spectrum', 'comm'],
      'Computer Networks': ['osi', 'subnet', 'route', 'dns']
    };

    let output = `Mini OS Shell - Available Commands\n${'='.repeat(40)}\n\n`;
    
    for (const [category, cmds] of Object.entries(categories)) {
      output += `${category}:\n`;
      for (const cmd of cmds) {
        const info = this.commands.get(cmd);
        if (info) {
          output += `  ${cmd.padEnd(12)} - ${info.description}\n`;
        }
      }
      output += '\n';
    }
    
    output += `Tip: Use 'command --help' for more info on specific commands.\n`;
    output += `Use | to pipe commands, > to redirect output, >> to append.\n`;
    output += `Use & for background execution, !N to rerun history.\n`;
    
    return output;
  }

  _cmdUname(args) {
    const info = this.kernel.syscall('uname');
    if (args.includes('-a')) {
      return `${info.name} ${info.hostname} ${info.version} mini-os-kernel JavaScript ${new Date().toLocaleDateString()} x86_64 MiniOS/JavaScript`;
    }
    return info.name;
  }

  _cmdUptime() {
    const ms = this.kernel.syscall('uptime');
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let result = ` ${Utils.getCurrentDateTime()} up `;
    if (days > 0) result += `${days} day${days > 1 ? 's' : ''}, `;
    result += `${(hours % 24).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    
    const procStats = this.kernel.syscall('listProcesses', true);
    result += `, ${procStats ? procStats.length : 0} processes`;
    
    return result;
  }

  _cmdDate() {
    return Utils.getCurrentDateTime();
  }

  _cmdWhoami() {
    return this.session ? this.session.user : 'not logged in';
  }

  _cmdWho() {
    const users = this.kernel.userManager.getLoggedInUsers();
    if (users.length === 0) return 'No users logged in.';
    
    let output = 'USER     TTY    LOGIN TIME   IDLE   WHERE\n';
    for (const u of users) {
      const idle = Utils.formatTime(u.idle);
      const loginTime = new Date(u.loginTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      output += `${u.user.padEnd(9)}pts/0  ${loginTime}  ${idle}  ${u.cwd}\n`;
    }
    return output.trimEnd();
  }

  async _cmdPasswd(args) {
    if (args.length === 0 && this.session) {
      return 'Usage: passwd <new-password>';
    }
    
    // Simple password change (in real system would prompt securely)
    if (args.length === 2) {
      const [current, newPass] = args;
      const result = this.kernel.syscall('changePassword', this.session.user, current, newPass);
      if (result.error) return result.error;
      return 'Password changed successfully.';
    }
    
    return 'Usage: passwd <current-password> <new-password>';
  }

  _cmdLogout() {
    if (!this.session) return 'Not logged in.';
    
    const username = this.session.user;
    this.kernel.syscall('logout', this.session.id);
    this.session = null;
    return `Logged out ${username}.`;
  }

  _cmdShutdown() {
    this.kernel.shutdown();
    return 'System shutting down...';
  }

  _cmdReboot() {
    this.kernel.reboot();
    return 'System rebooting...';
  }

  _cmdEcho(args, pipedInput) {
    // Join all args and handle quotes
    let text = args.join(' ');
    
    // Remove surrounding quotes if present
    if ((text.startsWith('"') && text.endsWith('"')) || 
        (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1);
    }
    
    // Expand variables
    text = text.replace(/\$(\w+|\{[^}]+\})/g, (match, varName) => {
      varName = varName.replace(/[{}]/g, '');
      return this.env[varName] || '';
    });
    
    return pipedInput !== undefined ? pipedInput + text : text;
  }

  _cmdEnv() {
    let output = '';
    for (const [key, value] of Object.entries(this.env)) {
      output += `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
    }
    return output.trimEnd();
  }

  _cmdExport(args) {
    for (const arg of args) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1);
        this.env[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    }
    return '';
  }

  _cmdClear() {
    // Signal to clear terminal
    return '__CLEAR__';
  }

  _cmdHistory() {
    let output = '';
    for (let i = 0; i < this.commandHistory.length; i++) {
      output += `${(i + 1).toString().padStart(4)}  ${this.commandHistory[i]}\n`;
    }
    return output.trimEnd();
  }

  _cmdCat(args, input) {
    if (args.length === 0) {
      return input || '';
    }
    
    let output = '';
    for (const arg of args) {
      const resolvedPath = Utils.resolvePath(arg, this.currentDirectory);
      const content = this.kernel.syscall('read', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin');
      if (content === null || content === undefined) {
        output += `cat: ${arg}: No such file or directory\n`;
      } else {
        output += content + (args.length > 1 ? '' : '');
      }
    }
    return output;
  }

  _cmdLs(args) {
    const { flags, positional } = Utils.parseArgs(args);
    const path = positional[0] ? Utils.resolvePath(positional[0], this.currentDirectory) : this.currentDirectory;
    
    const showAll = flags.has('-a') || flags.has('-la') || flags.has('-al');
    const showLong = flags.has('-l') || flags.has('-la') || flags.has('-al');
    
    const entries = this.kernel.syscall('list', path, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (!entries) {
      return `ls: cannot access '${args[positional[0] ? 0 : ''] || '.'}': No such directory or permission denied`;
    }
    
    let filtered = entries;
    if (!showAll) {
      filtered = entries.filter(e => !e.name.startsWith('.'));
    }
    
    if (showLong) {
      let output = `total ${filtered.length}\n`;
      for (const entry of filtered) {
        const type = entry.type === 'directory' ? 'd' : '-';
        const size = entry.type === 'directory' ? '-' : Utils.formatBytes(entry.size, false);
        const date = entry.modified.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const time = entry.modified.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        output += `${type}${entry.modeStr} ${entry.owner.padEnd(6)} ${entry.group.padEnd(6)} ${String(size).padStart(8)} ${date} ${time} ${entry.name}\n`;
      }
      return output.trimEnd();
    }
    
    // Simple listing
    return filtered.map(e => e.type === 'directory' ? e.name + '/' : e.name).join('  ');
  }

  _cmdCd(args) {
    const target = args[0] || this.env.HOME || this.session?.homeDir || '/';
    let resolvedPath = Utils.resolvePath(target, this.currentDirectory);
    
    // Handle ~ for home
    if (target.startsWith('~')) {
      resolvedPath = Utils.resolvePath(target.replace('~', this.env.HOME || '/home/user'), '/');
    }
    
    const entry = this.kernel.fileSystem.resolve(resolvedPath);
    if (!entry || entry.type !== 'directory') {
      return `cd: no such directory: ${target}`;
    }
    
    const fs = this.kernel.fileSystem;
    if (!fs.checkPermission(entry, 'execute', this.session?.user || 'root', this.session?.role || 'admin')) {
      return `cd: permission denied: ${target}`;
    }
    
    this.currentDirectory = resolvedPath;
    if (this.session) this.session.cwd = resolvedPath;
    return '';
  }

  _cmdPwd() {
    return this.currentDirectory;
  }

  _cmdMkdir(args) {
    const { flags, positional } = Utils.parseArgs(args);
    if (positional.length === 0) return 'mkdir: missing operand';

    let output = '';
    for (const dir of positional) {
      const resolvedPath = Utils.resolvePath(dir, this.currentDirectory);
      const result = this.kernel.syscall('mkdir', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin');
      if (!result) output += `mkdir: cannot create directory '${dir}'\n`;
    }
    return output;
  }

  _cmdTouch(args) {
    if (args.length === 0) return 'touch: missing operand';
    
    let output = '';
    for (const file of args) {
      const resolvedPath = Utils.resolvePath(file, this.currentDirectory);
      const existing = this.kernel.syscall('read', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin');
      
      if (existing !== null) {
        // Update timestamp - just rewrite
        this.kernel.syscall('write', resolvedPath, existing, 
          this.session?.user || 'root', this.session?.role || 'admin');
      } else {
        // Create file
        const result = this.kernel.syscall('write', resolvedPath, '', 
          this.session?.user || 'root', this.session?.role || 'admin');
        if (!result) output += `touch: cannot create '${file}'\n`;
      }
    }
    return output;
  }

  _cmdRm(args) {
    const { flags, positional } = Utils.parseArgs(args);
    if (positional.length === 0) return 'rm: missing operand';
    
    const recursive = flags.has('-r') || flags.has('-rf') || flags.has('-fr');
    const force = flags.has('-f') || flags.has('-rf') || flags.has('-fr');
    
    let output = '';
    for (const target of positional) {
      const resolvedPath = Utils.resolvePath(target, this.currentDirectory);
      const result = this.kernel.syscall('remove', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin', recursive);
      
      if (!result && !force) {
        if (!recursive) {
          output += `rm: cannot remove '${target}': Is a directory\n`;
        } else {
          output += `rm: cannot remove '${target}': Permission denied\n`;
        }
      }
    }
    return output;
  }

  _cmdCp(args) {
    if (args.length < 2) return 'cp: missing file operand';
    
    const src = Utils.resolvePath(args[0], this.currentDirectory);
    const dest = Utils.resolvePath(args[1], this.currentDirectory);
    
    const content = this.kernel.syscall('read', src, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (content === null || content === undefined) {
      return `cp: cannot access '${args[0]}': No such file`;
    }
    
    const result = this.kernel.syscall('write', dest, content, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    return result ? '' : `cp: cannot create '${args[1]}': Permission denied`;
  }

  _cmdMv(args) {
    if (args.length < 2) return 'mv: missing file operand';
    
    const result = this._cmdCp([args[0], args[1]]);
    if (result) return result;
    
    const resolvedPath = Utils.resolvePath(args[0], this.currentDirectory);
    const removeResult = this.kernel.syscall('remove', resolvedPath, 
      this.session?.user || 'root', this.session?.role || 'admin', true);
    
    return '';
  }

  _cmdChmod(args) {
    if (args.length < 2) return 'chmod: missing operand';
    
    const mode = parseInt(args[0], 8);
    if (isNaN(mode)) return `chmod: invalid mode: ${args[0]}`;
    
    const resolvedPath = Utils.resolvePath(args[1], this.currentDirectory);
    const result = this.kernel.syscall('chmod', resolvedPath, mode, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    return result ? '' : `chmod: cannot access '${args[1]}': Permission denied`;
  }

  _cmdChown(args) {
    if (args.length < 2) return 'chown: missing operand';
    if (this.session?.role !== 'admin') return 'chown: Operation not permitted';
    
    const resolvedPath = Utils.resolvePath(args[1], this.currentDirectory);
    const result = this.kernel.syscall('chown', resolvedPath, args[0], 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    return result ? '' : `chown: cannot access '${args[1]}'`;
  }

  _cmdFind(args) {
    const path = args[0] || '.';
    let pattern = '';
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name' && i + 1 < args.length) {
        pattern = args[i + 1];
        break;
      }
    }
    
    const resolvedPath = Utils.resolvePath(path, this.currentDirectory);
    const results = this.kernel.syscall('find', resolvedPath, pattern, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (!results || results.length === 0) return '';
    
    // Make paths relative
    return results.map(r => {
      if (path === '.') {
        return '.' + r.substring(resolvedPath === '/' ? 1 : resolvedPath.length) || '.';
      }
      return r.replace(resolvedPath, path) || path;
    }).join('\n');
  }

  _cmdTree(args) {
    const path = args[0] ? Utils.resolvePath(args[0], this.currentDirectory) : this.currentDirectory;
    return this.kernel.syscall('tree', path, 
      this.session?.user || 'root', this.session?.role || 'admin');
  }

  _cmdHead(args) {
    const { flags, positional } = Utils.parseArgs(args);
    const n = flags.get('-n') || 10;
    
    if (positional.length === 0) return 'head: missing operand';
    
    const resolvedPath = Utils.resolvePath(positional[0], this.currentDirectory);
    const content = this.kernel.syscall('read', resolvedPath, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (content === null) return `head: cannot open '${positional[0]}': No such file`;
    
    return content.split('\n').slice(0, n).join('\n');
  }

  _cmdTail(args) {
    const { flags, positional } = Utils.parseArgs(args);
    const n = flags.get('-n') || 10;
    
    if (positional.length === 0) return 'tail: missing operand';
    
    const resolvedPath = Utils.resolvePath(positional[0], this.currentDirectory);
    const content = this.kernel.syscall('read', resolvedPath, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (content === null) return `tail: cannot open '${positional[0]}': No such file`;
    
    const lines = content.split('\n');
    return lines.slice(-n).join('\n');
  }

  _cmdWc(args) {
    const { flags, positional } = Utils.parseArgs(args);
    
    if (positional.length === 0) return 'wc: missing operand';
    
    let output = '';
    for (const file of positional) {
      const resolvedPath = Utils.resolvePath(file, this.currentDirectory);
      const content = this.kernel.syscall('read', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin');
      
      if (content === null) {
        output += `wc: ${file}: No such file\n`;
        continue;
      }
      
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(w => w).length;
      const bytes = content.length;
      
      const showLines = !flags.has('-c') && !flags.has('-w');
      const showWords = flags.has('-w') || (!flags.has('-l') && !flags.has('-c'));
      const showBytes = flags.has('-c') || (!flags.has('-l') && !flags.has('-w'));
      
      const parts = [];
      if (showLines) parts.push(lines.toString().padStart(7));
      if (showWords) parts.push(words.toString().padStart(7));
      if (showBytes) parts.push(bytes.toString().padStart(7));
      
      output += `${parts.join(' ')} ${file}\n`;
    }
    return output.trimEnd();
  }

  _cmdGrep(args) {
    if (args.length < 2) return 'grep: missing pattern';
    
    const pattern = args[0];
    const files = args.slice(1);
    
    const regex = (() => {
      try {
        return new RegExp(pattern);
      } catch (e) {
        return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    })();
    
    let output = '';
    for (const file of files) {
      const resolvedPath = Utils.resolvePath(file, this.currentDirectory);
      const content = this.kernel.syscall('read', resolvedPath, 
        this.session?.user || 'root', this.session?.role || 'admin');
      
      if (content === null) {
        output += `grep: ${file}: No such file\n`;
        continue;
      }
      
      const matches = content.split('\n').filter(line => regex.test(line));
      for (const line of matches) {
        output += files.length > 1 ? `${file}:${line}\n` : `${line}\n`;
      }
    }
    return output.trimEnd();
  }

  _cmdPs(args) {
    const { flags } = Utils.parseArgs(args);
    const full = flags.has('-aux') || flags.has('-ef');
    
    const processes = this.kernel.syscall('listProcesses', full);
    if (!processes || processes.length === 0) {
      return 'No processes running.';
    }
    
    let output = '  PID  PPID NAME         STATE    USER\n';
    for (const p of processes) {
      const name = (p.name + ' ' + (p.args || '')).substring(0, 15).padEnd(13);
      output += `${String(p.pid).padStart(5)} ${String(p.ppid).padStart(5)} ${name} ${(p.state || '').substring(0, 8).padEnd(9)}${p.user || 'root'}\n`;
    }
    return output.trimEnd();
  }

  _cmdKill(args) {
    const { flags, positional } = Utils.parseArgs(args);
    if (positional.length === 0) return 'kill: missing operand';
    
    const pid = parseInt(positional[0], 10);
    if (isNaN(pid)) return `kill: invalid PID: ${positional[0]}`;
    
    const signal = flags.has('-9') ? 'SIGKILL' : 'SIGTERM';
    const result = this.kernel.syscall('kill', pid, signal);
    
    return result === true ? '' : `kill: (${pid}) - No such process`;
  }

  _cmdKillall(args) {
    if (args.length === 0) return 'killall: missing operand';
    
    const name = args[0];
    const processes = this.kernel.processManager.getProcessesByName(name);
    
    if (processes.length === 0) {
      return `killall: ${name}: no process found`;
    }
    
    for (const p of processes) {
      this.kernel.processManager.sendSignal(p.pid, 'SIGTERM');
    }
    
    return '';
  }

  _cmdNice(args) {
    if (args.length === 0) return 'nice: missing operand';
    return 'nice: priority adjustment not yet implemented';
  }

  _cmdFree() {
    const stats = this.kernel.syscall('memStats');
    if (!stats) return 'Memory stats unavailable';
    
    const total = Utils.formatBytes(stats.totalSize, true);
    const used = Utils.formatBytes(stats.allocated, true);
    const free = Utils.formatBytes(stats.free, true);
    const pct = stats.usagePercent;
    
    return `              total        used        free\nMemory:   ${total.padStart(10)}   ${used.padStart(10)}   ${free.padStart(10)} (${pct}% used)\n\nPages: ${stats.pagesUsed}/${stats.pagesTotal} used`;
  }

  _cmdDf(args) {
    const diskStats = this.kernel.syscall('getDiskStats');
    const human = args.includes('-h');
    
    const total = human ? '10.0M' : '10485760';
    const fsStats = this.kernel.fileSystem.getStats();
    const used = human ? Utils.formatBytes(fsStats.usedSpace, true) : fsStats.usedSpace;
    const free = human ? Utils.formatBytes(10485760 - fsStats.usedSpace, true) : (10485760 - fsStats.usedSpace);
    const pct = ((fsStats.usedSpace / 10485760) * 100).toFixed(0);
    
    return `Filesystem      Size  Used  Avail  Use%  Mounted on\n/dev/sda1       ${total}  ${used}  ${free}   ${pct}%   /`;
  }

  _cmdDu(args) {
    const path = args[args.length - 1] ? Utils.resolvePath(args[args.length - 1], this.currentDirectory) : this.currentDirectory;
    const human = args.includes('-h') || args.includes('-sh');
    
    let totalSize = 0;
    let fileCount = 0;
    
    const entry = this.kernel.fileSystem.resolve(path);
    if (entry) {
      const countSizes = (e) => {
        if (e.content) {
          totalSize += e.content.length;
          fileCount++;
        }
        if (e.children) {
          for (const child of e.children.values()) {
            countSizes(child);
          }
        }
      };
      countSizes(entry);
    }
    
    const size = human ? Utils.formatBytes(totalSize, true) : totalSize.toString();
    const humanPath = path === this.currentDirectory ? '.' : path;
    
    return `${size.padStart(8)}  ${humanPath}`;
  }

  _cmdPing(args) {
    if (args.length === 0) return 'ping: missing host operand';
    
    const host = args[0];
    let output = `PING ${host} (${host === 'localhost' ? '127.0.0.1' : this.kernel.deviceManager.ping(host).ip}) 32 bytes of data:\n`;
    
    for (let i = 0; i < 4; i++) {
      const result = this.kernel.deviceManager.ping(host);
      output += `32 bytes from ${result.ip}: time=${result.time}ms TTL=${result.ttl}\n`;
    }
    
    output += `\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% loss`;
    
    return output;
  }

  _cmdIfconfig() {
    const interfaces = this.kernel.syscall('getNetworkInterfaces');
    let output = '';
    
    for (const iface of interfaces) {
      output += `${iface.name}: flags=${iface.status === 'up' ? 'UP' : 'DOWN'} mtu ${iface.mtu}\n`;
      output += `  inet ${iface.ip} netmask ${iface.netmask}\n`;
      output += `  ether ${iface.mac}\n\n`;
    }
    return output.trimEnd();
  }

  _cmdNetstat() {
    const stats = this.kernel.deviceManager.getNetworkStats();
    return `Active Internet connections\nProto Recv-Q Send-Q Local Address   State\ntcp   0      0      0.0.0.0:80     LISTEN\ntcp   0      0      0.0.0.0:443    LISTEN\nudp   0      0      0.0.0.0:53     LISTEN`;
  }

  _cmdTop() {
    const uptime = this.kernel.syscall('uptime');
    const memStats = this.kernel.syscall('memStats');
    const processes = this.kernel.syscall('listProcesses', true) || [];
    
    let output = `top - ${Utils.getCurrentDateTime()} uptime ${Utils.formatTime(uptime)}\n`;
    output += `${processes.length} processes, 1 running\n\n`;
    output += `%MEM: ${memStats.usagePercent}% used of ${Utils.formatBytes(memStats.totalSize, true)}\n\n`;
    output += '  PID  USER    %CPU  %MEM  STATE    COMMAND\n';
    
    for (const p of processes.slice(0, 10)) {
      const cpu = (Math.random() * 5).toFixed(1);
      const mem = (Math.random() * 2).toFixed(1);
      output += `${String(p.pid).padStart(5)}  ${(p.user || 'root').padEnd(8)}${cpu.padStart(5)} ${(mem + '%').padStart(6)} ${(p.state || 'TERM').padEnd(9)}${p.name}\n`;
    }
    
    return output.trimEnd();
  }

  _cmdCalc(args) {
    if (args.length === 0) {
      return 'Usage: calc <expression>\nExample: calc 2 + 2\nSupported: +, -, *, /, %, ^, ()';
    }
    
    const expr = args.join(' ');
    try {
      // Simple safe evaluation
      const sanitized = expr.replace(/[^0-9+\-*/%().,^ ]/g, '');
      if (sanitized !== expr.replace(/\^/g, '**')) {
        return 'calc: invalid characters in expression';
      }
      const jsExpr = expr.replace(/\^/g, '**');
      const result = Function('"use strict"; return (' + jsExpr + ')')();
      return `= ${result}`;
    } catch (error) {
      return `calc: invalid expression: ${expr}`;
    }
  }

  _cmdEdit(args) {
    const filename = args[0];
    if (!filename) {
      return 'Usage: edit <filename>';
    }
    
    const resolvedPath = Utils.resolvePath(filename, this.currentDirectory);
    return `__EDIT__${resolvedPath}`;
  }

  _cmdDmesg(args) {
    const lines = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1], 10) : 20;
    const logs = this.kernel.getLog({ lines });
    
    let output = '[System Log]\n';
    for (const log of logs) {
      const time = new Date(log.timestamp).toLocaleTimeString();
      output += `[${time}] [${log.component}] ${log.message}\n`;
    }
    return output.trimEnd();
  }

  _cmdStat(args) {
    if (args.length === 0) return 'stat: missing operand';
    
    const resolvedPath = Utils.resolvePath(args[0], this.currentDirectory);
    const info = this.kernel.syscall('stat', resolvedPath, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    if (!info) return `stat: cannot stat '${args[0]}': No such file`;
    
    return `  File: ${info.name}\n  Size: ${info.size} bytes\n  Type: ${info.type}\n  Access: ${info.modeStr}\n  Uid: (${info.owner}) Gid: (${info.group})\n  Created: ${info.created}\n  Modified: ${info.modified}\n  Accessed: ${info.accessed}`;
  }

  _cmdLn(args) {
    if (args.length < 2) return 'ln: missing operand';
    
    const isSymbolic = args.includes('-s');
    const target = isSymbolic ? args[args.indexOf('-s') + 1] || args[0] : args[0];
    const linkPath = args[args.length - 1];
    
    if (args.length === 2 && !isSymbolic) {
      return 'ln: hard links not supported (use -s for symbolic links)';
    }
    
    const resolvedPath = Utils.resolvePath(linkPath, this.currentDirectory);
    const result = this.kernel.fileSystem.symlink(target, resolvedPath, 
      this.session?.user || 'root', this.session?.role || 'admin');
    
    return result ? '' : `ln: failed to create symbolic link '${linkPath}'`;
  }

  _cmdAlias(args) {
    if (args.length === 0) {
      // Show all aliases
      const aliases = this.env.ALIASES || {};
      if (Object.keys(aliases).length === 0) return 'No aliases defined.';
      let output = '';
      for (const [name, cmd] of Object.entries(aliases)) {
        output += `alias ${name}='${cmd}'\n`;
      }
      return output.trimEnd();
    }
    
    for (const arg of args) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const name = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1).replace(/^['"]|['"]$/g, '');
        if (!this.env.ALIASES) this.env.ALIASES = {};
        this.env.ALIASES[name] = value;
      }
    }
    return '';
  }

  _cmdLab() {
    return [
      'Mini OS Lab Walkthrough',
      '=======================',
      '',
      'Use this simulator as an ECE systems narrative:',
      '  1. Explain round-robin scheduling as task sharing in constrained controllers.',
      '  2. Connect memory allocation to buffer planning for sampled signals.',
      '  3. Use adc and signals to discuss measurement, quantization, and noise.',
      '  4. Use spectrum and comm to connect the OS shell to communication topics.',
      '  5. Use osi, subnet, route, and dns for Computer Networks subject topics.',
      '  6. Use ping/ifconfig/netstat to discuss communication visibility and telemetry.',
      '  7. Open the lab files to inspect system notes and simulated reports.',
      '',
      'Helpful files:',
      '  /home/user/ece-quickstart.txt',
      '  /projects/ece-system-brief.txt',
      '  /projects/case-studies/signal-chain.txt',
      '  /projects/communication-link.txt',
      '  /projects/adc-notes.txt',
      '  /projects/networking-fundamentals.txt',
      '  /etc/bus-map.conf',
      '  /etc/rf-profile.conf',
      '  /etc/osi-reference.txt',
      '  /lab/telemetry.log',
      '  /lab/channel-report.txt',
      '  /lab/spectrum-scan.txt',
      '  /lab/routing-table.txt',
      '  /lab/dns-cache.txt'
    ].join('\n');
  }

  _cmdSignals() {
    const channels = [
      { name: 'channel_A', freq: 48.0, amplitude: 3.28, snr: 37.8, status: 'stable' },
      { name: 'channel_B', freq: 12.5, amplitude: 1.82, snr: 33.1, status: 'tracking' },
      { name: 'uplink_if', freq: 2.4, amplitude: 0.94, snr: 29.7, status: 'nominal' }
    ];

    let output = 'Signal Integrity Snapshot\n';
    output += '========================\n';
    output += 'SOURCE        FREQ(kHz)  AMP(V)  SNR(dB)  STATUS\n';

    for (const channel of channels) {
      output += `${channel.name.padEnd(13)}${channel.freq.toFixed(1).padStart(9)}${channel.amplitude.toFixed(2).padStart(8)}${channel.snr.toFixed(1).padStart(9)}  ${channel.status}\n`;
    }

    output += '\nInterpretation: system margins look healthy for a classroom telemetry demo.';
    return output.trimEnd();
  }

  _cmdBus() {
    return [
      'Communication Bus Map',
      '=====================',
      'BUS       ROLE                         ECE CONTEXT',
      'UART      debug_console, telemetry     serial debug and low-speed data links',
      'SPI       flash, adc_frontend          high-speed peripheral exchange',
      'I2C       rtc, environment_sensor      short-distance sensor configuration',
      'CAN       motor_cluster                robust shared-control communication',
      'ETHERNET  dashboard_uplink             lab gateway and monitoring network',
      '',
      'Tip: run "cat /etc/bus-map.conf" for the configured endpoints.'
    ].join('\n');
  }

  _cmdAdc() {
    return [
      'ADC Acquisition Snapshot',
      '========================',
      'Resolution       : 12-bit SAR ADC',
      'Sampling rate    : 48 kSamples/s',
      'Reference voltage: 3.30 V',
      'Input range      : 0.00 V to 3.30 V',
      'LSB size         : 0.81 mV',
      'Observed ENOB    : 10.8 bits',
      'Anti-alias note  : sampling rate exceeds 2x highest tracked tone',
      '',
      'Interpretation: this command helps relate OS buffers and timing to real acquisition systems.'
    ].join('\n');
  }

  _cmdSpectrum() {
    return [
      'Spectrum Scan',
      '=============',
      'BAND        CENTER(MHz)  BW(kHz)  POWER(dBm)  NOTE',
      'IF_STAGE        10.700      180      -34.2    narrowband IF channel',
      'TELEMETRY      433.920       25      -41.5    low-power uplink beacon',
      'WIFI_REF      2400.000    20000      -57.8    environmental interferer',
      'HARMONIC       867.840       18      -62.4    second harmonic trace',
      '',
      'Tip: compare this with /lab/spectrum-scan.txt for a file-based lab note.'
    ].join('\n');
  }

  _cmdComm() {
    return [
      'Digital Communication Chain',
      '===========================',
      'Source          : telemetry packets from field sensor node',
      'Line coding     : NRZ framing with packet header and checksum',
      'Modulation      : QPSK baseband model',
      'Channel         : additive noise + low-rate burst interference',
      'Receiver        : matched filter -> symbol timing -> demod -> CRC check',
      'Measured BER    : 2.1e-4',
      'Link margin     : 11.4 dB',
      '',
      'This connects communication theory to the simulator by turning shell output into a lab summary.'
    ].join('\n');
  }

  _cmdOsi() {
    return [
      'OSI Layer Reference',
      '===================',
      '7 Application : HTTP, DNS, SMTP',
      '6 Presentation: encryption, formatting, compression',
      '5 Session     : connection management and dialogue control',
      '4 Transport   : TCP reliability, UDP low-overhead delivery',
      '3 Network     : IP addressing and routing',
      '2 Data Link   : MAC, framing, switching, error detection',
      '1 Physical    : signals, media, connectors, modulation support',
      '',
      'Tip: read /etc/osi-reference.txt for a file-based summary.'
    ].join('\n');
  }

  _cmdSubnet() {
    return [
      'Subnetting Example',
      '==================',
      'Network address : 192.168.10.0/24',
      'Borrowed bits   : 2',
      'New prefix      : /26',
      'Subnets created : 4',
      'Hosts per subnet: 62 usable',
      '',
      'Example subnet ranges:',
      '  192.168.10.0/26    hosts 192.168.10.1  - 192.168.10.62',
      '  192.168.10.64/26   hosts 192.168.10.65 - 192.168.10.126',
      '  192.168.10.128/26  hosts 192.168.10.129 - 192.168.10.190',
      '  192.168.10.192/26  hosts 192.168.10.193 - 192.168.10.254'
    ].join('\n');
  }

  _cmdRoute() {
    return [
      'Routing Table Summary',
      '=====================',
      'Destination        Gateway         Interface   Metric',
      '0.0.0.0/0          192.168.1.1     eth0        10',
      '127.0.0.0/8        0.0.0.0         lo          0',
      '192.168.1.0/24     0.0.0.0         eth0        0',
      '10.10.0.0/16       192.168.1.254   eth0        25',
      '',
      'Tip: open /lab/routing-table.txt for static-route notes.'
    ].join('\n');
  }

  _cmdDns() {
    return [
      'DNS Resolution Snapshot',
      '=======================',
      'Resolver       : 8.8.8.8',
      'Search domain  : lab.local',
      'Cached records : 4',
      '',
      'telemetry.lab  -> 98.41.127.45',
      'gateway.lab    -> 192.168.1.1',
      'scope.lab      -> 192.168.1.44',
      'logger.lab     -> 10.10.0.18',
      '',
      'Tip: open /lab/dns-cache.txt for a cache view and TTL values.'
    ].join('\n');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Shell;
}
