# Mini OS Lab

Mini OS Lab is a browser-based operating system simulation built with vanilla JavaScript, HTML, and CSS. It is designed as a standalone Electronics and Communication Engineering learning project that connects OS concepts to embedded systems, signal flow, telemetry, communication networks, and hardware abstraction.

## Why it fits ECE

The simulator is intentionally framed around systems ideas that matter in Electronics and Communication:

- Process scheduling can be explained like RTOS-style task rotation.
- Memory allocation maps well to buffer planning in constrained hardware.
- The device layer mirrors real hardware abstraction in embedded design.
- Network commands support a communication-engineering story around telemetry and diagnostics.
- ADC, spectrum, and communication-chain views extend the project beyond generic OS demos.

## Features

- Interactive OS shell with filesystem, process, memory, device, and user management
- ECE-focused shell commands: `lab`, `signals`, `bus`, `adc`, `spectrum`, and `comm`
- ECE-themed demo files in `/projects`, `/lab`, and `/etc`
- Portfolio landing page wrapped around the simulator
- Static-site deployment workflow for GitHub Pages
- Local zero-dependency static server script
- Node-based test runner for the core simulation modules

## Quick Start

### Run locally

```bash
npm run serve
```

Then open `http://localhost:3000`.

You can also open `index.html` directly in a browser, but using the local server is cleaner for testing and demos.

### Run tests

```bash
npm test
```

## Login

Use any of these accounts:

- `admin` / `admin`
- `user` / `user`
- `guest` / `guest`

## Best demo commands

After logging in, try:

```text
lab
signals
bus
cat /projects/ece-system-brief.txt
cat /lab/telemetry.log
cat /etc/bus-map.conf
ping telemetry.lab
ifconfig
help
```

## Project structure

```text
mini-os/
|-- index.html
|-- style.css
|-- app.js
|-- package.json
|-- scripts/
|   `-- serve.js
|-- src/
|   |-- kernel.js
|   |-- filesystem.js
|   |-- process-manager.js
|   |-- memory-manager.js
|   |-- user-manager.js
|   |-- device-manager.js
|   |-- shell.js
|   |-- apps/
|   `-- utils/
|-- tests/
|   |-- run-tests.js
|   `-- test.js
`-- .github/workflows/
    `-- deploy-pages.yml
```
## License

MIT
