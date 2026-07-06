# ⚡ EDA Playground Pro (VLSI IDE)

[![Express Backend](https://img.shields.io/badge/Backend-Express.js-blue.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![React Client](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-cyan.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![Pure JS Simulator](https://img.shields.io/badge/Simulator-Pure%20JS-green.svg?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

An advanced, full-stack **EDA (Electronic Design Automation) Playground** clone built with React, Node.js, and a custom Javascript-based Verilog event-driven simulator. Run Verilog code, compile designs, view waveform outputs, and analyze signal states right from your web browser—without needing `iverilog` or any local toolchains.

---

## 🚀 Key Features

*   💻 **Dual Monaco Editor**: Features split design and testbench tabs, syntax highlighting, and auto-completion.
*   ⚙️ **Custom Discrete Event Simulator**: Supports 4-value logic (`0`, `1`, `x`, `z`), gates, continuous assignments, initial/always blocks, and basic delays.
*   📈 **HTML5 Canvas Waveform Viewer**: Renders dynamic digital waveforms with interactive zooming (Zoom In/Out) and pan controls.
*   📦 **Rich VLSI Presets**: Includes preconfigured examples such as Half Adder, D Flip-Flop, 4-Bit Synchronous Counter, and more.
*   🌐 **URL Code Sharing**: Compress and share design states using URL parameters (`lz-string`).
*   🌓 **Theme Switcher**: Fluid toggle between sleek dark mode and bright light mode.
*   🖱️ **One-Click Local Deployment**: Simple shell script setup for zero-config starting.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + Tailwind CSS | Fast HMR, component isolation, UI design |
| **Editor** | `@monaco-editor/react` | Industrial-grade code editing experience |
| **Icons** | `lucide-react` | Modern, customizable vector icon pack |
| **Backend** | Express + Node.js | Backend server hosting API and simulation engine |
| **Simulator**| Custom AST compiler & Event Loop | Pure Javascript simulation of Verilog modules |
| **Waveform** | HTML5 2D Canvas | Custom-drawn canvas graphs for timeline analysis |

---

## 📂 Project Structure

```text
VLSI EDA/
├── client/                 # React frontend code
│   ├── src/
│   │   ├── components/     # UI Components (WaveformCanvas, etc.)
│   │   ├── App.jsx         # Main application controller
│   │   ├── main.jsx        # App entry point
│   │   └── styles.css      # Core styles & Tailwind/Vanilla CSS
│   ├── index.html          # Web page shell
│   └── vite.config.js      # Vite build configurations
├── server/                 # Express backend code
│   ├── hdl_simulator.js    # Custom event-driven Verilog simulator engine
│   ├── server.js           # API route controllers
│   └── test_sim.js         # Command-line testing script for simulator
├── package.json            # Workspace package file (concurrent runner)
├── start.sh                # macOS one-click launcher shell script
└── README.md               # Project documentation (This file)
```

---

## 🎮 Workflow & Getting Started

Follow these instructions to install dependencies and run the project locally on your machine.

### Prerequisites

*   **Node.js**: Ensure you have Node.js installed (v16.0.0 or higher recommended).
*   **npm**: Node Package Manager (comes bundled with Node).

### Option A: One-Click Startup (macOS/Linux)

You can launch the entire project instantly using the provided shell script:

```bash
# 1. Give executable permission to the script
chmod +x start.sh

# 2. Run the launcher script
./start.sh
```

> [!NOTE]
> The `start.sh` script automatically detects missing dependencies, installs them for all subfolders, runs both client and server concurrently, and opens your default browser at `http://localhost:5173/`.

### Option B: Manual Setup (All OS)

If you prefer to run setup steps manually, run the following in your terminal:

```bash
# 1. Install workspace and package dependencies
npm run install-all

# 2. Start frontend client and backend server concurrently
npm run dev
```

The React client will run on **[http://localhost:5173](http://localhost:5173)**, and the Express backend will run on port **`5050`**.

---

## 📖 Using the Simulator

1. **Select a Design**: Use the **Presets** dropdown at the top to select an example (e.g. *4-Bit Counter*).
2. **Write/Edit Verilog**:
    * Use the **Design** tab for your hardware module declaration.
    * Use the **Testbench** tab to write logic stimulation, clock generation (`always #5 clk = ~clk`), and monitoring `$monitor`/`$finish`.
3. **Run Simulation**: Click the **Run** button (play icon) on the toolbar.
4. **View Outputs**:
    * Review the terminal logs in the **Console** output panel.
    * Check out generated signal waveforms in the **Waveform** panel. Drag, zoom, and analyze clock cycles!
