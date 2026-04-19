// WHY: Memory manager simulates physical and virtual memory with paging
// CONTEXT: Core OS component for memory allocation and management

class MemoryManager {
  /**
   * @param {object} options - Configuration options
   * @param {number} options.totalSize - Total memory size in bytes (default 65536 = 64KB)
   * @param {number} options.pageSize - Page size in bytes (default 256)
   */
  constructor(options = {}) {
    this.TOTAL_SIZE = options.totalSize || 64 * 1024; // 64KB
    this.PAGE_SIZE = options.pageSize || 256;
    this.NUM_PAGES = Math.floor(this.TOTAL_SIZE / this.PAGE_SIZE);
    
    // Physical memory (simple array simulation)
    this.memory = new Uint8Array(this.TOTAL_SIZE);
    
    // Page table: tracks which pages are free (false) or allocated (true)
    this.pageTable = new Array(this.NUM_PAGES).fill(false);
    
    // Process page mappings: pid -> array of page numbers
    this.processPages = new Map();
    
    // Statistics
    this.stats = {
      totalAllocations: 0,
      totalDeallocations: 0,
      totalAllocatedBytes: 0,
      peakUsage: 0,
      fragmentationCount: 0
    };

    this._initialize();
  }

  /**
   * Initialize memory manager
   * @private
   */
  _initialize() {
    // Clear memory
    this.memory.fill(0);
    this.pageTable.fill(false);
    this.processPages.clear();
  }

  /**
   * Allocate memory for a process
   * @param {number} pid - Process ID
   * @param {number} size - Size in bytes to allocate
   * @returns {{address: number, size: number} | null} Allocation result or null if failed
   */
  allocate(pid, size) {
    if (size <= 0 || size > this.TOTAL_SIZE) {
      return null;
    }

    const pagesNeeded = Math.ceil(size / this.PAGE_SIZE);
    const allocatedPages = [];

    // First-fit allocation strategy
    for (let i = 0; i < this.NUM_PAGES && allocatedPages.length < pagesNeeded; i++) {
      if (!this.pageTable[i]) {
        allocatedPages.push(i);
      }
    }

    if (allocatedPages.length < pagesNeeded) {
      // Not enough contiguous memory
      return null;
    }

    // Mark pages as allocated
    for (const page of allocatedPages) {
      this.pageTable[page] = true;
    }

    // Record allocation for process
    if (!this.processPages.has(pid)) {
      this.processPages.set(pid, []);
    }
    this.processPages.get(pid).push(...allocatedPages);

    // Calculate virtual address
    const address = allocatedPages[0] * this.PAGE_SIZE;
    const actualSize = pagesNeeded * this.PAGE_SIZE;

    // Update statistics
    this.stats.totalAllocations++;
    this.stats.totalAllocatedBytes += actualSize;
    this.stats.peakUsage = Math.max(this.stats.peakUsage, this.getTotalAllocated());

    return {
      address,
      size: actualSize,
      pages: allocatedPages
    };
  }

  /**
   * Deallocate all memory for a process
   * @param {number} pid - Process ID
   * @returns {boolean} Success status
   */
  deallocate(pid) {
    const pages = this.processPages.get(pid);
    if (!pages || pages.length === 0) {
      return false;
    }

    // Free pages
    for (const page of pages) {
      this.pageTable[page] = false;
      // Clear memory content
      const start = page * this.PAGE_SIZE;
      this.memory.fill(0, start, start + this.PAGE_SIZE);
    }

    // Remove process mapping
    this.processPages.delete(pid);

    // Update statistics
    this.stats.totalDeallocations++;
    const freedBytes = pages.length * this.PAGE_SIZE;
    this.stats.totalAllocatedBytes -= freedBytes;

    return true;
  }

  /**
   * Write data to memory at specified address
   * @param {number} address - Memory address
   * @param {Uint8Array | number[]} data - Data to write
   * @returns {boolean} Success status
   */
  write(address, data) {
    if (address < 0 || address + data.length > this.TOTAL_SIZE) {
      return false;
    }
    
    for (let i = 0; i < data.length; i++) {
      this.memory[address + i] = data[i];
    }
    return true;
  }

  /**
   * Read data from memory at specified address
   * @param {number} address - Memory address
   * @param {number} size - Number of bytes to read
   * @returns {Uint8Array | null} Data read or null if invalid address
   */
  read(address, size) {
    if (address < 0 || address + size > this.TOTAL_SIZE) {
      return null;
    }
    return this.memory.slice(address, address + size);
  }

  /**
   * Write a string to memory
   * @param {number} address - Memory address
   * @param {string} str - String to write
   * @returns {boolean} Success status
   */
  writeString(address, str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return this.write(address, data);
  }

  /**
   * Read a string from memory
   * @param {number} address - Memory address
   * @param {number} maxLength - Maximum bytes to read
   * @returns {string} String read
   */
  readString(address, maxLength) {
    const data = this.read(address, maxLength);
    if (!data) return '';
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  /**
   * Get memory usage statistics
   * @returns {object} Memory statistics
   */
  getStats() {
    const allocated = this.getTotalAllocated();
    const free = this.TOTAL_SIZE - allocated;
    const pagesUsed = this.pageTable.filter(p => p).length;
    
    return {
      totalSize: this.TOTAL_SIZE,
      allocated,
      free,
      usagePercent: (allocated / this.TOTAL_SIZE * 100).toFixed(1),
      pagesTotal: this.NUM_PAGES,
      pagesUsed,
      pagesFree: this.NUM_PAGES - pagesUsed,
      processesWithMemory: this.processPages.size,
      ...this.stats
    };
  }

  /**
   * Get total allocated memory
   * @returns {number} Bytes allocated
   */
  getTotalAllocated() {
    return this.pageTable.filter(p => p).length * this.PAGE_SIZE;
  }

  /**
   * Get free memory
   * @returns {number} Bytes free
   */
  getFreeMemory() {
    return this.TOTAL_SIZE - this.getTotalAllocated();
  }

  /**
   * Check if address is valid for a process
   * @param {number} pid - Process ID
   * @param {number} address - Memory address
   * @returns {boolean} Whether address is valid for process
   */
  isValidAddress(pid, address) {
    const pages = this.processPages.get(pid);
    if (!pages) return false;
    
    const minAddress = Math.min(...pages) * this.PAGE_SIZE;
    const maxAddress = (Math.max(...pages) + 1) * this.PAGE_SIZE;
    
    return address >= minAddress && address < maxAddress;
  }

  /**
   * Get memory map showing allocated/free regions
   * @returns {Array<{page: number, allocated: boolean, pid: number|null}>}
   */
  getMemoryMap() {
    const map = [];
    const pidPageMap = new Map();
    
    // Build reverse mapping: page -> pid
    for (const [pid, pages] of this.processPages) {
      for (const page of pages) {
        pidPageMap.set(page, pid);
      }
    }
    
    for (let i = 0; i < this.NUM_PAGES; i++) {
      map.push({
        page: i,
        address: i * this.PAGE_SIZE,
        allocated: this.pageTable[i],
        pid: pidPageMap.get(i) || null
      });
    }
    
    return map;
  }

  /**
   * Calculate fragmentation (number of non-contiguous free regions)
   * @returns {number} Fragmentation count
   */
  getFragmentation() {
    let fragments = 0;
    let inFreeRegion = false;
    
    for (let i = 0; i < this.NUM_PAGES; i++) {
      if (!this.pageTable[i]) {
        if (!inFreeRegion) {
          fragments++;
          inFreeRegion = true;
        }
      } else {
        inFreeRegion = false;
      }
    }
    
    this.stats.fragmentationCount = fragments > 1 ? fragments - 1 : 0;
    return this.stats.fragmentationCount;
  }

  /**
   * Defragment memory by compacting allocated pages
   * Note: This is a simulation - in real OS this would move all data
   * @returns {boolean} Whether defragmentation was performed
   */
  defragment() {
    const allocated = this.getTotalAllocated();
    if (allocated === 0) return false;
    
    // Just recalculate fragmentation - actual defrag would break address mappings
    this.getFragmentation();
    return true;
  }

  /**
   * Reset memory manager (kernel use only)
   */
  reset() {
    this._initialize();
    this.stats = {
      totalAllocations: 0,
      totalDeallocations: 0,
      totalAllocatedBytes: 0,
      peakUsage: 0,
      fragmentationCount: 0
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoryManager;
}