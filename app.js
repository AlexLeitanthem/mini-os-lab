class MiniOSApp {
  constructor() {
    this.root = document.getElementById("os-root");

    this.kernel = null;
    this.shell = null;
    this.editor = null;

    this.ui = null;
    this.docsOverlay = null;

    this.state = "boot"; // boot | login | shell | editor | shutdown
    this.loginPhase = "username";
    this.loginUsername = "";
    this.loginError = "";

    this.outputLines = [];
    this.promptText = "";

    this.editorOutput = "";
    this.bootLines = [];
  }

  async start() {
    if (typeof window.ThemeUI !== "undefined") {
      window.ThemeUI.bindResetSession("reset-session");
    }

    if (typeof window.TerminalUI === "undefined") {
      throw new Error("TerminalUI not loaded. Check script order in index.html.");
    }

    this.ui = new window.TerminalUI(this.root, {
      onLogin: value => this.handleLogin(value),
      onCommand: value => this.handleCommand(value),
      onEditorKey: key => this.handleEditorKey(key),
      getPrompt: () => this.promptText,
      getStateSnapshot: () => this._getStateSnapshot()
    });

    if (typeof window.DocsOverlay !== "undefined") {
      this.docsOverlay = new window.DocsOverlay({
        buttonId: "guides-docs",
        onClose: () => this.ui?.focusTerminalInput()
      });
      this.docsOverlay.mount();
    }

    this.render();
    await this._bootSequence();
  }

  async _bootSequence() {
    const delayScale = (typeof window.ThemeUI !== "undefined" && window.ThemeUI.prefersReducedMotion())
      ? 0.35
      : 1;

    const messages = [
      { text: "POST OK :: Mini OS Lab instrumentation interface", type: "info", delay: 180 },
      { text: "Checking memory banks... 65536 KB available", type: "info", delay: 220 },
      { text: "Initializing kernel, scheduler, and signal services...", type: "info", delay: 180 },
      { text: "[ OK ] Memory manager calibrated for constrained systems", type: "ok", delay: 140 },
      { text: "[ OK ] Filesystem mounted for lab datasets and logs", type: "ok", delay: 140 },
      { text: "[ OK ] Process scheduler aligned to round-robin policy", type: "ok", delay: 140 },
      { text: "[ OK ] Device layer linked to keyboard, disk, timer, network", type: "ok", delay: 140 },
      { text: "[ OK ] ADC, spectrum, telemetry, and CN shell extensions loaded", type: "ok", delay: 140 },
      { text: "[ OK ] ECE lab profile ready", type: "ok", delay: 180 },
      { text: "", type: "info", delay: 80 },
      { text: "Mini OS Lab v1.2.0 \"Midnight Bus\"", type: "ok", delay: 240 },
      { text: "", type: "info", delay: 80 }
    ];

    this.kernel = new Kernel({ debug: false, hostname: "ece-sim-node" });
    await this.kernel.boot();

    this.shell = new Shell(this.kernel, {
      outputCallback: (pid, output) => this._handleBackgroundOutput(pid, output)
    });
    this.editor = new TextEditor(this.kernel, this.shell);

    for (const message of messages) {
      this.bootLines.push(message);
      this.render();
      await this._delay(Math.max(40, Math.round(message.delay * delayScale)));
    }

    this.state = "login";
    this.loginPhase = "username";
    this.loginUsername = "";
    this.loginError = "";
    this.render();
  }

  async handleLogin(value) {
    if (this.loginPhase === "username") {
      if (!value.trim()) {
        this.loginError = "Please enter a username";
        this.render();
        return;
      }

      this.loginUsername = value.trim();
      this.loginPhase = "password";
      this.loginError = "";
      this.render();
      return;
    }

    const result = this.kernel.syscall("login", this.loginUsername, value);
    if (result.error) {
      this.loginError = result.error;
      this.render();
      return;
    }

    this.shell.setSession(result);
    this.state = "shell";
    this.outputLines = this._getWelcomeMessage(result);
    this.updatePrompt();
    this.render();
  }

  _getWelcomeMessage(session) {
    const lastLogin = session.user === "root" ? "never" : new Date().toLocaleString();
    return [
      { text: `Welcome to Mini OS Lab, ${session.user}.`, class: "success" },
      { text: `Host profile: ${this.kernel.config.hostname}`, class: "info" },
      { text: `Last login: ${lastLogin}`, class: "dim" },
      { text: "Quick start: lab, signals, adc, spectrum, comm, osi, route, dns", class: "info" },
      { text: "Open files: /projects/ece-system-brief.txt, /lab/channel-report.txt, /lab/routing-table.txt", class: "dim" },
      { text: "", class: "" }
    ];
  }

  async handleCommand(value) {
    const command = value.trim();

    if (!command) {
      this.updatePrompt();
      this.render();
      return;
    }

    this.outputLines.push({ text: this.promptText + value, class: "bold" });

    if (command === "clear") {
      this.outputLines = [];
      this.updatePrompt();
      this.render();
      return;
    }

    const editMatch = command.match(/^edit\s+(.+)$/);
    if (editMatch) {
      this._openEditor(editMatch[1]);
      return;
    }

    const result = await this.shell.execute(value);

    if (result === "__CLEAR__") {
      this.outputLines = [];
      this.updatePrompt();
      this.render();
      return;
    }

    if (result && result.startsWith("__EDIT__")) {
      const filename = result.substring(8);
      this._openEditor(filename);
      return;
    }

    if (!this.shell.session && command === "logout") {
      this.state = "login";
      this.loginPhase = "username";
      this.loginUsername = "";
      this.loginError = "";
      this.outputLines = [];
      this.render();
      return;
    }

    if (command === "shutdown" || this.kernel.state === "halted") {
      this.handleShutdown();
      return;
    }

    if (result) {
      this._appendOutput(result);
    }

    this.updatePrompt();
    this.render();
  }

  _appendOutput(result) {
    const lines = String(result).split("\n");
    for (const line of lines) {
      let cls = "";
      if (line.startsWith("Error") || line.startsWith("mini-os: command not found")) {
        cls = "error";
      } else if (line.startsWith("Warning") || line.includes("cannot")) {
        cls = "warning";
      } else if (line.includes("[ OK ]") || line.includes("success")) {
        cls = "success";
      } else if (
        line.includes("Lab")
        || line.includes("Signal")
        || line.includes("Spectrum")
        || line.includes("Network")
        || line.includes("OSI")
        || line.includes("ADC")
        || line.includes("Routing")
      ) {
        cls = "info";
      }
      this.outputLines.push({ text: line, class: cls });
    }
  }

  updatePrompt() {
    this.promptText = this.shell ? this.shell.getPrompt() : "";
  }

  _openEditor(filename) {
    this.editorOutput = this.editor.open(filename);
    this.state = "editor";
    this.render();
  }

  handleEditorKey(key) {
    const result = this.editor.handleKey(key);

    if (result === "__CLOSE__") {
      this.state = "shell";
      this.updatePrompt();
      this.render();
      return;
    }

    this.editorOutput = result;
    this.render();
  }

  _handleBackgroundOutput(pid, output) {
    this.outputLines.push({ text: `[${pid}] ${output}`, class: "dim" });
    this.render();
  }

  handleShutdown() {
    this.state = "shutdown";
    if (this.kernel) {
      this.kernel.shutdown();
    }
    this.render();
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getStateSnapshot() {
    return {
      bootLines: this.bootLines,
      loginPhase: this.loginPhase,
      loginUsername: this.loginUsername,
      loginError: this.loginError,
      outputLines: this.outputLines,
      editorOutput: this.editorOutput,
      editorFilename: this.editor?.filename || "",
      editorMessage: this.editor?.message || ""
    };
  }

  render() {
    if (this.ui) {
      this.ui.render(this.state);
    }
  }
}

const app = new MiniOSApp();
window.app = app;

document.addEventListener("DOMContentLoaded", () => {
  app.start();
});

document.addEventListener("click", event => {
  const root = document.getElementById("os-root");
  if (!root) {
    return;
  }

  if (event.target && root.contains(event.target)) {
    app.ui?.focusTerminalInput();
  }
});
