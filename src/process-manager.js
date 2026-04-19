// WHY: Process manager handles process lifecycle, scheduling, and IPC
// CONTEXT: Core OS component for process creation, scheduling (round-robin), and management

class ProcessManager {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.maxProcesses = options.maxProcesses || 64;
    this.timeQuantum = options.timeQuantum || 100; // ms per time slice
    
    // Process states
    this.STATES = {
      NEW: 'NEW',
      READY: 'READY',
      RUNNING: 'RUNNING',
      WAITING: 'WAITING',
      TERMINATED: 'TERMINATED'
    };
    
    // Process table: pid -> process object
    this.processTable = new Map();
    
    // Ready queue for round-robin scheduling
    this.readyQueue = [];
    
    // Currently running process
    this.currentProcess = null;
    
    // Process ID counter
    this._nextPid = 1;
    
    // Scheduler interval
    this._schedulerInterval = null;
    
    // Statistics
    this.stats = {
      totalCreated: 0,
      totalTerminated: 0,
      totalContextSwitches: 0,
      maxConcurrentProcesses: 0
    };

    // Background process output storage
    this._backgroundOutput = new Map();

    // Output callback (set by OS)
    this.outputCallback = null;
  }

  /**
   * Create a new process
   * @param {object} options - Process options
   * @param {string} options.name - Process name
   * @param {Function} options.entry - Entry point function
   * @param {number} options.pid - Process ID (optional)
   * @param {number} options.parentPid - Parent process ID
   * @param {number} options.priority - Priority 1-10 (default 5)
   * @param {string} options.user - Username
   * @param {array} options.args - Command arguments
   * @param {boolean} options.background - Whether to run in background
   * @returns {object} Created process
   */
  createProcess(options) {
    if (this.processTable.size >= this.maxProcesses) {
      return { error: 'Maximum process limit reached' };
    }

    const pid = options.pid || this._nextPid++;
    const process = {
      pid: pid,
      name: options.name || 'unnamed',
      state: this.STATES.NEW,
      priority: Math.min(10, Math.max(1, options.priority || 5)),
      parentPid: options.parentPid || 0,
      user: options.user || 'unknown',
      args: options.args || [],
      background: options.background || false,
      // Virtual memory info
      memory: {
        allocated: 0,
        pages: []
      },
      // Execution context
      context: {
        entry: options.entry || null,
        startTime: Date.now(),
        cpuTime: 0,
        waitTime: 0,
        timeSliceRemaining: this.timeQuantum
      },
      // IPC
      messageQueue: [],
      signals: [],
      exitCode: null,
      // Child processes
      children: [],
      // Environment variables
      env: {},
      // Working directory
      cwd: '/'
    };

    this.processTable.set(pid, process);
    this.stats.totalCreated++;
    this.stats.maxConcurrentProcesses = Math.max(
      this.stats.maxConcurrentProcesses,
      this.getRunningCount() + this.getReadyCount()
    );

    // Move to ready state
    this._moveToReady(pid);

    return process;
  }

  /**
   * Move a process to ready state
   * @param {number} pid - Process ID
   * @private
   */
  _moveToReady(pid) {
    const process = this.processTable.get(pid);
    if (!process) return;

    process.state = this.STATES.READY;
    process.context.timeSliceRemaining = this.timeQuantum;
    
    // Add to ready queue based on priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.readyQueue.length; i++) {
      if (this.processTable.get(this.readyQueue[i]).priority < process.priority) {
        this.readyQueue.splice(i, 0, pid);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.readyQueue.push(pid);
    }
  }

  /**
   * Schedule next process to run
   * @returns {object|null} Process to run or null
   */
  schedule() {
    if (this.readyQueue.length === 0) {
      return null;
    }

    // If current process still has time, let it continue
    if (this.currentProcess && this.currentProcess.context.timeSliceRemaining > 0) {
      if (this.currentProcess.state === this.STATES.RUNNING) {
        return this.currentProcess;
      }
    }

    // Context switch
    if (this.currentProcess && this.currentProcess.state === this.STATES.RUNNING) {
      this._moveToReady(this.currentProcess.pid);
      this.stats.totalContextSwitches++;
    }

    // Get next process from ready queue
    const nextPid = this.readyQueue.shift();
    const process = this.processTable.get(nextPid);

    if (process) {
      process.state = this.STATES.RUNNING;
      process.context.timeSliceRemaining = this.timeQuantum;
      this.currentProcess = process;
    }

    return process || null;
  }

  /**
   * Tick the scheduler (call periodically to simulate time passing)
   */
  tick() {
    if (!this.currentProcess || this.currentProcess.state !== this.STATES.RUNNING) {
      this.schedule();
      return;
    }

    // Decrease time slice
    this.currentProcess.context.timeSliceRemaining -= 10;
    this.currentProcess.context.cpuTime += 10;

    // Update waiting processes
    for (const [pid, process] of this.processTable) {
      if (process.state === this.STATES.WAITING) {
        process.context.waitTime += 10;
      }
    }

    // Check if time slice expired
    if (this.currentProcess.context.timeSliceRemaining <= 0) {
      this.schedule();
    }
  }

  /**
   * Terminate a process
   * @param {number} pid - Process ID
   * @param {number} exitCode - Exit code
   * @returns {boolean} Success status
   */
  terminateProcess(pid, exitCode = 0) {
    const process = this.processTable.get(pid);
    if (!process) return false;

    // Terminate children
    for (const childPid of process.children) {
      this.terminateProcess(childPid, exitCode);
    }

    process.state = this.STATES.TERMINATED;
    process.exitCode = exitCode;

    // Remove from ready queue
    const queueIdx = this.readyQueue.indexOf(pid);
    if (queueIdx !== -1) {
      this.readyQueue.splice(queueIdx, 1);
    }

    // If current process, clear it
    if (this.currentProcess && this.currentProcess.pid === pid) {
      this.currentProcess = null;
    }

    this.stats.totalTerminated++;
    
    return true;
  }

  /**
   * Block a process (move to waiting)
   * @param {number} pid - Process ID
   * @param {string} reason - Reason for waiting
   */
  blockProcess(pid, reason = 'unknown') {
    const process = this.processTable.get(pid);
    if (!process) return;

    process.state = this.STATES.WAITING;
    process.waitReason = reason;

    if (this.currentProcess && this.currentProcess.pid === pid) {
      this.currentProcess = null;
      this.schedule();
    }
  }

  /**
   * Unblock a process (move to ready)
   * @param {number} pid - Process ID
   */
  unblockProcess(pid) {
    const process = this.processTable.get(pid);
    if (!process || process.state !== this.STATES.WAITING) return;

    process.waitReason = null;
    this._moveToReady(pid);
  }

  /**
   * Send a signal to a process
   * @param {number} pid - Process ID
   * @param {string} signal - Signal type
   * @returns {boolean} Success status
   */
  sendSignal(pid, signal) {
    const process = this.processTable.get(pid);
    if (!process) return false;

    process.signals.push({
      type: signal,
      timestamp: Date.now()
    });

    // Handle common signals
    switch (signal) {
      case 'SIGTERM':
      case 'SIGKILL':
        this.terminateProcess(pid, signal === 'SIGKILL' ? 137 : 143);
        break;
      case 'SIGSTOP':
        this.blockProcess(pid, 'signal-stop');
        break;
      case 'SIGCONT':
        this.unblockProcess(pid);
        break;
    }

    return true;
  }

  /**
   * Send a message to a process (IPC)
   * @param {number} fromPid - Sender PID
   * @param {number} toPid - Recipient PID
   * @param {object} message - Message object
   * @returns {boolean} Success status
   */
  sendMessage(fromPid, toPid, message) {
    const target = this.processTable.get(toPid);
    if (!target) return false;

    target.messageQueue.push({
      from: fromPid,
      data: message,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Get next message from process queue
   * @param {number} pid - Process ID
   * @returns {object|null} Message or null
   */
  receiveMessage(pid) {
    const process = this.processTable.get(pid);
    if (!process || process.messageQueue.length === 0) return null;

    return process.messageQueue.shift();
  }

  /**
   * Get process by PID
   * @param {number} pid - Process ID
   * @returns {object|undefined} Process object
   */
  getProcess(pid) {
    return this.processTable.get(pid);
  }

  /**
   * Get processes by name
   * @param {string} name - Process name
   * @returns {array} Matching processes
   */
  getProcessesByName(name) {
    const results = [];
    for (const [pid, process] of this.processTable) {
      if (process.name === name) {
        results.push(process);
      }
    }
    return results;
  }

  /**
   * Get all processes
   * @returns {Map} Process table
   */
  getAllProcesses() {
    return this.processTable;
  }

  /**
   * Get process listing for display
   * @param {boolean} full - Whether to show full info
   * @returns {array} Process info objects
   */
  getProcessList(full = false) {
    const list = [];
    
    for (const [pid, process] of this.processTable) {
      if (process.state === this.STATES.TERMINATED && !full) {
        continue; // Skip terminated unless full
      }
      
      list.push({
        pid: process.pid,
        ppid: process.parentPid,
        name: process.name,
        state: process.state,
        priority: process.priority,
        user: process.user,
        cpuTime: process.context.cpuTime,
        time: process.context.startTime,
        background: process.background,
        args: process.args.join(' '),
        waitReason: process.waitReason || null
      });
    }
    
    return list.sort((a, b) => a.pid - b.pid);
  }

  /**
   * Set background output for a process
   * @param {number} pid - Process ID
   * @param {string} output - Output string
   */
  setBackgroundOutput(pid, output) {
    this._backgroundOutput.set(pid, output);
    if (this.outputCallback) {
      this.outputCallback(pid, output);
    }
  }

  /**
   * Get background output
   * @param {number} pid - Process ID
   * @returns {string}
   */
  getBackgroundOutput(pid) {
    return this._backgroundOutput.get(pid) || '';
  }

  /**
   * Start the scheduler
   */
  start() {
    this._schedulerInterval = setInterval(() => this.tick(), 10);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this._schedulerInterval) {
      clearInterval(this._schedulerInterval);
      this._schedulerInterval = null;
    }
  }

  /**
   * Get running process count
   * @returns {number}
   */
  getRunningCount() {
    let count = 0;
    for (const [, p] of this.processTable) {
      if (p.state === this.STATES.RUNNING) count++;
    }
    return count;
  }

  /**
   * Get ready process count
   * @returns {number}
   */
  getReadyCount() {
    return this.readyQueue.length;
  }

  /**
   * Get waiting process count
   * @returns {number}
   */
  getWaitingCount() {
    let count = 0;
    for (const [, p] of this.processTable) {
      if (p.state === this.STATES.WAITING) count++;
    }
    return count;
  }

  /**
   * Get statistics
   * @returns {object} Process manager stats
   */
  getStats() {
    return {
      ...this.stats,
      activeProcesses: this.processTable.size,
      running: this.getRunningCount(),
      ready: this.getReadyCount(),
      waiting: this.getWaitingCount()
    };
  }

  /**
   * Reset process manager
   */
  reset() {
    this.stop();
    this.processTable.clear();
    this.readyQueue = [];
    this.currentProcess = null;
    this._nextPid = 1;
    this._backgroundOutput.clear();
    this.stats = {
      totalCreated: 0,
      totalTerminated: 0,
      totalContextSwitches: 0,
      maxConcurrentProcesses: 0
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProcessManager;
}