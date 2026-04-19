// WHY: Device manager simulates hardware devices and their operations
// CONTEXT: Hardware abstraction layer for keyboard, display, timer, disk, and network

class DeviceManager {
  /**
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    // Device registry
    this.devices = new Map();
    
    // Device drivers
    this.drivers = new Map();
    
    // Interrupt handlers
    this.interruptHandlers = new Map();
    
    // I/O buffers
    this.buffers = new Map();
    
    // Disk storage simulation
    this.diskStorage = new Map();
    this.diskSize = options.diskSize || 10 * 1024 * 1024; // 10MB virtual disk
    
    // Network simulation
    this.networkInterfaces = new Map();
    this.packetQueue = [];
    this.timerHandle = null;
    
    this._initialize();
  }

  /**
   * Initialize devices
   * @private
   */
  _initialize() {
    // Register standard devices
    this.devices.set('keyboard', {
      id: 'keyboard',
      type: 'input',
      name: 'Standard Keyboard',
      status: 'ready',
      buffer: '',
      driver: 'keyboard-driver'
    });

    this.devices.set('display', {
      id: 'display',
      type: 'output',
      name: 'Virtual Display',
      status: 'ready',
      width: 80,
      height: 24,
      buffer: '',
      driver: 'display-driver'
    });

    this.devices.set('timer', {
      id: 'timer',
      type: 'system',
      name: 'System Timer',
      status: 'running',
      tick: 0,
      interval: 100, // ms
      driver: 'timer-driver'
    });

    this.devices.set('disk', {
      id: 'disk',
      type: 'storage',
      name: 'Virtual Disk',
      status: 'ready',
      size: this.diskSize,
      used: 0,
      driver: 'disk-driver'
    });

    this.devices.set('network', {
      id: 'network',
      type: 'network',
      name: 'Virtual Network Interface',
      status: 'up',
      driver: 'network-driver'
    });

    this.devices.set('adc', {
      id: 'adc',
      type: 'measurement',
      name: 'ADC Frontend',
      status: 'ready',
      channels: 4,
      resolution: '12-bit',
      driver: 'adc-driver'
    });

    this.devices.set('rf', {
      id: 'rf',
      type: 'communication',
      name: 'RF Telemetry Frontend',
      status: 'tracking',
      band: '433.92 MHz',
      driver: 'rf-driver'
    });

    // Register drivers
    this.drivers.set('keyboard-driver', this._createKeyboardDriver());
    this.drivers.set('display-driver', this._createDisplayDriver());
    this.drivers.set('timer-driver', this._createTimerDriver());
    this.drivers.set('disk-driver', this._createDiskDriver());
    this.drivers.set('network-driver', this._createNetworkDriver());
    this.drivers.set('adc-driver', this._createAdcDriver());
    this.drivers.set('rf-driver', this._createRfDriver());

    // Setup network interface
    this.networkInterfaces.set('lo', {
      name: 'lo',
      type: 'loopback',
      mac: '00:00:00:00:00:00',
      ip: '127.0.0.1',
      netmask: '255.0.0.0',
      gateway: null,
      status: 'up',
      mtu: 65536
    });

    this.networkInterfaces.set('eth0', {
      name: 'eth0',
      type: 'ethernet',
      mac: '08:00:27:1a:2b:3c',
      ip: '192.168.1.100',
      netmask: '255.255.255.0',
      gateway: '192.168.1.1',
      status: 'up',
      mtu: 1500
    });

    // Register default interrupt handlers
    this.interruptHandlers.set(0, () => { /* Timer interrupt */ });
    this.interruptHandlers.set(1, (data) => { /* Keyboard interrupt */ });

    // Start timer
    this._startTimer();
  }

  /**
   * Create keyboard driver
   * @returns {object} Keyboard driver
   * @private
   */
  _createKeyboardDriver() {
    return {
      init() { return true; },
      read() { return ''; },
      write(data) { /* No write on keyboard */ },
      status() { return 'ready'; }
    };
  }

  /**
   * Create display driver
   * @returns {object} Display driver
   * @private
   */
  _createDisplayDriver() {
    const buffer = [];
    return {
      init() { return true; },
      read() { return buffer.join('\n'); },
      write(data) { buffer.push(data); },
      clear() { buffer.length = 0; },
      status() { return 'ready'; },
      getBuffer() { return buffer; },
      setBuffer(b) { buffer.length = 0; buffer.push(...b); }
    };
  }

  /**
   * Create timer driver
   * @returns {object} Timer driver
   * @private
   */
  _createTimerDriver() {
    let ticks = 0;
    return {
      init() { return true; },
      tick() { ticks++; },
      getTicks() { return ticks; },
      reset() { ticks = 0; },
      status() { return 'running'; }
    };
  }

  /**
   * Create disk driver
   * @returns {object} Disk driver
   * @private
   */
  _createDiskDriver() {
    const storage = new Map();
    return {
      init() { return true; },
      readBlock(address) { 
        return storage.get(address) || new Uint8Array(512); 
      },
      writeBlock(address, data) { 
        storage.set(address, data); 
        return true;
      },
      getStatus() { return 'ready'; },
      getUsage() { 
        let size = 0;
        for (const data of storage.values()) {
          size += data.length;
        }
        return size;
      }
    };
  }

  /**
   * Create network driver
   * @returns {object} Network driver
   * @private
   */
  _createNetworkDriver() {
    const packets = [];
    return {
      init() { return true; },
      send(packet) { 
        packets.push(packet); 
        return true;
      },
      receive() { 
        return packets.length > 0 ? packets.shift() : null; 
      },
      status() { return 'up'; },
      getQueueSize() { return packets.length; }
    };
  }

  /**
   * Create ADC driver
   * @returns {object} ADC driver
   * @private
   */
  _createAdcDriver() {
    return {
      init() { return true; },
      read() {
        return {
          sampleRate: 48000,
          resolution: 12,
          referenceVoltage: 3.3,
          channels: 4
        };
      },
      write() { return false; },
      status() { return 'ready'; }
    };
  }

  /**
   * Create RF driver
   * @returns {object} RF driver
   * @private
   */
  _createRfDriver() {
    return {
      init() { return true; },
      read() {
        return {
          band: '433.92 MHz',
          modulation: 'QPSK',
          linkMargin: '11.4 dB'
        };
      },
      write(data) { return !!data; },
      status() { return 'tracking'; }
    };
  }

  /**
   * Start the system timer
   * @private
   */
  _startTimer() {
    this.stop();
    this.timerHandle = setInterval(() => {
      const timer = this.devices.get('timer');
      if (timer) {
        timer.tick++;
        const driver = this.drivers.get('timer-driver');
        if (driver) driver.tick();
        
        // Trigger timer interrupt periodically
        const handler = this.interruptHandlers.get(0);
        if (handler) handler();
      }
    }, 100);
  }

  /**
   * Stop the system timer
   */
  stop() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  /**
   * Get device by ID
   * @param {string} deviceId - Device ID
   * @returns {object|undefined} Device info
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * List all devices
   * @returns {Array<object>} Device list
   */
  listDevices() {
    const devices = [];
    for (const [id, device] of this.devices) {
      devices.push({
        id: device.id,
        type: device.type,
        name: device.name,
        status: device.status,
        driver: device.driver
      });
    }
    return devices;
  }

  /**
   * Read from device
   * @param {string} deviceId - Device ID
   * @param {object} options - Read options
   * @returns {any} Data read
   */
  read(deviceId, options = {}) {
    const device = this.devices.get(deviceId);
    if (!device) return { error: 'Device not found' };
    
    const driver = this.drivers.get(device.driver);
    if (!driver) return { error: 'Driver not found' };
    
    return driver.read(options);
  }

  /**
   * Write to device
   * @param {string} deviceId - Device ID
   * @param {any} data - Data to write
   * @returns {boolean} Success status
   */
  write(deviceId, data) {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    
    const driver = this.drivers.get(device.driver);
    if (!driver) return false;
    
    return driver.write(data);
  }

  /**
   * Handle hardware interrupt
   * @param {number} interrupt - Interrupt number
   * @param {object} data - Interrupt data
   * @returns {any} Handler result
   */
  handleInterrupt(interrupt, data = null) {
    const handler = this.interruptHandlers.get(interrupt);
    if (handler) {
      return handler(data);
    }
    return null;
  }

  /**
   * Register custom interrupt handler
   * @param {number} interrupt - Interrupt number
   * @param {Function} handler - Handler function
   */
  registerInterruptHandler(interrupt, handler) {
    this.interruptHandlers.set(interrupt, handler);
  }

  /**
   * Get network interfaces
   * @returns {Array<object>} Network interfaces
   */
  getNetworkInterfaces() {
    const interfaces = [];
    for (const [name, iface] of this.networkInterfaces) {
      interfaces.push({ ...iface });
    }
    return interfaces;
  }

  /**
   * Simulate ping
   * @param {string} host - Host to ping
   * @returns {object} Ping result
   */
  ping(host) {
    // Simulate network latency
    const startTime = Date.now();
    const simulatedLatency = Math.floor(Math.random() * 50) + 1;
    
    // Check if it's localhost or any host (simulation always succeeds)
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const result = {
      host,
      ip: isLocalhost ? '127.0.0.1' : this._simulateIp(host),
      bytes: 32,
      time: simulatedLatency,
      ttl: 64,
      success: true
    };
    
    return result;
  }

  /**
   * Simulate an IP for a hostname
   * @param {string} host - Hostname
   * @returns {string} Simulated IP
   * @private
   */
  _simulateIp(host) {
    let hash = 0;
    for (let i = 0; i < host.length; i++) {
      hash = host.charCodeAt(i) + ((hash << 5) - hash);
    }
    const a = 10 + Math.abs(hash % 200);
    const b = Math.abs((hash >> 8) % 256);
    const c = Math.abs((hash >> 16) % 256);
    const d = Math.abs((hash >> 24) % 256) + 1;
    return `${a}.${b}.${c}.${d}`;
  }

  /**
   * Get network statistics
   * @returns {object} Network stats
   */
  getNetworkStats() {
    return {
      interfaces: this.getNetworkInterfaces(),
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      errors: 0
    };
  }

  /**
   * Get disk statistics
   * @returns {object} Disk stats
   */
  getDiskStats() {
    const disk = this.devices.get('disk');
    const driver = this.drivers.get('disk-driver');
    return {
      totalSize: disk ? disk.size : 0,
      usedSpace: driver ? driver.getUsage() : 0,
      freeSpace: (disk && driver) ? disk.size - driver.getUsage() : 0,
      status: disk ? disk.status : 'unknown'
    };
  }

  /**
   * Get system uptime based on timer ticks
   * @returns {number} Uptime in milliseconds
   */
  getUptime() {
    const timer = this.devices.get('timer');
    return timer ? timer.tick * 100 : 0;
  }

  /**
   * Get timer information
   * @returns {object} Timer info
   */
  getTimerInfo() {
    const timer = this.devices.get('timer');
    const driver = this.drivers.get('timer-driver');
    return {
      ticks: timer ? timer.tick : 0,
      driverTicks: driver ? driver.getTicks() : 0,
      interval: timer ? timer.interval : 100,
      status: timer ? timer.status : 'unknown'
    };
  }

  /**
   * Get all system information
   * @returns {object} System info
   */
  getSystemInfo() {
    return {
      devices: this.listDevices(),
      network: this.getNetworkInterfaces(),
      disk: this.getDiskStats(),
      timer: this.getTimerInfo(),
      uptime: this.getUptime()
    };
  }

  /**
   * Reset device manager (for testing)
   */
  reset() {
    this.stop();
    this.devices.clear();
    this.drivers.clear();
    this.interruptHandlers.clear();
    this.buffers.clear();
    this.networkInterfaces.clear();
    this._initialize();
  }

  /**
   * Dispose of timers and resources
   */
  dispose() {
    this.stop();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceManager;
}
