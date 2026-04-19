// src/ui/terminal-ui.js

class TerminalUI {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.onLogin = callbacks.onLogin;
    this.onCommand = callbacks.onCommand;
    this.onEditorKey = callbacks.onEditorKey;
    this.getPrompt = callbacks.getPrompt;
    this.getStateSnapshot = callbacks.getStateSnapshot;
  }

  render(state) {
    if (!this.root) {
      return;
    }

    switch (state) {
      case "boot":
        this._renderBoot();
        break;
      case "login":
        this._renderLogin();
        break;
      case "shell":
        this._renderShell();
        break;
      case "editor":
        this._renderEditor();
        break;
      case "shutdown":
        this._renderShutdown();
        break;
    }
  }

  focusTerminalInput() {
    const input = this.root.querySelector("#term-input");
    if (input) {
      input.focus();
    }
  }

  _renderBoot() {
    const snap = this.getStateSnapshot();
    const bootLines = snap.bootLines || [];

    let html = '<div class="terminal-pane">';
    html += '<div class="terminal-output" aria-live="polite">';
    html += "Mini OS Lab boot sequence\n\n";
    for (const line of bootLines) {
      const cls = line.type ? ` ${this._bootClass(line.type)}` : "";
      html += `<div class="output-line${cls}">${this._escapeHtml(line.text)}</div>`;
    }
    html += '<div class="output-line dim">_</div>';
    html += "</div>";
    html += "</div>";

    this.root.innerHTML = html;
  }

  _bootClass(type) {
    if (type === "ok") return "success";
    if (type === "warn") return "warning";
    if (type === "error") return "error";
    return "info";
  }

  _renderLogin() {
    const snap = this.getStateSnapshot();
    const phase = snap.loginPhase;
    const loginError = snap.loginError;
    const username = snap.loginUsername;

    const label = phase === "password" ? "Password" : "Username";
    const placeholder = phase === "password" ? "Enter password" : "Enter username";
    const type = phase === "password" ? "password" : "text";

    let html = '<div class="terminal-pane">';
    html += '<div class="center-pane">';
    html += '<div class="panel">';
    html += "<h1>Mini OS Lab</h1>";
    html += "<p>Login required. Presets: admin/admin, user/user, guest/guest.</p>";
    if (phase === "password") {
      html += `<p class="dim">User: ${this._escapeHtml(username)}</p>`;
    }
    html += '<div class="form-row">';
    html += `<div class="label">${label}</div>`;
    html += `<input class="field" id="login-input" type="${type}" autocomplete="off" placeholder="${placeholder}">`;
    html += `<button type="button" class="btn btn-accent" id="login-submit">Continue</button>`;
    html += "</div>";
    html += `<div class="feedback">${this._escapeHtml(loginError || "")}</div>`;
    html += "</div></div></div>";

    this.root.innerHTML = html;

    const input = this.root.querySelector("#login-input");
    const button = this.root.querySelector("#login-submit");
    if (input) {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          this.onLogin?.(input.value);
        }
      });
      setTimeout(() => input.focus(), 0);
    }
    if (button && input) {
      button.addEventListener("click", () => this.onLogin?.(input.value));
    }
  }

  _renderShell() {
    const snap = this.getStateSnapshot();
    const outputLines = snap.outputLines || [];
    const promptText = this.getPrompt ? this.getPrompt() : "";

    let html = '<div class="terminal-pane">';
    html += '<div class="terminal-output" id="terminal-output" aria-live="polite">';
    for (const line of outputLines) {
      const cls = line.class ? ` ${line.class}` : "";
      html += `<div class="output-line${cls}">${this._escapeHtml(line.text)}</div>`;
    }
    html += "</div>";
    html += '<div class="terminal-input">';
    html += `<span class="prompt">${this._escapeHtml(promptText)}</span>`;
    html += '<input class="term-input" type="text" id="term-input" autocomplete="off" spellcheck="false" placeholder="Type a command and press Enter">';
    html += "</div>";
    html += "</div>";

    this.root.innerHTML = html;

    const input = this.root.querySelector("#term-input");
    if (input) {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          const value = input.value;
          input.value = "";
          this.onCommand?.(value);
        }
      });
      setTimeout(() => input.focus(), 0);
    }

    this._scrollToBottom();
  }

  _renderEditor() {
    const snap = this.getStateSnapshot();
    const content = snap.editorOutput || "";
    const filename = snap.editorFilename || "";
    const message = snap.editorMessage || "";

    let html = '<div class="terminal-pane">';
    html += '<div class="terminal-output" id="editor-output" aria-live="polite">';
    html += `<div class="output-line dim">mini-vi: ${this._escapeHtml(filename)}</div>\n`;
    html += `<div class="output-line">${this._escapeHtml(content)}</div>`;
    html += `\n<div class="output-line dim">${this._escapeHtml(message)}</div>`;
    html += "</div>";
    html += '<div class="terminal-input">';
    html += '<span class="prompt">editor</span>';
    html += '<input class="term-input" type="text" id="editor-input" autocomplete="off" spellcheck="false" placeholder="Type keys (Enter sends line). ESC closes.">';
    html += "</div>";
    html += "</div>";

    this.root.innerHTML = html;

    const input = this.root.querySelector("#editor-input");
    if (input) {
      input.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.onEditorKey?.("Escape");
          return;
        }

        if (event.key === "Enter") {
          const line = input.value;
          input.value = "";
          for (const ch of (line + "\n")) {
            this.onEditorKey?.(ch);
          }
        }
      });

      setTimeout(() => input.focus(), 0);
    }
  }

  _renderShutdown() {
    let html = '<div class="terminal-pane">';
    html += '<div class="center-pane"><div class="panel">';
    html += "<h1>System halted.</h1>";
    html += "<p>Refresh the page to restart the simulator.</p>";
    html += "</div></div>";
    html += "</div>";
    this.root.innerHTML = html;
  }

  _scrollToBottom() {
    const output = this.root.querySelector("#terminal-output");
    if (output) {
      output.scrollTop = output.scrollHeight;
    }
  }

  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
}

if (typeof window !== "undefined") {
  window.TerminalUI = TerminalUI;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TerminalUI;
}
