/**
 * server/test_sim.js - Local test runner for the HDL Simulator Engine.
 * This runs all presets and asserts execution success directly in Node.js.
 */

const { VerilogSimulator } = require('./hdl_simulator');

// Prefined Presets copy
const PRESETS = {
  half_adder: {
    name: "Half Adder",
    design: `module half_adder(input a, input b, output sum, output carry);
      assign sum = a ^ b;
      assign carry = a & b;
    endmodule`,
    testbench: `module tb_half_adder;
      reg a; reg b; wire sum; wire carry;
      half_adder uut (.a(a), .b(b), .sum(sum), .carry(carry));
      initial begin
        $monitor("Time=%0t a=%b b=%b sum=%b carry=%b", $time, a, b, sum, carry);
        a = 0; b = 0; #10;
        a = 0; b = 1; #10;
        a = 1; b = 0; #10;
        a = 1; b = 1; #10;
        $finish;
      end
    endmodule`
  },
  
  d_flip_flop: {
    name: "D Flip-Flop",
    design: `module d_flip_flop(input clk, input rst_n, input d, output reg q);
      always @(posedge clk or negedge rst_n) begin
        if (!rst_n) q <= 1'b0;
        else q <= d;
      end
    endmodule`,
    testbench: `module tb_d_flip_flop;
      reg clk; reg rst_n; reg d; wire q;
      d_flip_flop uut (.clk(clk), .rst_n(rst_n), .d(d), .q(q));
      always #5 clk = ~clk;
      initial begin
        $monitor("Time=%0t clk=%b rst_n=%b d=%b q=%b", $time, clk, rst_n, d, q);
        clk = 0; rst_n = 0; d = 0; #12;
        rst_n = 1; #10;
        d = 1; #10;
        d = 0; #10;
        $finish;
      end
    endmodule`
  },

  counter_4bit: {
    name: "4-Bit Counter",
    design: `module counter_4bit(input clk, input rst, output reg [3:0] count);
      always @(posedge clk) begin
        if (rst) count <= 4'b0000;
        else count <= count + 1;
      end
    endmodule`,
    testbench: `module tb_counter;
      reg clk; reg rst; wire [3:0] count;
      counter_4bit uut (.clk(clk), .rst(rst), .count(count));
      always #5 clk = ~clk;
      initial begin
        $monitor("Time=%0t clk=%b rst=%b count=%d", $time, clk, rst, count);
        clk = 0; rst = 1; #15;
        rst = 0; #80;
        $finish;
      end
    endmodule`
  },

  alu: {
    name: "4-Bit ALU",
    design: `module alu(input [3:0] a, input [3:0] b, input [1:0] op, output reg [3:0] out, output reg carry);
      always @(*) begin
        carry = 1'b0;
        case (op)
          2'b00: {carry, out} = a + b;
          2'b01: out = a - b;
          2'b10: out = a & b;
          2'b11: out = a | b;
          default: out = 4'bxxxx;
        endcase
      end
    endmodule`,
    testbench: `module tb_alu;
      reg [3:0] a; reg [3:0] b; reg [1:0] op; wire [3:0] out; wire carry;
      alu uut (.a(a), .b(b), .op(op), .out(out), .carry(carry));
      initial begin
        $monitor("Time=%0t a=%b b=%b op=%b out=%b carry=%b", $time, a, b, op, out, carry);
        a = 4'd5; b = 4'd3; op = 2'b00; #10;
        op = 2'b01; #10;
        op = 2'b10; #10;
        op = 2'b11; #10;
        $finish;
      end
    endmodule`
  },

  traffic_light: {
    name: "Traffic Light FSM",
    design: `module traffic_light(input clk, input rst, output reg [2:0] lights);
      parameter RED    = 2'b00;
      parameter GREEN  = 2'b01;
      parameter YELLOW = 2'b10;
      reg [1:0] state;
      reg [1:0] next_state;
      always @(posedge clk or posedge rst) begin
        if (rst) state <= RED;
        else state <= next_state;
      end
      always @(*) begin
        case (state)
          RED:    next_state = GREEN;
          GREEN:  next_state = YELLOW;
          YELLOW: next_state = RED;
          default: next_state = RED;
        endcase
      end
      always @(*) begin
        case (state)
          RED:    lights = 3'b100;
          GREEN:  lights = 3'b001;
          YELLOW: lights = 3'b010;
          default: lights = 3'b100;
        endcase
      end
    endmodule`,
    testbench: `module tb_traffic_light;
      reg clk; reg rst; wire [2:0] lights;
      traffic_light uut (.clk(clk), .rst(rst), .lights(lights));
      always #5 clk = ~clk;
      initial begin
        $monitor("Time=%0t rst=%b lights=%b", $time, rst, lights);
        clk = 0; rst = 1; #12;
        rst = 0; #60;
        $finish;
      end
    endmodule`
  },

  string_test: {
    name: "SystemVerilog Strings",
    design: `module test_code;
      string s;
      initial begin
        s = "rajesh is the OG goat";
        $display("Test code=%s", s);
        $finish;
      end
    endmodule`,
    testbench: `module tb_string;
      test_code uut();
    endmodule`
  },

  full_adder_hier: {
    name: "Hierarchical Full Adder",
    design: `module half_adder(input a, input b, output sum, output carry);
      assign sum = a ^ b;
      assign carry = a & b;
    endmodule
    module full_adder(input a, input b, input cin, output sum, output cout);
      wire s1, c1, c2;
      half_adder ha1 (.a(a), .b(b), .sum(s1), .carry(c1));
      half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));
      assign cout = c1 | c2;
    endmodule`,
    testbench: `module tb_full_adder;
      reg a; reg b; reg cin; wire sum; wire cout;
      full_adder uut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));
      initial begin
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
    name: "4-Bit Shift Register",
    design: `module shift_register(input clk, input rst_n, input si, output reg [3:0] po);
      always @(posedge clk or negedge rst_n) begin
        if (!rst_n) po <= 4'b0000;
        else po <= {po[2:0], si};
      end
    endmodule`,
    testbench: `module tb_shift_reg;
      reg clk; reg rst_n; reg si; wire [3:0] po;
      shift_register uut (.clk(clk), .rst_n(rst_n), .si(si), .po(po));
      always #5 clk = ~clk;
      initial begin
        clk = 0; rst_n = 0; si = 0; #12;
        rst_n = 1; si = 1; #10;
        si = 0; #10;
        si = 1; #10;
        si = 1; #10;
        $finish;
      end
    endmodule`
  },

  gray_converter: {
    name: "4-Bit Gray Code Converter",
    design: `module gray_converter(input [3:0] bin, output [3:0] gray);
      assign gray[3] = bin[3];
      assign gray[2] = bin[3] ^ bin[2];
      assign gray[1] = bin[2] ^ bin[1];
      assign gray[0] = bin[1] ^ bin[0];
    endmodule`,
    testbench: `module tb_gray;
      reg [3:0] bin; wire [3:0] gray;
      gray_converter uut (.bin(bin), .gray(gray));
      initial begin
        bin = 4'b0000; #10;
        bin = 4'b0011; #10;
        bin = 4'b0100; #10;
        bin = 4'b1111; #10;
        $finish;
      end
    endmodule`
  }
};

// Run Tests
console.log("=== STARTING LOCAL HDL SIMULATOR UNIT TESTS ===\n");
let failedTests = 0;

Object.keys(PRESETS).forEach(key => {
  const test = PRESETS[key];
  console.log(`[TEST] Running Preset: ${test.name}...`);
  
  const simulator = new VerilogSimulator();
  simulator.maxTime = 500;
  
  try {
    simulator.compile(test.design, test.testbench);
    simulator.run();
    
    console.log(`[PASS] ${test.name} compiled & simulated successfully.`);
    console.log(`       Simulation finished at ${simulator.time}ns.`);
    console.log(`       Logs generated: ${simulator.logs.length} lines.`);
    console.log(`       Signals recorded: ${Object.keys(simulator.waveformLogs).length} signals.\n`);
  } catch (err) {
    console.error(`[FAIL] ${test.name} compilation or execution failed!`);
    console.error(`       Error: ${err.message}`);
    if (simulator.logs.length > 0) {
      console.error(`       Console traces leading to crash:`);
      simulator.logs.forEach(l => console.error(`         ${l}`));
    }
    console.error('');
    failedTests++;
  }
});

console.log("=== UNIT TEST SUMMARY ===");
if (failedTests === 0) {
  console.log("All preset tests passed successfully! 🎉\n");
  process.exit(0);
} else {
  console.error(`${failedTests} test(s) failed. Please review errors.\n`);
  process.exit(1);
}
