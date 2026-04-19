// src/ui/docs-overlay.js

class DocsOverlay {
  constructor(options = {}) {
    this.buttonId = options.buttonId || "guides-docs";
    this.onClose = options.onClose;

    this.sections = [
      {
        id: "getting-started",
        title: "Getting Started",
        paragraphs: [
          "Mini OS Lab is a browser-based OS simulation with an interactive shell.",
          "Login presets: admin/admin, user/user, guest/guest.",
          "Recommended demo path:"
        ],
        code: [
          "help",
          "lab",
          "signals",
          "adc",
          "spectrum",
          "comm",
          "osi",
          "subnet",
          "route",
          "dns",
          "bus"
        ]
      },
      {
        id: "shell-commands",
        title: "Shell Commands",
        paragraphs: [
          "Core navigation:",
          "File ops:",
          "System ops:",
          "ECE + CN lab commands:",
          "Networking tools:"
        ],
        code: [
          "pwd, cd, ls, cat, tree, find",
          "touch, mkdir, rm, cp, mv, chmod, chown (admin only)",
          "uname, uptime, date, env, export, whoami, who, passwd, history, clear, shutdown, reboot",
          "lab, signals, bus, adc, spectrum, comm, osi, subnet, route, dns",
          "ifconfig, ping, netstat"
        ]
      },
      {
        id: "filesystem",
        title: "Filesystem",
        paragraphs: [
          "Virtual filesystem lives in src/filesystem.js and is mounted by the Kernel.",
          "Useful paths:"
        ],
        code: [
          "cat /projects/ece-system-brief.txt",
          "cat /projects/adc-notes.txt",
          "cat /projects/networking-fundamentals.txt",
          "cat /lab/telemetry.log",
          "cat /lab/channel-report.txt",
          "cat /lab/routing-table.txt",
          "cat /lab/dns-cache.txt",
          "cat /etc/bus-map.conf"
        ]
      },
      {
        id: "memory-manager",
        title: "Memory Manager",
        paragraphs: [
          "Memory manager is in src/memory-manager.js.",
          "It uses paging (page table + per-process page ownership) and exposes stats through the Kernel."
        ],
        code: [
          "free"
        ]
      },
      {
        id: "process-manager",
        title: "Process Manager",
        paragraphs: [
          "Process manager is in src/process-manager.js.",
          "It models creation, scheduling, and termination with a round-robin style flow."
        ],
        code: [
          "ps",
          "kill <pid>",
          "killall <name>",
          "nice <priority> <command>"
        ]
      },
      {
        id: "user-management",
        title: "User Management",
        paragraphs: [
          "User manager is in src/user-manager.js with roles (admin, user, guest).",
          "Use admin accounts for full access when demonstrating system files."
        ],
        code: [
          "whoami",
          "who",
          "passwd",
          "logout"
        ]
      },
      {
        id: "networking",
        title: "Networking",
        paragraphs: [
          "Networking is simulated by src/device-manager.js (interfaces, ping, basic stats).",
          "ECE/CN concepts: osi, subnet, route, dns map shell output to coursework framing."
        ],
        code: [
          "ifconfig",
          "ping telemetry.lab",
          "netstat",
          "osi",
          "subnet",
          "route",
          "dns"
        ]
      }
    ];

    this.activeId = this.sections[0].id;
    this._overlayEl = null;
    this._contentEl = null;
    this._navButtons = [];
    this._boundHandleKeydown = this._handleKeydown.bind(this);
  }

  mount() {
    if (typeof document === "undefined") {
      return;
    }

    const trigger = document.getElementById(this.buttonId);
    if (trigger) {
      trigger.addEventListener("click", () => this.open());
    }

    this._overlayEl = document.createElement("div");
    this._overlayEl.className = "docs-overlay";
    this._overlayEl.setAttribute("role", "dialog");
    this._overlayEl.setAttribute("aria-modal", "true");
    this._overlayEl.setAttribute("aria-label", "Guides and documentation");
    this._overlayEl.innerHTML = this._renderOverlayHtml();
    document.body.appendChild(this._overlayEl);

    const closeButton = this._overlayEl.querySelector("[data-docs-close]");
    if (closeButton) {
      closeButton.addEventListener("click", () => this.close());
    }

    this._contentEl = this._overlayEl.querySelector("[data-docs-content]");
    this._navButtons = Array.from(this._overlayEl.querySelectorAll("[data-docs-nav]"));
    for (const btn of this._navButtons) {
      btn.addEventListener("click", () => {
        this.setActive(btn.getAttribute("data-docs-nav"));
      });
    }

    this.setActive(this.activeId);
  }

  open() {
    if (!this._overlayEl) {
      this.mount();
    }

    if (!this._overlayEl) {
      return;
    }

    this._overlayEl.classList.add("is-open");
    document.addEventListener("keydown", this._boundHandleKeydown);

    const firstNav = this._navButtons[0];
    if (firstNav) {
      firstNav.focus();
    }
  }

  close() {
    if (!this._overlayEl) {
      return;
    }

    this._overlayEl.classList.remove("is-open");
    document.removeEventListener("keydown", this._boundHandleKeydown);
    this.onClose?.();
  }

  setActive(sectionId) {
    const found = this.sections.find(s => s.id === sectionId);
    if (!found) {
      return;
    }

    this.activeId = sectionId;

    for (const btn of this._navButtons) {
      const isActive = btn.getAttribute("data-docs-nav") === sectionId;
      btn.setAttribute("aria-current", isActive ? "true" : "false");
    }

    if (this._contentEl) {
      this._contentEl.innerHTML = this._renderSection(found);
    }
  }

  _handleKeydown(event) {
    if (!this._overlayEl || !this._overlayEl.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    // Simple keyboard navigation for the sidebar.
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const activeIndex = this._navButtons.findIndex(b => b.getAttribute("aria-current") === "true");
      if (activeIndex === -1) {
        return;
      }

      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(this._navButtons.length - 1, activeIndex + delta));
      const next = this._navButtons[nextIndex];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    }

    if (event.key === "Enter") {
      const active = document.activeElement;
      if (active && active.getAttribute && active.getAttribute("data-docs-nav")) {
        event.preventDefault();
        this.setActive(active.getAttribute("data-docs-nav"));
      }
    }
  }

  _renderOverlayHtml() {
    const nav = this.sections.map(section => {
      return `<button type="button" data-docs-nav="${section.id}">${section.title}</button>`;
    }).join("");

    return `
      <div class="docs-panel">
        <div class="docs-header">
          <strong>Docs Overlay</strong>
          <button type="button" class="docs-close" data-docs-close>Close</button>
        </div>
        <div class="docs-layout">
          <aside class="docs-sidebar">
            <div class="docs-nav">${nav}</div>
          </aside>
          <main class="docs-content" data-docs-content></main>
        </div>
      </div>
    `;
  }

  _renderSection(section) {
    const paragraphs = section.paragraphs || [];
    const codeLines = section.code || [];

    const bodyHtml = paragraphs.map(p => `<p>${this._escapeHtml(p)}</p>`).join("");
    const pre = codeLines.length ? `<pre>${this._escapeHtml(codeLines.join("\n"))}</pre>` : "";
    return `<h2>${this._escapeHtml(section.title)}</h2>${bodyHtml}${pre}`;
  }

  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
}

if (typeof window !== "undefined") {
  window.DocsOverlay = DocsOverlay;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DocsOverlay;
}
