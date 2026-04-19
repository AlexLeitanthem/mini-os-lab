// WHY: Simple text editor for editing files within the mini OS
// CONTEXT: In-terminal text editor with basic editing capabilities

class TextEditor {
  /**
   * @param {object} kernel - Kernel instance
   * @param {object} shell - Shell instance
   */
  constructor(kernel, shell) {
    this.kernel = kernel;
    this.shell = shell;
    this.filename = null;
    this.lines = [];
    this.cursorLine = 0;
    this.cursorCol = 0;
    this.mode = 'normal'; // 'normal', 'insert', 'command'
    this.commandBuffer = '';
    this.message = '';
    this.modified = false;
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Open a file for editing
   * @param {string} filename - File path
   * @returns {string} Initial screen
   */
  open(filename) {
    this.filename = Utils.resolvePath(filename, this.shell.currentDirectory);
    this.lines = [''];
    this.cursorLine = 0;
    this.cursorCol = 0;
    this.mode = 'normal';
    this.message = '';
    this.modified = false;
    this.history = [];
    
    // Try to read existing file
    const content = this.kernel.syscall('read', this.filename,
      this.shell.session?.user || 'root',
      this.shell.session?.role || 'admin');
    
    if (content !== null && content !== undefined) {
      this.lines = content.split('\n');
      if (this.lines.length === 0) this.lines = [''];
    }
    
    return this._render();
  }

  /**
   * Handle key input
   * @param {string} key - Key pressed
   * @returns {string} Updated screen
   */
  handleKey(key) {
    // Handle escape key
    if (key === 'Escape') {
      this.mode = 'normal';
      this.message = '';
      return this._render();
    }

    switch (this.mode) {
      case 'normal':
        return this._handleNormal(key);
      case 'insert':
        return this._handleInsert(key);
      case 'command':
        return this._handleCommand(key);
      default:
        return this._render();
    }
  }

  /**
   * Handle normal mode keys (vim-like)
   */
  _handleNormal(key) {
    switch (key) {
      case 'i':
        this.mode = 'insert';
        this.message = '-- INSERT --';
        break;
      case 'a':
        this.cursorCol = Math.min(this.cursorCol + 1, this.lines[this.cursorLine].length);
        this.mode = 'insert';
        this.message = '-- INSERT --';
        break;
      case 'o':
        this.lines.splice(this.cursorLine + 1, 0, '');
        this.cursorLine++;
        this.cursorCol = 0;
        this.modified = true;
        this.mode = 'insert';
        this.message = '-- INSERT --';
        break;
      case 'h':
        this.cursorCol = Math.max(0, this.cursorCol - 1);
        break;
      case 'l':
        this.cursorCol = Math.min(this.cursorCol + 1, this.lines[this.cursorLine].length);
        break;
      case 'k':
        this.cursorLine = Math.max(0, this.cursorLine - 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        break;
      case 'j':
        this.cursorLine = Math.min(this.lines.length - 1, this.cursorLine + 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        break;
      case ':':
        this.mode = 'command';
        this.commandBuffer = ':';
        break;
      case '0':
        this.cursorCol = 0;
        break;
      case '$':
        this.cursorCol = this.lines[this.cursorLine].length;
        break;
      case 'g':
        this.cursorLine = 0;
        this.cursorCol = 0;
        break;
      case 'G':
        this.cursorLine = this.lines.length - 1;
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        break;
      case 'x':
        this._saveHistory();
        const line = this.lines[this.cursorLine];
        this.lines[this.cursorLine] = line.substring(0, this.cursorCol) + line.substring(this.cursorCol + 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        if (this.lines[this.cursorLine] === '' && this.lines.length > 1) {
          this.lines.splice(this.cursorLine, 1);
          this.cursorLine = Math.min(this.cursorLine, this.lines.length - 1);
        }
        this.modified = true;
        break;
      case 'd':
        this._saveHistory();
        this.lines.splice(this.cursorLine, 1);
        if (this.lines.length === 0) this.lines = [''];
        this.cursorLine = Math.min(this.cursorLine, this.lines.length - 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        this.modified = true;
        break;
      default:
        // Store in command buffer for potential multi-char commands
        break;
    }
    return this._render();
  }

  /**
   * Handle insert mode keys
   */
  _handleInsert(key) {
    switch (key) {
      case 'Enter':
        this._saveHistory();
        const currentLine = this.lines[this.cursorLine];
        this.lines[this.cursorLine] = currentLine.substring(0, this.cursorCol);
        const newLine = currentLine.substring(this.cursorCol);
        this.lines.splice(this.cursorLine + 1, 0, newLine);
        this.cursorLine++;
        this.cursorCol = 0;
        this.modified = true;
        break;
      case 'Backspace':
        if (this.cursorCol > 0) {
          this._saveHistory();
          const line = this.lines[this.cursorLine];
          this.lines[this.cursorLine] = line.substring(0, this.cursorCol - 1) + line.substring(this.cursorCol);
          this.cursorCol--;
          this.modified = true;
        } else if (this.cursorLine > 0) {
          this._saveHistory();
          const prevLineLen = this.lines[this.cursorLine - 1].length;
          this.lines[this.cursorLine - 1] += this.lines[this.cursorLine];
          this.lines.splice(this.cursorLine, 1);
          this.cursorLine--;
          this.cursorCol = prevLineLen;
          this.modified = true;
        }
        break;
      case 'Delete':
        if (this.cursorCol < this.lines[this.cursorLine].length) {
          this._saveHistory();
          const line = this.lines[this.cursorLine];
          this.lines[this.cursorLine] = line.substring(0, this.cursorCol) + line.substring(this.cursorCol + 1);
          this.modified = true;
        }
        break;
      case 'ArrowLeft':
        this.cursorCol = Math.max(0, this.cursorCol - 1);
        break;
      case 'ArrowRight':
        this.cursorCol = Math.min(this.cursorCol + 1, this.lines[this.cursorLine].length);
        break;
      case 'ArrowUp':
        this.cursorLine = Math.max(0, this.cursorLine - 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        break;
      case 'ArrowDown':
        this.cursorLine = Math.min(this.lines.length - 1, this.cursorLine + 1);
        this.cursorCol = Math.min(this.cursorCol, this.lines[this.cursorLine].length);
        break;
      default:
        if (key.length === 1 && !key.startsWith('Arrow') && key !== 'Escape') {
          this._saveHistory();
          const line = this.lines[this.cursorLine];
          this.lines[this.cursorLine] = line.substring(0, this.cursorCol) + key + line.substring(this.cursorCol);
          this.cursorCol++;
          this.modified = true;
        }
        break;
    }
    return this._render();
  }

  /**
   * Handle command mode keys
   */
  _handleCommand(key) {
    switch (key) {
      case 'Enter':
        const cmd = this.commandBuffer.substring(1).trim();
        this.message = this._executeCommand(cmd);
        if (this.message === '__CLOSE__') {
          return '__CLOSE__';
        }
        this.mode = 'normal';
        this.commandBuffer = '';
        break;
      case 'Backspace':
        if (this.commandBuffer.length > 1) {
          this.commandBuffer = this.commandBuffer.slice(0, -1);
        }
        break;
      default:
        this.commandBuffer += key;
        break;
    }
    return this._render();
  }

  /**
   * Execute editor command
   */
  _executeCommand(cmd) {
    switch (cmd) {
      case 'q':
        return '__CLOSE__';
      case 'q!':
        return '__CLOSE__';
      case 'wq':
      case 'x':
        this._save();
        return '__CLOSE__';
      case 'w':
        return this._save() ? 'File saved' : 'Error saving file';
      default:
        if (cmd.startsWith('w ')) {
          // Save as
          const newFile = cmd.substring(2).trim();
          if (newFile) {
            this.filename = Utils.resolvePath(newFile, this.shell.currentDirectory);
            return this._save() ? 'File saved' : 'Error saving file';
          }
        }
        return `Unknown command: ${cmd}`;
    }
  }

  /**
   * Save file
   */
  _save() {
    if (!this.filename || !this.shell.session) return false;
    
    const content = this.lines.join('\n');
    const result = this.kernel.syscall('write', this.filename, content,
      this.shell.session.user, this.shell.session.role);
    
    if (result) {
      this.modified = false;
    }
    return result;
  }

  /**
   * Save to history for undo
   */
  _saveHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(Utils.deepClone(this.lines));
    this.historyIndex = this.history.length - 1;
  }

  /**
   * Render the editor screen
   */
  _render() {
    const termHeight = 24;
    const termWidth = 80;
    const lines = [];
    
    // Title bar
    const modifiedMark = this.modified ? ' [+]' : '';
    const title = ` mini-os Editor - ${this.filename}${modifiedMark} `.padEnd(termWidth, ' ');
    lines.push(title.substring(0, termWidth));
    lines.push('~'.repeat(termWidth));
    
    // File content
    const startLine = Math.max(0, this.cursorLine - Math.floor(termHeight / 2) + 2);
    const endLine = Math.min(this.lines.length, startLine + termHeight - 5);
    
    for (let i = startLine; i < endLine; i++) {
      const line = this.lines[i];
      if (i === this.cursorLine) {
        // Highlight cursor position
        let displayLine = '';
        for (let j = 0; j < termWidth - 1; j++) {
          if (j === this.cursorCol) {
            displayLine += line[j] || ' ';
          } else {
            displayLine += line[j] || ' ';
          }
        }
        lines.push(displayLine);
      } else {
        lines.push(line.substring(0, termWidth) || ' ');
      }
    }
    
    // Fill remaining lines with ~
    while (lines.length < termHeight - 3) {
      lines.push('~');
    }
    
    // Status line
    const modeStr = this.mode === 'insert' ? 'INSERT' : this.mode === 'command' ? 'COMMAND' : 'NORMAL';
    const statusLine = `[${modeStr}] ${this.lines.length}L ${this.lines.reduce((a, b) => a + b.length, 0)}C`.padEnd(termWidth);
    lines.push(statusLine.substring(0, termWidth));
    
    // Command/message line
    const msgLine = (this.commandBuffer || this.message).padEnd(termWidth).substring(0, termWidth);
    lines.push(msgLine);
    
    // Help line
    const helpLine = 'Press i=insert ESC=normal :=cmd h/j/k/l=move'.padEnd(termWidth).substring(0, termWidth);
    lines.push(helpLine);
    
    return lines.join('\n');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextEditor;
}
