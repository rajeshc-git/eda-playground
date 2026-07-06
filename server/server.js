/**
 * server/server.js - Express backend for EDA Playground Pro
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { VerilogSimulator } = require('./hdl_simulator');

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS and JSON parser
app.use(cors());
app.use(express.json());

// Preset VLSI designs database
const PRESETS = {
  sanu: {
    name: "Sanu Preset (Strings)",
    design: `module test_code;
  string s;
  initial begin
    s = "rajesh is the OG goat";
    $display("Test code=%s", s);
  end
endmodule
`,
    testbench: `module tb_string;
  test_code uut();
endmodule
`
  },
  half_adder: {
    name: "Half Adder (Combinational)",
    design: `// Design of a simple Half Adder
module half_adder(
  input a,
  input b,
  output sum,
  output carry
);

  // Combinational continuous assignments
  assign sum = a ^ b;
  assign carry = a & b;

endmodule
`,
    testbench: `// Testbench for Half Adder simulation
module tb_half_adder;
  reg a;
  reg b;
  wire sum;
  wire carry;

  // Instantiate the Unit Under Test (UUT)
  half_adder uut (
    .a(a),
    .b(b),
    .sum(sum),
    .carry(carry)
  );

  initial begin
    // Setup monitoring of signal values in Console
    $monitor("Time=%0t ns | Inputs: a=%b, b=%b | Outputs: sum=%b, carry=%b", $time, a, b, sum, carry);

    // Apply test stimulus
    a = 0; b = 0;
    #10; // Wait 10 ns
    
    a = 0; b = 1;
    #10;
    
    a = 1; b = 0;
    #10;
    
    a = 1; b = 1;
    #10;
    
    $finish; // Terminate simulation
  end

endmodule
`
  },

  d_flip_flop: {
    name: "D Flip-Flop (Sequential)",
    design: `// Design of a D Flip-Flop with active-low asynchronous reset
module d_flip_flop(
  input clk,
  input rst_n,
  input d,
  output reg q
);

  // Sequential always block triggered by clock edges or active-low reset edge
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      q <= 1'b0; // reset active
    end else begin
      q <= d;    // sample D on rising clock edge
    end
  end

endmodule
`,
    testbench: `// Testbench for D Flip-Flop
module tb_d_flip_flop;
  reg clk;
  reg rst_n;
  reg d;
  wire q;

  // Instantiate the UUT
  d_flip_flop uut (
    .clk(clk),
    .rst_n(rst_n),
    .d(d),
    .q(q)
  );

  // Generate continuous clock signal (period of 10 ns)
  always #5 clk = ~clk;

  initial begin
    $monitor("Time=%0t ns | rst_n=%b, d=%b | q=%b", $time, rst_n, d, q);
    
    // Initialize inputs
    clk = 0;
    rst_n = 0; // Assert reset at t=0
    d = 0;
    
    #12;
    rst_n = 1; // Release reset
    
    #10;
    d = 1;     // Set D=1
    
    #10;
    d = 0;     // Set D=0
    
    #10;
    d = 1;     // Set D=1
    
    #15;
    $finish;
  end

endmodule
`
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

endmodule
`,
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

endmodule
`
  },

  alu: {
    name: "Arithmetic Logic Unit (ALU & Case)",
    design: `// Design of a 4-bit ALU with arithmetic and logical operations
module alu(
  input [3:0] a,
  input [3:0] b,
  input [1:0] op,
  output reg [3:0] out,
  output reg carry
);

  // Combinational always block triggered by any input changes
  always @(*) begin
    carry = 1'b0; // Default assignment
    case (op)
      2'b00: {carry, out} = a + b; // Addition (out + carry out)
      2'b01: out = a - b;          // Subtraction
      2'b10: out = a & b;          // Bitwise AND
      2'b11: out = a | b;          // Bitwise OR
      default: out = 4'bxxxx;
    endcase
  end

endmodule
`,
    testbench: `// Testbench for 4-Bit ALU
module tb_alu;
  reg [3:0] a;
  reg [3:0] b;
  reg [1:0] op;
  wire [3:0] out;
  wire carry;

  // Instantiate the UUT
  alu uut (
    .a(a),
    .b(b),
    .op(op),
    .out(out),
    .carry(carry)
  );

  initial begin
    $monitor("Time=%0t ns | op=%b (a=%d, b=%d) | out=%d, carry=%b", $time, op, a, b, out, carry);
    
    // Test Case 1: Add 5 + 3
    a = 4'd5;
    b = 4'd3;
    op = 2'b00;
    #10;
    
    // Test Case 2: Sub 5 - 3
    op = 2'b01;
    #10;
    
    // Test Case 3: Bitwise AND
    op = 2'b10;
    #10;
    
    // Test Case 4: Bitwise OR
    op = 2'b11;
    #10;
    
    // Test Case 5: Add with Carry (12 + 6 = 18 -> carry=1, out=2)
    a = 4'd12;
    b = 4'd6;
    op = 2'b00;
    #10;
    
    $finish;
  end

endmodule
`
  },

  traffic_light: {
    name: "Traffic Light FSM (State Machines)",
    design: `// Design of a simple Traffic Light Controller FSM
module traffic_light(
  input clk,
  input rst,
  output reg [2:0] lights // light vector: [Red, Yellow, Green]
);

  // State encodings
  parameter RED    = 2'b00;
  parameter GREEN  = 2'b01;
  parameter YELLOW = 2'b10;

  reg [1:0] state;
  reg [1:0] next_state;

  // State Transition logic
  always @(posedge clk or posedge rst) begin
    if (rst) begin
      state <= RED;
    end else begin
      state <= next_state;
    end
  end

  // Next State combinational logic
  always @(*) begin
    case (state)
      RED:    next_state = GREEN;
      GREEN:  next_state = YELLOW;
      YELLOW: next_state = RED;
      default: next_state = RED;
    endcase
  end

  // Output logic based on state
  always @(*) begin
    case (state)
      RED:    lights = 3'b100; // Red light on
      GREEN:  lights = 3'b001; // Green light on
      YELLOW: lights = 3'b010; // Yellow light on
      default: lights = 3'b100;
    endcase
  end

endmodule
`,
    testbench: `// Testbench for Traffic Light Controller
module tb_traffic_light;
  reg clk;
  reg rst;
  wire [2:0] lights;

  // Instantiate the UUT
  traffic_light uut (
    .clk(clk),
    .rst(rst),
    .lights(lights)
  );

  // Clock generator (10ns period)
  always #5 clk = ~clk;

  initial begin
    $monitor("Time=%0t ns | Reset=%b | Lights R-Y-G = %b", $time, rst, lights);
    
    clk = 0;
    rst = 1; // start in reset state
    
    #12;
    rst = 0; // release reset
    
    #60;     // observe multiple transitions
    
    $finish;
  end

endmodule
`
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
endmodule
`,
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
endmodule
`
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
endmodule
`,
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
endmodule
`
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
endmodule
`,
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
endmodule
`
  }
};

// Check if a command is available on local path
function isCommandAvailable(cmd) {
  return new Promise((resolve) => {
    exec(`which ${cmd}`, (error, stdout, stderr) => {
      resolve(!error && stdout.trim().length > 0);
    });
  });
}

// REST APIs
// 1. Get Examples Preset
app.get('/api/examples', (req, res) => {
  return res.json(PRESETS);
});

// 2. Perform Simulation
app.post('/api/simulate', async (req, res) => {
  const { designCode, tbCode, timeLimit, engine } = req.body;

  if (!designCode || !tbCode) {
    return res.status(400).json({ success: false, error: "Design and testbench code are required." });
  }

  const maxTime = parseInt(timeLimit, 10) || 500;

  // Option A: Real Icarus Verilog Native Simulation if available on server and selected
  if (engine === 'icarus') {
    const isIverilogAvailable = await isCommandAvailable('iverilog');
    if (isIverilogAvailable) {
      // Setup temp files
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eda-'));
      const designPath = path.join(tempDir, 'design.sv');
      const tbPath = path.join(tempDir, 'testbench.sv');
      const outPath = path.join(tempDir, 'out.vvp');
      const vcdPath = path.join(tempDir, 'dump.vcd');

      fs.writeFileSync(designPath, designCode);
      fs.writeFileSync(tbPath, tbCode);

      // Execute compile command
      // iverilog -g2012 -o out.vvp testbench.sv design.sv
      exec(`iverilog -g2012 -o "${outPath}" "${tbPath}" "${designPath}"`, (compileErr, stdout, stderr) => {
        if (compileErr) {
          cleanTempDir(tempDir);
          return res.json({
            success: false,
            error: "Compilation failed",
            logs: [`%E% [Compilation Error] ${stderr || compileErr.message}`]
          });
        }

        // Run simulation
        // vvp out.vvp
        exec(`vvp "${outPath}"`, (runErr, runStdout, runStderr) => {
          // Parse VCD file if generated
          let waveforms = {};
          if (fs.existsSync(vcdPath)) {
            try {
              waveforms = parseVCDFile(fs.readFileSync(vcdPath, 'utf8'));
            } catch (vcdErr) {
              console.error("VCD Parse Error:", vcdErr);
            }
          }

          cleanTempDir(tempDir);

          const logs = [];
          if (runStdout) logs.push(...runStdout.split('\n'));
          if (runStderr) logs.push(...runStderr.split('\n').map(l => `%W% ${l}`));

          return res.json({
            success: true,
            logs: logs,
            waveforms: waveforms
          });
        });
      });
      return;
    }
  }

  // Option B: Fallback to JS Simulation Engine (or if JS simulator is selected explicitly)
  const simulator = new VerilogSimulator();
  simulator.maxTime = maxTime;

  try {
    simulator.compile(designCode, tbCode);
    simulator.run();

    return res.json({
      success: true,
      logs: simulator.logs,
      waveforms: simulator.waveformLogs
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
      logs: simulator.logs.length > 0 ? simulator.logs : [`%E% ${err.message}`]
    });
  }
});

// Helper: Delete temp directories
function cleanTempDir(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      fs.unlinkSync(path.join(dirPath, file));
    }
    fs.rmdirSync(dirPath);
  } catch (e) {
    console.error("Failed to clean temp directory:", e);
  }
}

// Simple VCD Parser for Native output representation
function parseVCDFile(vcdContent) {
  // A super basic VCD parser that extracts wires, clocks and dump states
  const lines = vcdContent.split('\n');
  const waveforms = {};
  const symbolMap = {}; // Maps code to path
  
  let time = 0;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('$var')) {
      const parts = line.split(/\s+/);
      const width = parseInt(parts[2], 10);
      const code = parts[3];
      const name = parts[4];
      const fullPath = `tb.${name}`; // root testbench assumption
      
      symbolMap[code] = { path: fullPath, width };
      waveforms[fullPath] = {
        name: name,
        path: fullPath,
        width: width,
        values: []
      };
    } else if (line.startsWith('#')) {
      time = parseInt(line.substring(1), 10);
    } else if (line.startsWith('$end') || line.startsWith('$dumpvars') || line.startsWith('$scope')) {
      continue;
    } else {
      // Value change dumps e.g. "0!" or "b1010 #"
      if (line.startsWith('b') || line.startsWith('B') || line.startsWith('r') || line.startsWith('R')) {
        const parts = line.split(/\s+/);
        const val = parts[0].substring(1);
        const code = parts[1];
        const meta = symbolMap[code];
        if (meta) {
          waveforms[meta.path].values.push({ time, val });
        }
      } else {
        const val = line[0];
        const code = line.substring(1);
        const meta = symbolMap[code];
        if (meta) {
          waveforms[meta.path].values.push({ time, val });
        }
      }
    }
  }

  return waveforms;
}

app.listen(PORT, () => {
  console.log(`EDA Backend Server running on http://localhost:${PORT}`);
});
