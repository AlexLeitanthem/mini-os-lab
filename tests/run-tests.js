const assert = require("node:assert/strict");

const Utils = require("../src/utils/helpers");
global.Utils = Utils;

const MemoryManager = require("../src/memory-manager");
global.MemoryManager = MemoryManager;

const FileSystem = require("../src/filesystem");
global.FileSystem = FileSystem;

const ProcessManager = require("../src/process-manager");
global.ProcessManager = ProcessManager;

const UserManager = require("../src/user-manager");
global.UserManager = UserManager;

const DeviceManager = require("../src/device-manager");
global.DeviceManager = DeviceManager;

const Kernel = require("../src/kernel");
global.Kernel = Kernel;

const Shell = require("../src/shell");
global.Shell = Shell;

const TextEditor = require("../src/apps/text-editor");
global.TextEditor = TextEditor;

async function run() {
  console.log("Running Mini OS Lab tests...");

  assert.equal(Utils.resolvePath("foo/bar", "/home"), "/home/foo/bar");
  assert.equal(Utils.resolvePath("../foo", "/home/user"), "/home/foo");
  assert.notEqual(Utils.simpleHash("test"), Utils.simpleHash("other"));

  const mem = new MemoryManager({ totalSize: 1024, pageSize: 64 });
  const alloc = mem.allocate(1, 100);
  assert.ok(alloc);
  assert.equal(mem.allocate(2, 999999), null);
  assert.equal(mem.deallocate(1), true);
  // Memory limit + bounds checks
  assert.equal(mem.allocate(3, 0), null);
  assert.equal(mem.allocate(3, -1), null);
  assert.equal(mem.allocate(3, 2048), null);
  assert.equal(mem.write(2000, [1, 2, 3]), false);
  assert.equal(mem.read(2000, 10), null);

  const fs = new FileSystem();
  assert.ok(fs.resolve("/lab"));
  assert.ok(fs.readFile("/projects/ece-system-brief.txt", "user", "user").includes("ECE"));
  assert.ok(fs.readFile("/etc/bus-map.conf", "root", "admin").includes("UART"));
  assert.ok(fs.readFile("/projects/adc-notes.txt", "user", "user").includes("12 bits"));
  assert.ok(fs.readFile("/lab/channel-report.txt", "user", "user").includes("Link margin"));
  assert.ok(fs.readFile("/projects/networking-fundamentals.txt", "user", "user").includes("OSI"));
  assert.ok(fs.readFile("/lab/routing-table.txt", "user", "user").includes("default via"));
  assert.ok(fs.readFile("/lab/dns-cache.txt", "user", "user").includes("telemetry.lab"));
  // Filesystem bad path + permission errors
  assert.equal(fs.readFile("/does/not/exist.txt", "user", "user"), null);
  assert.equal(fs.listDir("/does/not", "user", "user"), null);
  assert.equal(fs.remove("/does/not/exist.txt", "user", "user"), false);
  assert.equal(fs.writeFile("/tmp/private.txt", "secret", "root", "root", 0o600), true);
  assert.equal(fs.readFile("/tmp/private.txt", "user", "user"), null);
  assert.equal(fs.readFile("/tmp/private.txt", "root", "admin"), "secret");
  assert.equal(fs.appendFile("/tmp/private.txt", "!", "user", "user"), false);
  assert.equal(fs.appendFile("/tmp/private.txt", "!", "root", "admin"), true);
  assert.equal(fs.readFile("/tmp/private.txt", "root", "admin"), "secret!");
  assert.equal(fs.remove("/etc/hostname", "user", "user"), false);
  assert.equal(fs.remove("/tmp/private.txt", "root", "admin"), true);

  const userManager = new UserManager();
  const login = userManager.login("admin", "admin");
  assert.equal(login.user, "admin");
  assert.equal(userManager.logout(login.id), true);
  // Auth failures + lockout edge case
  assert.ok(userManager.login("not-a-user", "x").error);
  assert.ok(userManager.login("admin", "wrong").error);
  const lockTest = new UserManager();
  for (let i = 0; i < 5; i++) {
    lockTest.login("user", "wrong");
  }
  const lockedResult = lockTest.login("user", "user");
  assert.ok(lockedResult.error);
  assert.ok(String(lockedResult.error).toLowerCase().includes("locked"));
  assert.equal(lockTest.unlockUser("user"), true);
  const relogin = lockTest.login("user", "user");
  assert.equal(relogin.user, "user");

  const processManager = new ProcessManager();
  const process = processManager.createProcess({ name: "test", user: "admin", priority: 5 });
  assert.ok(process.pid);
  processManager.schedule();
  assert.ok(processManager.currentProcess);
  assert.equal(processManager.terminateProcess(process.pid), true);

  const deviceManager = new DeviceManager({ diskSize: 1024 * 1024 });
  assert.ok(deviceManager.getNetworkInterfaces().length >= 1);
  assert.equal(deviceManager.ping("localhost").ip, "127.0.0.1");
  deviceManager.dispose();
  // Device disposal edge cases should be safe
  assert.doesNotThrow(() => deviceManager.dispose());
  assert.doesNotThrow(() => deviceManager.stop());
  assert.ok(deviceManager.read("not-a-device").error);
  assert.equal(deviceManager.write("not-a-device", "x"), false);

  const kernel = new Kernel();
  await kernel.boot();
  assert.equal(kernel.state, "running");
  assert.equal(kernel.syscall("uname").name, "Mini OS");
  assert.ok(kernel.syscall("not-a-syscall").error);

  const shell = new Shell(kernel);
  const session = kernel.userManager.login("user", "user");
  shell.setSession(session);

  const helpResult = await shell.execute("help");
  assert.ok(helpResult.includes("ECE Lab"));

  const labResult = await shell.execute("lab");
  assert.ok(labResult.includes("ECE"));

  const signalResult = await shell.execute("signals");
  assert.ok(signalResult.includes("Signal Integrity Snapshot"));

  const busResult = await shell.execute("bus");
  assert.ok(busResult.includes("Communication Bus Map"));

  const adcResult = await shell.execute("adc");
  assert.ok(adcResult.includes("ADC Acquisition Snapshot"));

  const spectrumResult = await shell.execute("spectrum");
  assert.ok(spectrumResult.includes("Spectrum Scan"));

  const commResult = await shell.execute("comm");
  assert.ok(commResult.includes("Digital Communication Chain"));

  const osiResult = await shell.execute("osi");
  assert.ok(osiResult.includes("OSI Layer Reference"));

  const subnetResult = await shell.execute("subnet");
  assert.ok(subnetResult.includes("Subnetting Example"));

  const routeResult = await shell.execute("route");
  assert.ok(routeResult.includes("Routing Table Summary"));

  const dnsResult = await shell.execute("dns");
  assert.ok(dnsResult.includes("DNS Resolution Snapshot"));

  const catResult = await shell.execute("cat /projects/ece-system-brief.txt");
  assert.ok(catResult.includes("Mini OS Lab"));

  const ifconfigResult = await shell.execute("ifconfig");
  assert.ok(ifconfigResult.includes("eth0"));

  const pingResult = await shell.execute("ping telemetry.lab");
  assert.ok(pingResult.includes("PING telemetry.lab"));

  kernel.deviceManager.dispose();

  console.log("All tests passed.");
}

run().catch(error => {
  console.error("Test run failed.");
  console.error(error);
  process.exitCode = 1;
});
