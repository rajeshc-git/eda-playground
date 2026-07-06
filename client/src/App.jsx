import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import WaveformCanvas from './components/WaveformCanvas';
import { 
  Play, 
  Share2, 
  Code, 
  Sliders, 
  BookOpen, 
  ChevronRight, 
  Terminal, 
  LineChart, 
  X, 
  Copy, 
  HelpCircle, 
  Cpu, 
  Activity,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import './styles.css';
import LZString from 'lz-string';

// Fallback preset templates in case backend connection drops
const FALLBACK_PRESETS = {
  sanu: {
    name: "Sanu Preset (Strings)",
    design: `module test_code;
  string s;
  initial begin
    s = "rajesh is the OG goat";
    $display("Test code=%s", s);
  end
endmodule`,
    testbench: `module tb_string;
  test_code uut();
endmodule`
  },
  counter_4bit: {
    name: "4-Bit Counter (Buses & Delays)",
    design: `// Design of a 4-Bit Synchronous Up Counter
module counter_4bit(
  input clk,
  input rst,
  output reg [3:0] count
);

  always @(posedge clk) begin
    if (rst) begin
      count <= 4'b0000;
    end else begin
      count <= count + 1; // Increment counter on clk rising edge
    end
  end

endmodule`,
    testbench: `// Testbench for 4-Bit Counter
module tb_counter;
  reg clk;
  reg rst;
  wire [3:0] count;

  // Instantiate the UUT
  counter_4bit uut (
    .clk(clk),
    .rst(rst),
    .count(count)
  );

  // Generate 100MHz clock (10ns period)
  always #5 clk = ~clk;

  initial begin
    $monitor("Time=%0t ns | Reset=%b | Count=%d (Binary: %b)", $time, rst, count, count);
    
    clk = 0;
    rst = 1; // Start in reset state
    
    #15;
    rst = 0; // De-assert reset
    
    #80;     // Run for 8 clock cycles
    
    rst = 1; // Re-assert reset to test synchronous clear
    #10;
    
    rst = 0;
    #20;
    
    $finish;
  end

endmodule`
  },

  full_adder_hier: {
    name: "Hierarchical Full Adder (Modules)",
    design: `// Hierarchical Full Adder using two Half Adders
module half_adder(
  input a,
  input b,
  output sum,
  output carry
);
  assign sum = a ^ b;
  assign carry = a & b;
endmodule

module full_adder(
  input a,
  input b,
  input cin,
  output sum,
  output cout
);
  wire s1, c1, c2;
  
  // Instantiate first half adder
  half_adder ha1 (
    .a(a),
    .b(b),
    .sum(s1),
    .carry(c1)
  );
  
  // Instantiate second half adder
  half_adder ha2 (
    .a(s1),
    .b(cin),
    .sum(sum),
    .carry(c2)
  );
  
  assign cout = c1 | c2;
endmodule`,
    testbench: `// Testbench for Hierarchical Full Adder
module tb_full_adder;
  reg a;
  reg b;
  reg cin;
  wire sum;
  wire cout;
  
  // Instantiate Full Adder UUT
  full_adder uut (
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum),
    .cout(cout)
  );
  
  initial begin
    $monitor("Time=%0t ns | a=%b b=%b cin=%b | sum=%b cout=%b", $time, a, b, cin, sum, cout);
    
    a = 0; b = 0; cin = 0; #10;
    a = 0; b = 1; cin = 0; #10;
    a = 1; b = 0; cin = 0; #10;
    a = 1; b = 1; cin = 0; #10;
    a = 1; b = 1; cin = 1; #10;
    $finish;
  end
endmodule`
  },

  shift_register: {
    name: "4-Bit Shift Register (SIPO)",
    design: `// 4-Bit Serial-In Parallel-Out Shift Register
module shift_register(
  input clk,
  input rst_n,
  input si,
  output reg [3:0] po
);
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      po <= 4'b0000;
    end else begin
      // Shift left and insert serial input at LSB
      po <= {po[2:0], si};
    end
  end
endmodule`,
    testbench: `// Testbench for Shift Register
module tb_shift_reg;
  reg clk;
  reg rst_n;
  reg si;
  wire [3:0] po;
  
  // Instantiate UUT
  shift_register uut (
    .clk(clk),
    .rst_n(rst_n),
    .si(si),
    .po(po)
  );
  
  always #5 clk = ~clk;
  
  initial begin
    $monitor("Time=%0t ns | rst_n=%b si=%b | po=%b", $time, rst_n, si, po);
    
    clk = 0; rst_n = 0; si = 0; #12;
    
    rst_n = 1; si = 1; #10; // Shift in 1
    si = 0; #10;            // Shift in 0
    si = 1; #10;            // Shift in 1
    si = 1; #10;            // Shift in 1
    #10;
    $finish;
  end
endmodule`
  },

  gray_converter: {
    name: "4-Bit Binary to Gray Converter",
    design: `// 4-Bit Binary to Gray Code Converter
module gray_converter(
  input [3:0] bin,
  output [3:0] gray
);
  // Combinational Gray conversion
  assign gray[3] = bin[3];
  assign gray[2] = bin[3] ^ bin[2];
  assign gray[1] = bin[2] ^ bin[1];
  assign gray[0] = bin[1] ^ bin[0];
endmodule`,
    testbench: `// Testbench for Binary to Gray converter
module tb_gray;
  reg [3:0] bin;
  wire [3:0] gray;
  
  // Instantiate UUT
  gray_converter uut (
    .bin(bin),
    .gray(gray)
  );
  
  initial begin
    $monitor("Time=%0t ns | Binary=%b | Gray=%b", $time, bin, gray);
    
    bin = 4'b0000; #10;
    bin = 4'b0001; #10;
    bin = 4'b0010; #10;
    bin = 4'b0011; #10;
    bin = 4'b0100; #10;
    bin = 4'b1000; #10;
    bin = 4'b1111; #10;
    $finish;
  end
endmodule`
  }
};

export default function App() {
  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [activePresetKey, setActivePresetKey] = useState('counter_4bit');
  const [tbCode, setTbCode] = useState('');
  const [designCode, setDesignCode] = useState('');
  const [theme, setTheme] = useState('light');
  const [mobileTab, setMobileTab] = useState('code');
  const [focusedEditor, setFocusedEditor] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      const vv = window.visualViewport;
      if (vv) {
        document.documentElement.style.setProperty('--vh', `${vv.height}px`);
      } else {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
      }
    };
    
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);
  const [simTimeLimit, setSimTimeLimit] = useState(500);
  const [engine, setEngine] = useState('client-simulator');
  const [activeTab, setActiveTab] = useState('log-pane');
  const [logs, setLogs] = useState([]);
  const [waveforms, setWaveforms] = useState({});
  const [simTime, setSimTime] = useState(100);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('ready'); // ready, compiling, success, error
  const [modalOpen, setModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Waveform View State
  const [waveformScale, setWaveformScale] = useState(8);
  const [waveformRadix, setWaveformRadix] = useState('h');

  // Monaco Editor instances refs
  const tbEditorRef = useRef(null);
  const designEditorRef = useRef(null);
  const monacoRef = useRef(null);

  // Split Panel percentages
  const [splitV, setSplitV] = useState(50); // Vertical split percentage (Testbench vs Design)
  const [splitH, setSplitH] = useState(60); // Horizontal split percentage (Editors vs Tabs)

  const isResizingV = useRef(false);
  const isResizingH = useRef(false);

  // Fetch preset examples
  useEffect(() => {
    fetch('/api/examples')
      .then(res => res.json())
      .then(data => {
        setPresets(data);
        // Load default example
        if (data.sanu) {
          setDesignCode(data.sanu.design);
          setTbCode(data.sanu.testbench);
          setActivePresetKey('sanu');
        } else if (data.counter_4bit) {
          setDesignCode(data.counter_4bit.design);
          setTbCode(data.counter_4bit.testbench);
        }
      })
      .catch(err => {
        console.warn("Express server connection failed. Running in client mode.", err);
        setDesignCode(FALLBACK_PRESETS.sanu.design);
        setTbCode(FALLBACK_PRESETS.sanu.testbench);
        setActivePresetKey('sanu');
      });

    // Check share URL hash
    loadSharedCode();
  }, []);

  // Update editor values when preset selection changes
  const handleSelectPreset = (key) => {
    setActivePresetKey(key);
    if (presets[key]) {
      setDesignCode(presets[key].design);
      setTbCode(presets[key].testbench);
      clearEditorMarkers();
    }
  };

  const clearEditorMarkers = () => {
    if (monacoRef.current && tbEditorRef.current && designEditorRef.current) {
      monacoRef.current.editor.setModelMarkers(tbEditorRef.current.getModel(), 'owner', []);
      monacoRef.current.editor.setModelMarkers(designEditorRef.current.getModel(), 'owner', []);
    }
  };

  // Compile & Run simulation
  const runSimulation = async () => {
    setLoading(true);
    setStatus('compiling');
    clearEditorMarkers();
    
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setMobileTab('log');
    }
    setActiveTab('log-pane');
    setLogs(["Compiling and initializing HDL design..."]);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designCode,
          tbCode,
          timeLimit: simTimeLimit,
          engine
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setWaveforms(data.waveforms);
        // Calculate max sim time
        let maxTime = 100;
        Object.keys(data.waveforms).forEach(path => {
          const vals = data.waveforms[path].values;
          if (vals.length > 0) {
            maxTime = Math.max(maxTime, vals[vals.length - 1].time);
          }
        });
        setSimTime(maxTime);
        setStatus('success');

        // Confetti celebration
        if (window.confetti) {
          window.confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#06b6d4', '#10b981']
          });
        }

        // Switch tab based on device
        if (isMobile) {
          setMobileTab('log');
          setActiveTab('log-pane');
        } else {
          setActiveTab('waveform-pane');
        }
      } else {
        setLogs(data.logs || [data.error]);
        setStatus('error');
        highlightEditorError(data.error);
        if (isMobile) {
          setMobileTab('log');
          setActiveTab('log-pane');
        }
      }
    } catch (err) {
      setLogs([`Connection Error: Failed to communicate with HDL compilation backend. ${err.message}`]);
      setStatus('error');
      if (isMobile) {
        setMobileTab('log');
        setActiveTab('log-pane');
      }
    } finally {
      setLoading(false);
    }
  };

  // Highlight exact error lines in Monaco
  const highlightEditorError = (errorMsg) => {
    if (!monacoRef.current) return;
    const match = errorMsg.match(/\[(design\.sv|testbench\.sv):(\d+):(\d+)\]/);
    if (match) {
      const filename = match[1];
      const line = parseInt(match[2], 10);
      const col = parseInt(match[3], 10);
      const targetEditor = filename === 'design.sv' ? designEditorRef.current : tbEditorRef.current;
      
      if (targetEditor) {
        monacoRef.current.editor.setModelMarkers(targetEditor.getModel(), 'owner', [{
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: col + 5,
          message: errorMsg,
          severity: monacoRef.current.MarkerSeverity.Error
        }]);
        targetEditor.revealLineInCenter(line);
      }
    }
  };

  // Create shareable state URL
  const generateShareUrl = () => {
    const data = {
      design: designCode,
      tb: tbCode,
      example: activePresetKey
    };
    // LZString compression
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const shareUrlStr = `${window.location.origin}${window.location.pathname}#code=${compressed}`;
    setShareUrl(shareUrlStr);
    setModalOpen(true);
  };

  // Load from URL hash code
  const loadSharedCode = () => {
    if (window.location.hash && window.location.hash.startsWith('#code=')) {
      try {
        const comp = window.location.hash.substring(6);
        const json = LZString.decompressFromEncodedURIComponent(comp);
        if (json) {
          const data = JSON.parse(json);
          if (data.design && data.tb) {
            setDesignCode(data.design);
            setTbCode(data.tb);
            if (data.example) setActivePresetKey(data.example);
          }
        }
      } catch (e) {
        console.error("Failed to parse shared code hash", e);
      }
    }
  };

  // Drag splitters
  const startDragV = (e) => {
    e.preventDefault();
    isResizingV.current = true;
    document.addEventListener('mousemove', onDragV);
    document.addEventListener('mouseup', stopDragV);
  };

  const onDragV = (e) => {
    if (!isResizingV.current) return;
    const container = document.getElementById('pane-top');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    if (percent >= 15 && percent <= 85) {
      setSplitV(percent);
    }
  };

  const stopDragV = () => {
    isResizingV.current = false;
    document.removeEventListener('mousemove', onDragV);
    document.removeEventListener('mouseup', stopDragV);
  };

  const startDragH = (e) => {
    e.preventDefault();
    isResizingH.current = true;
    document.addEventListener('mousemove', onDragH);
    document.addEventListener('mouseup', stopDragH);
  };

  const onDragH = (e) => {
    if (!isResizingH.current) return;
    const container = document.getElementById('app-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = ((e.clientY - rect.top) / rect.height) * 100;
    if (percent >= 20 && percent <= 80) {
      setSplitH(percent);
    }
  };

  const stopDragH = () => {
    isResizingH.current = false;
    document.removeEventListener('mousemove', onDragH);
    document.removeEventListener('mouseup', stopDragH);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    const btn = document.getElementById('modal-copy-btn');
    if (btn) {
      const origText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      btn.style.backgroundColor = 'var(--color-success)';
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.style.backgroundColor = '';
      }, 2000);
    }
  };

  return (
    <>
      {/* Navigation Header */}
      <header>
        <div className="logo-container">
          <div className="logo-icon">
            <Cpu size={18} style={{ color: 'var(--bg-main)' }} />
          </div>
          <div className="logo-text">EDA <span>Playground Pro</span></div>
          <span className={`status-badge status-${status}`}>
            {status === 'compiling' ? 'Running...' : status}
          </span>
        </div>
        
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setAboutModalOpen(true)} title="About" style={{ padding: '8px', minWidth: '40px', justifyContent: 'center' }}>
            <HelpCircle size={16} />
          </button>
          <button className="btn-secondary" onClick={toggleTheme} title="Toggle Theme" style={{ padding: '8px', minWidth: '40px', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn-secondary" onClick={generateShareUrl} title="Share Link">
            <Share2 size={16} /> <span className="btn-text">Share Link</span>
          </button>
          <button className="btn-primary" onClick={runSimulation} disabled={loading} title="Compile & Run">
            <Play size={16} /> <span className="btn-text">Compile & Run</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar Header */}
      <div className="mobile-tabs-bar">
        <button className={mobileTab === 'code' ? 'active' : ''} onClick={() => setMobileTab('code')}>
          <Code size={14} /> Code
        </button>
        <button className={mobileTab === 'log' ? 'active' : ''} onClick={() => { setMobileTab('log'); setActiveTab('log-pane'); }}>
          <Terminal size={14} /> Log
        </button>
        <button className={mobileTab === 'waveform' ? 'active' : ''} onClick={() => { setMobileTab('waveform'); setActiveTab('waveform-pane'); }}>
          <LineChart size={14} /> Waves
        </button>
        <button className={mobileTab === 'settings' ? 'active' : ''} onClick={() => setMobileTab('settings')}>
          <Sliders size={14} /> Settings
        </button>
      </div>

      {/* Main Container */}
      <div className="app-container" id="app-container">
        
        {/* Sidebar settings */}
        <aside className={`sidebar ${mobileTab === 'settings' ? 'mobile-active' : ''}`}>
          <div className="sidebar-section">
            <h3><Code size={14} /> Lang & Simulator</h3>
            <div className="form-group">
              <label>Language & Standards</label>
              <select>
                <option value="systemverilog">Verilog / SystemVerilog</option>
                <option value="vhdl" disabled>VHDL (Future)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Compiler Tool</label>
              <select value={engine} onChange={(e) => setEngine(e.target.value)}>
                <option value="client-simulator">Integrated Simulator (JS-Event)</option>
                <option value="icarus">Icarus Verilog 12 (Native Compiler)</option>
              </select>
            </div>
          </div>

          <div className="sidebar-section">
            <h3><Sliders size={14} /> Run Configurations</h3>
            <div className="form-group">
              <label>Max Time limit (ns)</label>
              <input 
                type="number" 
                value={simTimeLimit} 
                onChange={(e) => setSimTimeLimit(Math.max(10, parseInt(e.target.value, 10) || 500))}
                min="10" 
                max="10000" 
                step="50" 
              />
            </div>
          </div>

          <div className="sidebar-section">
            <h3><BookOpen size={14} /> Preset Designs</h3>
            <div className="examples-list">
              {Object.keys(presets).map(key => {
                const isActive = key === activePresetKey;
                return (
                  <div 
                    key={key} 
                    className={`example-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(key)}
                  >
                    <span>{presets[key].name || key}</span>
                    <ChevronRight size={12} />
                  </div>
                );
              })}
            </div>
          </div>
          
          <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', fontSize: '12px', lineHeight: '1.5', color: 'var(--color-text-muted)' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={14} /> Tips
            </h4>
            <p>1. Edit the <strong>Testbench</strong> on the left, and hardware logic <strong>Design</strong> on the right.</p>
            <p style={{ marginTop: '6px' }}>2. Click <strong>Compile & Run</strong>. Compilation output displays in Console; waveform triggers print signal traces below.</p>
          </div>
        </aside>

        {/* Workspace Editors Panel */}
        <main className="main-ide-panels">
          
          {/* Top Panel: split editors */}
          <div className={`pane-top ${(mobileTab === 'code' || mobileTab === 'testbench' || mobileTab === 'design') ? 'mobile-active' : ''}`} id="pane-top" style={{ height: `${splitH}%` }}>
            
            {/* Left Monaco: Testbench */}
            <section 
              className={`editor-pane ${(mobileTab === 'code' || mobileTab === 'testbench') ? 'mobile-active' : ''} ${focusedEditor === 'testbench' ? 'editor-focused' : ''} ${focusedEditor === 'design' ? 'editor-hidden' : ''}`} 
              style={{ width: `${splitV}%` }}
            >
              <div className="editor-pane-header">
                <div className="editor-pane-title">
                  <Activity size={14} style={{ color: 'var(--color-secondary)' }} /> testbench.sv
                </div>
                <div className="status-badge editor-badge">Testbench Stimulus</div>
              </div>
              <div className="editor-container">
                <Editor
                  height="100%"
                  language="systemverilog"
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  value={tbCode}
                  onChange={(val) => setTbCode(val || '')}
                  options={{
                    fontSize: 14,
                    fontFamily: 'Fira Code, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineHeight: 22,
                    automaticLayout: true,
                    padding: { top: 12 }
                  }}
                  onMount={(editor, monaco) => {
                    tbEditorRef.current = editor;
                    monacoRef.current = monaco;
                    editor.onDidFocusEditorWidget(() => {
                      setFocusedEditor('testbench');
                    });
                    editor.onDidBlurEditorWidget(() => {
                      setTimeout(() => {
                        setFocusedEditor(null);
                      }, 120);
                    });
                  }}
                />
              </div>
            </section>

            {/* Splitter vertical handle */}
            <div className="splitter splitter-vertical" onMouseDown={startDragV}></div>

            {/* Right Monaco: Design logic */}
            <section 
              className={`editor-pane ${(mobileTab === 'code' || mobileTab === 'design') ? 'mobile-active' : ''} ${focusedEditor === 'design' ? 'editor-focused' : ''} ${focusedEditor === 'testbench' ? 'editor-hidden' : ''}`} 
              style={{ width: `calc(${100 - splitV}% - 4px)` }}
            >
              <div className="editor-pane-header">
                <div className="editor-pane-title">
                  <Cpu size={14} style={{ color: 'var(--color-secondary)' }} /> design.sv
                </div>
                <div className="status-badge editor-badge">HDL Hardware Logic</div>
              </div>
              <div className="editor-container">
                <Editor
                  height="100%"
                  language="systemverilog"
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  value={designCode}
                  onChange={(val) => setDesignCode(val || '')}
                  options={{
                    fontSize: 14,
                    fontFamily: 'Fira Code, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineHeight: 22,
                    automaticLayout: true,
                    padding: { top: 12 }
                  }}
                  onMount={(editor) => {
                    designEditorRef.current = editor;
                    editor.onDidFocusEditorWidget(() => {
                      setFocusedEditor('design');
                    });
                    editor.onDidBlurEditorWidget(() => {
                      setTimeout(() => {
                        setFocusedEditor(null);
                      }, 120);
                    });
                  }}
                />
              </div>
            </section>

          </div>

          {/* Splitter horizontal handle */}
          <div className="splitter splitter-horizontal" onMouseDown={startDragH}></div>

          {/* Bottom Panel: tabs console & waveforms */}
          <div className={`pane-bottom ${(mobileTab === 'log' || mobileTab === 'waveform') ? 'mobile-active' : ''}`} style={{ height: `calc(${100 - splitH}% - 4px)` }}>
            
            <div className="tabs-header">
              <div className={`tabs-list show-only-${activeTab}`}>
                <button 
                  className={`tab-button tab-log-btn ${activeTab === 'log-pane' ? 'active' : ''}`}
                  onClick={() => setActiveTab('log-pane')}
                >
                  <Terminal size={14} style={{ marginRight: '6px', display: 'inline' }} /> Console Log
                </button>
                <button 
                  className={`tab-button tab-wave-btn ${activeTab === 'waveform-pane' ? 'active' : ''}`}
                  onClick={() => setActiveTab('waveform-pane')}
                >
                  <LineChart size={14} style={{ marginRight: '6px', display: 'inline' }} /> EPWave Waveform Viewer
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-darker)' }}>
                Compilation Backend Execution
              </div>
            </div>

            <div className="tab-content" style={{ flex: 1 }}>
              
              {/* Tab: Log Console */}
              <div className={`tab-pane ${activeTab === 'log-pane' ? 'active' : ''}`} id="log-pane">
                {logs.map((line, idx) => {
                  let lineClass = 'log-line';
                  let cleanLine = line;
                  if (line.includes('%E%')) {
                    lineClass = 'log-line log-error';
                    cleanLine = line.replace('%E%', '[Error]');
                  } else if (line.includes('%W%')) {
                    lineClass = 'log-line log-warning';
                    cleanLine = line.replace('%W%', '[Warning]');
                  } else if (line.includes('successfully') || line.includes('finished')) {
                    lineClass = 'log-line log-success';
                  }
                  return (
                    <div key={idx} className={lineClass}>
                      {cleanLine}
                    </div>
                  );
                })}
              </div>

              {/* Tab: Waveform Canvas */}
              <div className={`tab-pane ${activeTab === 'waveform-pane' ? 'active' : ''}`} id="waveform-pane">
                <div className="waveform-toolbar">
                  <div className="waveform-controls">
                    <label>Display Radix:</label>
                    <select value={waveformRadix} onChange={(e) => setWaveformRadix(e.target.value)}>
                      <option value="h">Hexadecimal (Hex)</option>
                      <option value="d">Decimal (Dec)</option>
                      <option value="b">Binary (Bin)</option>
                      <option value="o">Octal (Oct)</option>
                    </select>
                  </div>

                  <div className="waveform-controls">
                    <div className="waveform-controls-group">
                    <button className="btn-secondary" onClick={() => setWaveformScale(s => Math.max(1, s / 1.5))} title="Zoom Out">
                      <ZoomOut size={14} />
                    </button>
                    <button className="btn-secondary" onClick={() => setWaveformScale(s => Math.min(64, s * 1.5))} title="Zoom In">
                      <ZoomIn size={14} />
                    </button>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => {
                      const width = document.querySelector('.waveform-canvas-container')?.clientWidth - 40;
                      if (width && simTime > 0) {
                        setWaveformScale(width / simTime);
                      }
                    }}>
                      <Maximize2 size={14} /> Zoom Fit
                    </button>
                    </div>
                  </div>
                </div>

                <WaveformCanvas 
                  waveformLogs={waveforms} 
                  scale={waveformScale} 
                  radix={waveformRadix} 
                  simulationTime={simTime}
                  theme={theme}
                />
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Share Links Modal popup */}
      <div className={`modal-overlay ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Share Playground Link</h2>
            <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Copy the link below. It contains your compressed design workspace, presets, and configuration in the URL. Bookmark it or share it with others!
          </p>
          <div className="share-url-container">
            <input type="text" readOnly value={shareUrl} style={{ flex: 1 }} />
            <button id="modal-copy-btn" className="btn-primary" onClick={handleCopyLink}>
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
      </div>

      {/* About Modal popup */}
      <div className={`modal-overlay ${aboutModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ maxWidth: '480px' }}>
          <div className="modal-header">
            <h2>About EDA Playground Pro</h2>
            <button className="modal-close" onClick={() => setAboutModalOpen(false)}><X size={18} /></button>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--color-text-muted)' }}>
            <p>
              Welcome to <strong>EDA Playground Pro</strong>, a premium, browser-integrated development environment for Verilog and SystemVerilog hardware description languages.
            </p>
            
            <div style={{ 
              margin: '20px 0', 
              padding: '16px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-primary)', fontWeight: 600 }}>
                💝 Special Dedication
              </h3>
              <p style={{ margin: '0', fontSize: '13px', color: 'var(--color-text-main)', fontStyle: 'italic', fontWeight: 500 }}>
                "A special gift to Sanu from Rajesh."
              </p>
            </div>

            <p style={{ marginTop: '12px' }}>
              Built with standard event-driven frontend logic and native Icarus Verilog compilers to enable instantaneous code execution and digital waveform debugging.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
