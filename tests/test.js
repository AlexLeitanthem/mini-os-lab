// WHY: Test suite for Mini OS components
// CONTEXT: Validates all core OS subsystems work correctly

const Tests = {
  passed: 0,
  failed: 0,
  total: 0,

  assert(condition, message) {
    this.total++;
    if (condition) {
      this.passed++;
      console.log(`  ✓ ${message}`);
    } else {
      this.failed++;
      console.error(`  ✗ ${message}`);
    }
  }
};

// ===== Utils Tests =====
console.log('\n=== Utils Tests ===');

Tests.assert(Utils.resolvePath('foo/bar', '/home') === '/home/foo/bar', 'resolvePath - relative');
Tests.assert(Utils.resolvePath('/foo/bar', '/home') === '/foo/bar', 'resolvePath - absolute');
Tests.assert(Utils.resolvePath('../foo', '/home/user') === '/home/foo', 'resolvePath - parent');
Tests.assert(Utils.resolvePath('./foo', '/home') === '/home/foo', 'resolvePath - current');
Tests.assert(Utils.simpleHash('test') !== Utils.simpleHash('other'), 'hash produces different outputs');

// ===== Memory Manager Tests =====
console.log('\n=== Memory Manager Tests ===');

const mem = new MemoryManager({ totalSize: 1024, pageSize: 64 });

Tests.assert(mem.getFreeMemory() === 1024, 'initial free memory');
Tests.assert(mem.getTotalAllocated() === 0, 'initial allocated is 0');

const alloc1 = mem.allocate(1, 100);
Tests.assert(alloc1 !== null, 'allocate returns valid result');
Tests.assert(alloc1.size >= 100, 'allocated size meets request');
Tests.assert(mem.getTotalAllocated() > 0, 'allocated memory increases');

Tests.assert(mem.allocate(2, 999999) === null, 'allocation too large returns null');
Tests.assert(mem.deallocate(1) === true, 'deallocate succeeds');
Tests.assert(mem.getFreeMemory() === 1024, 'free memory restored after deallocate');

const alloc2 = mem.allocate(3, 200);
Tests.assert(alloc2 !== null, 'second allocation works');
Tests.assert(mem.write(alloc2.address, [1, 2, 3, 4, 5]) === true, 'write to memory');
const read = mem.read(alloc2.address, 5);
Tests.assert(read && read[0] === 1 && read[4] === 5, 'read from memory');

// ===== File System Tests =====
console.log('\n=== File System Tests ===');

const fs = new FileSystem();

Tests.assert(fs.resolve('/') !== null, 'root exists');
Tests.assert(fs.resolve('/').type === 'directory', 'root is directory');
Tests.assert(fs.resolve('/etc') !== null, '/etc exists');

// Create and read file
Tests.assert(fs.writeFile('/tmp/test.txt', 'hello world', 'root', 'root') === true, 'writeFile');
Tests.assert(fs.readFile('/tmp/test.txt', 'root', 'admin') === 'hello world', 'readFile');

// Append to file
Tests.assert(fs.appendFile('/tmp/test.txt', '!more', 'root', 'admin') === true, 'appendFile');
Tests.assert(fs.readFile('/tmp/test.txt', 'root', 'admin') === 'hello world!more', 'append works');

// Directory operations
Tests.assert(fs.mkdir('/tmp/subdir', 0o755, 'root', 'root') === true, 'mkdir');
Tests.assert(fs.resolve('/tmp/subdir') !== null, 'subdir created');

// List directory
const entries = fs.listDir('/tmp', 'root', 'admin');
Tests.assert(Array.isArray(entries), 'listDir returns array');
Tests.assert(entries.length >= 2, 'listDir has entries');

// Remove file
Tests.assert(fs.remove('/tmp/test.txt', 'root', 'admin') === true, 'remove file');
Tests.assert(fs.readFile('/tmp/test.txt', 'root', 'admin') === null, 'file removed');

// Stat
const stat = fs.stat('/etc', 'root', 'admin');
Tests.assert(stat !== null, 'stat works');
Tests.assert(stat.type === 'directory', 'stat type correct');

// ===== User Manager Tests =====
console.log('\n=== User Manager Tests ===');

const um = new UserManager();

// Login with valid credentials
const loginResult = um.login('admin', 'admin');
Tests.assert(!loginResult.error, 'admin login success');
Tests.assert(loginResult.user === 'admin', 'login returns username');
Tests.assert(loginResult.role === 'admin', 'login returns role');

// Invalid password
const badLogin = um.login('admin', 'wrong');
Tests.assert(badLogin.error !== undefined, 'bad password rejected');

// Session management
Tests.assert(um.getSession(loginResult.id) !== undefined, 'session retrievable');
Tests.assert(um.logout(loginResult.id) === true, 'logout works');
Tests.assert(um.getSession(loginResult.id) === undefined, 'session removed');

// List users
const users = um.listUsers();
Tests.assert(users.length >= 3, 'has default users');

// Password change
const changeResult = um.changePassword('guest', 'guest', 'newpass');
Tests.assert(changeResult === true, 'password change works');
const newLogin = um.login('guest', 'newpass');
Tests.assert(newLogin.user === 'guest', 'new password works');

// Reset password back
um.changePassword('guest', 'newpass', 'guest');

// ===== Process Manager Tests =====
console.log('\n=== Process Manager Tests ===');

const pm = new ProcessManager();

// Create process
const proc = pm.createProcess({
  name: 'test',
  user: 'admin',
  priority: 5
});
Tests.assert(!proc.error, 'process creation');
Tests.assert(proc.pid !== undefined, 'process has PID');
Tests.assert(proc.state === pm.STATES.READY, 'process in READY state');

// Schedule and run
pm.schedule();
Tests.assert(pm.currentProcess !== null, 'scheduler runs process');
Tests.assert(pm.currentProcess.state === pm.STATES.RUNNING, 'process is RUNNING');

pm.tick();
Tests.assert(pm.currentProcess.context.cpuTime > 0, 'CPU time increases');

// Terminate
Tests.assert(pm.terminateProcess(proc.pid) === true, 'termination works');
Tests.assert(pm.getProcess(proc.pid).state === pm.STATES.TERMINATED, 'process TERMINATED');

// Process list
const procList = pm.getProcessList(true);
Tests.assert(Array.isArray(procList), 'process list is array');

// ===== Device Manager Tests =====
console.log('\n=== Device Manager Tests ===');

const dm = new DeviceManager({ diskSize: 1024 * 1024 });

// List devices
const devices = dm.listDevices();
Tests.assert(devices.length >= 5, 'registers all devices');

// Get specific device
const timer = dm.getDevice('timer');
Tests.assert(timer !== undefined, 'timer exists');
Tests.assert(timer.type === 'system', 'timer type');

// Network interfaces
const ifaces = dm.getNetworkInterfaces();
Tests.assert(ifaces.length >= 1, 'has network interfaces');

// Ping
const pingResult = dm.ping('localhost');
Tests.assert(pingResult.success === true, 'ping succeeds');
Tests.assert(pingResult.ip === '127.0.0.1', 'ping localhost');

// ===== Kernel Tests =====
console.log('\n=== Kernel Tests ===');

const kernel = new Kernel();

// Boot
(async () => {
  await kernel.boot();
  Tests.assert(kernel.state === 'running', 'kernel boots successfully');
  
  // Syscalls work
  const uname = kernel.syscall('uname');
  Tests.assert(uname.name === 'Mini OS', 'uname syscall');
  
  // File syscalls
  const writeResult = kernel.syscall('write', '/tmp/ktest.txt', 'kernel data', 'root', 'admin');
  Tests.assert(writeResult === true, 'write syscall');
  
  const readResult = kernel.syscall('read', '/tmp/ktest.txt', 'root', 'admin');
  Tests.assert(readResult === 'kernel data', 'read syscall');
  
  // List syscall
  const listResult = kernel.syscall('list', '/', 'root', 'admin');
  Tests.assert(Array.isArray(listResult), 'list syscall');
  
  // Memory syscall
  const memStats = kernel.syscall('memStats');
  Tests.assert(memStats.totalSize !== undefined, 'memStats syscall');
  
  // Process syscall
  const newProc = kernel.syscall('createProcess', {
    name: 'ktest',
    user: 'root'
  });
  Tests.assert(!newProc.error, 'createProcess syscall');
  
  const killResult = kernel.syscall('kill', newProc.pid, 'SIGTERM');
  Tests.assert(killResult === true, 'kill syscall');
  
  // Uptime
  const uptime = kernel.syscall('uptime');
  Tests.assert(uptime > 0, 'uptime is positive');
  
  // ===== Shell Tests =====
  console.log('\n=== Shell Tests ===');
  
  const shell = new Shell(kernel);
  
  // Login
  const session = kernel.userManager.login('user', 'user');
  shell.setSession(session);
  Tests.assert(shell.session !== null, 'session set');
  
  // Test commands
  const helpResult = await shell.execute('help');
  Tests.assert(helpResult.includes('help'), 'help command');
  
  const pwdResult = await shell.execute('pwd');
  Tests.assert(pwdResult === session.homeDir, 'pwd command');
  
  const lsResult = await shell.execute('ls');
  Tests.assert(lsResult !== undefined, 'ls command');
  
  const echoResult = await shell.execute('echo hello world');
  Tests.assert(echoResult === 'hello world', 'echo command');
  
  const dateResult = await shell.execute('date');
  Tests.assert(dateResult.length > 0, 'date command');
  
  const envResult = await shell.execute('env');
  Tests.assert(envResult.includes('USER'), 'env command');
  
  const whoamiResult = await shell.execute('whoami');
  Tests.assert(whoamiResult === 'user', 'whoami command');
  
  // File commands
  await shell.execute('touch /tmp/testfile.txt');
  const catResult = await shell.execute('cat /tmp/testfile.txt');
  Tests.assert(catResult === '', 'touch and cat empty file');
  
  await shell.execute('echo test content > /tmp/testfile2.txt');
  const catResult2 = await shell.execute('cat /tmp/testfile2.txt');
  Tests.assert(catResult2 === 'test content', 'echo redirect and cat');
  
  const unameResult = await shell.execute('uname -a');
  Tests.assert(unameResult.includes('Mini OS'), 'uname -a');
  
  // History
  const histResult = await shell.execute('history');
  Tests.assert(histResult.length > 0, 'history command');
  
  // Calculator
  const calcResult = await shell.execute('calc 2 + 2');
  Tests.assert(calcResult.includes('4'), 'calculator 2+2');
  
  // Ping
  const pingCmdResult = await shell.execute('ping localhost');
  Tests.assert(pingCmdResult.includes('127.0.0.1'), 'ping command');
  
  // Free memory
  const freeResult = await shell.execute('free');
  Tests.assert(freeResult.includes('Memory'), 'free command');
  
  // Ifconfig
  const ifconfigResult = await shell.execute('ifconfig');
  Tests.assert(ifconfigResult.includes('eth0'), 'ifconfig command');
  
  // Process list
  const psResult = await shell.execute('ps');
  Tests.assert(psResult.includes('PID') || psResult.includes('No processes'), 'ps command');
  
  // Logout
  const logoutResult = await shell.execute('logout');
  Tests.assert(shell.session === null, 'logout works');
  
  // ===== Summary =====
  console.log('\n' + '='.repeat(40));
  console.log(`Test Results: ${Tests.passed}/${Tests.total} passed, ${Tests.failed} failed`);
  
  if (Tests.failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ ${Tests.failed} test(s) failed`);
  }
  
  // Store for window access
  window.testResults = {
    passed: Tests.passed,
    failed: Tests.failed,
    total: Tests.total
  };
})();