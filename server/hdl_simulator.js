/**
 * server/hdl_simulator.js - A lightweight Node.js Verilog Compiler & Discrete Event Simulator
 * Supports 4-value logic (0, 1, x, z), structural gates, assign statements, initial blocks,
 * sequential/combinational always @(...) blocks, non-blocking/blocking assignments, and basic system calls.
 */

// 4-value logic helper functions
const LOGIC_4VAL = {
  // Parse Verilog literal numbers (e.g. 4'b1010, 8'hA5, 1'b1, 10, etc.)
  parseNumber(str) {
    str = str.trim().replace(/_/g, ''); // strip underscores
    const match = str.match(/^(\d+)?'([bhodBHD])([0-9a-fA-FzxZX]+)$/);
    if (match) {
      const width = match[1] ? parseInt(match[1], 10) : null;
      const radix = match[2].toLowerCase();
      const valStr = match[3].toLowerCase();
      
      let bits = '';
      if (radix === 'b') {
        bits = valStr;
      } else if (radix === 'h') {
        for (let char of valStr) {
          if (char === 'x') bits += 'xxxx';
          else if (char === 'z') bits += 'zzzz';
          else {
            const num = parseInt(char, 16);
            bits += num.toString(2).padStart(4, '0');
          }
        }
      } else if (radix === 'o') {
        for (let char of valStr) {
          if (char === 'x') bits += 'xxx';
          else if (char === 'z') bits += 'zzz';
          else {
            const num = parseInt(char, 8);
            bits += num.toString(2).padStart(3, '0');
          }
        }
      } else if (radix === 'd') {
        if (valStr.includes('x') || valStr.includes('z')) {
          bits = 'x';
        } else {
          const num = parseInt(valStr, 10);
          bits = num.toString(2);
        }
      }
      
      if (width) {
        if (bits.length < width) {
          const padChar = (bits[0] === 'x' || bits[0] === 'z') ? bits[0] : '0';
          bits = bits.padStart(width, padChar);
        } else if (bits.length > width) {
          bits = bits.slice(bits.length - width);
        }
      }
      return bits;
    }
    
    if (/^\d+$/.test(str)) {
      const val = parseInt(str, 10);
      return val.toString(2);
    }
    
    return 'x';
  },

  formatValue(bits, format = 'b') {
    if (bits.includes('x') || bits.includes('z')) {
      if (bits.includes('x') && !bits.includes('z')) return 'x';
      if (bits.includes('z') && !bits.includes('x')) return 'z';
      return 'x';
    }
    
    const val = parseInt(bits, 2);
    if (format === 'd') return val.toString(10);
    if (format === 'h') return val.toString(16).toUpperCase();
    if (format === 'o') return val.toString(8);
    return bits;
  },

  not(a) {
    let res = '';
    for (let char of a) {
      if (char === '0') res += '1';
      else if (char === '1') res += '0';
      else res += 'x';
    }
    return res;
  },

  and(a, b) {
    const len = Math.max(a.length, b.length);
    const padA = a.padStart(len, '0');
    const padB = b.padStart(len, '0');
    let res = '';
    for (let i = 0; i < len; i++) {
      const ca = padA[i], cb = padB[i];
      if (ca === '0' || cb === '0') res += '0';
      else if (ca === '1' && cb === '1') res += '1';
      else res += 'x';
    }
    return res;
  },

  or(a, b) {
    const len = Math.max(a.length, b.length);
    const padA = a.padStart(len, '0');
    const padB = b.padStart(len, '0');
    let res = '';
    for (let i = 0; i < len; i++) {
      const ca = padA[i], cb = padB[i];
      if (ca === '1' || cb === '1') res += '1';
      else if (ca === '0' && cb === '0') res += '0';
      else res += 'x';
    }
    return res;
  },

  xor(a, b) {
    const len = Math.max(a.length, b.length);
    const padA = a.padStart(len, '0');
    const padB = b.padStart(len, '0');
    let res = '';
    for (let i = 0; i < len; i++) {
      const ca = padA[i], cb = padB[i];
      if (ca === 'x' || ca === 'z' || cb === 'x' || cb === 'z') res += 'x';
      else if (ca === cb) res += '0';
      else res += '1';
    }
    return res;
  },

  add(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) {
      return 'x'.repeat(Math.max(a.length, b.length));
    }
    const valA = parseInt(a, 2);
    const valB = parseInt(b, 2);
    const sum = valA + valB;
    const len = Math.max(a.length, b.length);
    return sum.toString(2).padStart(len, '0');
  },

  sub(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) {
      return 'x'.repeat(Math.max(a.length, b.length));
    }
    const valA = parseInt(a, 2);
    const valB = parseInt(b, 2);
    const diff = (valA - valB + (1 << Math.max(a.length, b.length))) % (1 << Math.max(a.length, b.length));
    const len = Math.max(a.length, b.length);
    return diff.toString(2).padStart(len, '0');
  },

  isTrue(val) {
    if (val.includes('x') || val.includes('z')) {
      if (val.replace(/[xz]/g, '').includes('1')) return '1';
      return 'x';
    }
    return val.includes('1') ? '1' : '0';
  },

  logicalAnd(a, b) {
    const ta = this.isTrue(a);
    const tb = this.isTrue(b);
    if (ta === '0' || tb === '0') return '0';
    if (ta === '1' && tb === '1') return '1';
    return 'x';
  },

  logicalOr(a, b) {
    const ta = this.isTrue(a);
    const tb = this.isTrue(b);
    if (ta === '1' || tb === '1') return '1';
    if (ta === '0' && tb === '0') return '0';
    return 'x';
  },

  logicalNot(a) {
    const ta = this.isTrue(a);
    if (ta === '0') return '1';
    if (ta === '1') return '0';
    return 'x';
  },

  eq(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) return 'x';
    return parseInt(a, 2) === parseInt(b, 2) ? '1' : '0';
  },

  neq(a, b) {
    const eqVal = this.eq(a, b);
    if (eqVal === 'x') return 'x';
    return eqVal === '1' ? '0' : '1';
  },

  lt(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) return 'x';
    return parseInt(a, 2) < parseInt(b, 2) ? '1' : '0';
  },

  gt(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) return 'x';
    return parseInt(a, 2) > parseInt(b, 2) ? '1' : '0';
  },

  lte(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) return 'x';
    return parseInt(a, 2) <= parseInt(b, 2) ? '1' : '0';
  },

  gte(a, b) {
    if (a.includes('x') || a.includes('z') || b.includes('x') || b.includes('z')) return 'x';
    return parseInt(a, 2) >= parseInt(b, 2) ? '1' : '0';
  }
};

// --- Lexer / Tokenizer ---
class VerilogLexer {
  constructor(source, filename = 'code.v') {
    this.source = source;
    this.filename = filename;
    this.cursor = 0;
    this.line = 1;
    this.col = 1;
  }

  tokenize() {
    const tokens = [];
    const keywords = new Set([
      'module', 'endmodule', 'input', 'output', 'inout', 'reg', 'wire', 'integer',
      'initial', 'always', 'posedge', 'negedge', 'or', 'begin', 'end', 'if', 'else',
      'case', 'endcase', 'default', 'assign', 'parameter', 'string'
    ]);

    const systemTasks = new Set([
      '$display', '$monitor', '$finish', '$time'
    ]);

    while (this.cursor < this.source.length) {
      let char = this.source[this.cursor];

      if (/\s/.test(char)) {
        if (char === '\n') {
          this.line++;
          this.col = 1;
        } else {
          this.col++;
        }
        this.cursor++;
        continue;
      }

      if (char === '/' && this.source[this.cursor + 1] === '/') {
        while (this.cursor < this.source.length && this.source[this.cursor] !== '\n') {
          this.cursor++;
        }
        continue;
      }
      if (char === '/' && this.source[this.cursor + 1] === '*') {
        this.cursor += 2;
        this.col += 2;
        while (this.cursor < this.source.length) {
          if (this.source[this.cursor] === '*' && this.source[this.cursor + 1] === '/') {
            this.cursor += 2;
            this.col += 2;
            break;
          }
          if (this.source[this.cursor] === '\n') {
            this.line++;
            this.col = 1;
          } else {
            this.col++;
          }
          this.cursor++;
        }
        continue;
      }

      if (char === '$') {
        let text = '$';
        const startLine = this.line;
        const startCol = this.col;
        this.cursor++;
        this.col++;
        while (this.cursor < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.cursor])) {
          text += this.source[this.cursor];
          this.cursor++;
          this.col++;
        }
        if (systemTasks.has(text)) {
          tokens.push({ type: 'SYSTEM_TASK', value: text, line: startLine, col: startCol });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: text, line: startLine, col: startCol });
        }
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        let text = '';
        const startLine = this.line;
        const startCol = this.col;
        while (this.cursor < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.cursor])) {
          text += this.source[this.cursor];
          this.cursor++;
          this.col++;
        }
        if (keywords.has(text)) {
          tokens.push({ type: 'KEYWORD', value: text, line: startLine, col: startCol });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: text, line: startLine, col: startCol });
        }
        continue;
      }

      if (char === '"') {
        let text = '';
        const startLine = this.line;
        const startCol = this.col;
        this.cursor++;
        this.col++;
        while (this.cursor < this.source.length && this.source[this.cursor] !== '"') {
          if (this.source[this.cursor] === '\\') {
            text += this.source[this.cursor] + this.source[this.cursor + 1];
            this.cursor += 2;
            this.col += 2;
          } else {
            text += this.source[this.cursor];
            this.cursor++;
            this.col++;
          }
        }
        this.cursor++;
        this.col++;
        tokens.push({ type: 'STRING', value: text, line: startLine, col: startCol });
        continue;
      }

      if (/[0-9]/.test(char) || (char === '\'' && /[bhodBHD]/.test(this.source[this.cursor + 1]))) {
        let text = '';
        const startLine = this.line;
        const startCol = this.col;
        
        while (this.cursor < this.source.length && /[0-9]/.test(this.source[this.cursor])) {
          text += this.source[this.cursor];
          this.cursor++;
          this.col++;
        }
        
        if (this.source[this.cursor] === '\'') {
          text += '\'';
          this.cursor++;
          this.col++;
          if (/[bhodBHD]/.test(this.source[this.cursor])) {
            text += this.source[this.cursor];
            this.cursor++;
            this.col++;
            while (this.cursor < this.source.length && /[0-9a-fA-FzxZX_]/.test(this.source[this.cursor])) {
              text += this.source[this.cursor];
              this.cursor++;
              this.col++;
            }
          }
        }
        tokens.push({ type: 'NUMBER', value: text, line: startLine, col: startCol });
        continue;
      }

      if (char === '#') {
        let text = '#';
        const startLine = this.line;
        const startCol = this.col;
        this.cursor++;
        this.col++;
        while (this.cursor < this.source.length && /[0-9]/.test(this.source[this.cursor])) {
          text += this.source[this.cursor];
          this.cursor++;
          this.col++;
        }
        tokens.push({ type: 'DELAY', value: text, line: startLine, col: startCol });
        continue;
      }

      const doubleOps = ['<=', '==', '!=', '&&', '||', '<<', '>>', '>=', '+=', '-='];
      let handled = false;
      for (let op of doubleOps) {
        if (this.source.startsWith(op, this.cursor)) {
          tokens.push({ type: 'OPERATOR', value: op, line: this.line, col: this.col });
          this.cursor += op.length;
          this.col += op.length;
          handled = true;
          break;
        }
      }
      if (handled) continue;

      const operators = new Set(['+', '-', '*', '/', '%', '&', '|', '^', '~', '=', '<', '>', '!']);
      const punctuations = new Set([';', ',', '(', ')', '[', ']', '{', '}', '@', '.', ':', '?']);
      
      if (operators.has(char)) {
        tokens.push({ type: 'OPERATOR', value: char, line: this.line, col: this.col });
        this.cursor++;
        this.col++;
        continue;
      }
      if (punctuations.has(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char, line: this.line, col: this.col });
        this.cursor++;
        this.col++;
        continue;
      }

      throw new Error(`[${this.filename}:${this.line}:${this.col}] Lexical error: Unexpected character '${char}'`);
    }

    return tokens;
  }
}

// --- Verilog Parser ---
class VerilogParser {
  constructor(tokens, filename = 'code.v') {
    this.tokens = tokens;
    this.filename = filename;
    this.ptr = 0;
  }

  peek() {
    return this.tokens[this.ptr] || null;
  }

  next() {
    return this.tokens[this.ptr++] || null;
  }

  expect(type, val = null) {
    const tok = this.peek();
    if (!tok) {
      throw new Error(`[${this.filename}] Parser error: Unexpected End of File`);
    }
    if (tok.type !== type || (val !== null && tok.value !== val)) {
      throw new Error(`[${this.filename}:${tok.line}:${tok.col}] Parser error: Expected ${type} '${val || ''}', got ${tok.type} '${tok.value}'`);
    }
    return this.next();
  }

  parse() {
    const modules = [];
    while (this.peek()) {
      const tok = this.peek();
      if (tok.type === 'KEYWORD' && tok.value === 'module') {
        modules.push(this.parseModule());
      } else {
        this.next();
      }
    }
    return modules;
  }

  parseModule() {
    const moduleStart = this.expect('KEYWORD', 'module');
    const nameTok = this.expect('IDENTIFIER');
    const moduleName = nameTok.value;

    const ports = [];
    if (this.peek() && this.peek().value === '(') {
      this.expect('PUNCTUATION', '(');
      while (this.peek() && this.peek().value !== ')') {
        let dir = null;
        let isReg = false;
        let width = [0, 0];
        
        if (this.peek().type === 'KEYWORD' && (this.peek().value === 'input' || this.peek().value === 'output' || this.peek().value === 'inout')) {
          dir = this.next().value;
          if (this.peek() && this.peek().value === 'reg') {
            this.next();
            isReg = true;
          }
          if (this.peek() && this.peek().value === '[') {
            width = this.parseRange();
          }
        }
        
        const portName = this.expect('IDENTIFIER').value;
        ports.push({ name: portName, dir, isReg, width });
        
        if (this.peek() && this.peek().value === ',') {
          this.next();
        }
      }
      this.expect('PUNCTUATION', ')');
    }
    this.expect('PUNCTUATION', ';');

    const declarations = [];
    const assignments = [];
    const initialBlocks = [];
    const alwaysBlocks = [];
    const instantiations = [];

    while (this.peek() && !(this.peek().type === 'KEYWORD' && this.peek().value === 'endmodule')) {
      const tok = this.peek();
      if (tok.type === 'KEYWORD') {
        if (tok.value === 'input' || tok.value === 'output' || tok.value === 'inout' || tok.value === 'reg' || tok.value === 'wire' || tok.value === 'integer' || tok.value === 'parameter' || tok.value === 'string') {
          this.parseDeclarations(declarations);
        } else if (tok.value === 'assign') {
          assignments.push(this.parseContinuousAssignment());
        } else if (tok.value === 'initial') {
          this.next();
          initialBlocks.push(this.parseStatement());
        } else if (tok.value === 'always') {
          alwaysBlocks.push(this.parseAlwaysBlock());
        } else {
          throw new Error(`[${this.filename}:${tok.line}:${tok.col}] Parser error: Unexpected keyword '${tok.value}' in module body`);
        }
      } else if (tok.type === 'IDENTIFIER') {
        instantiations.push(this.parseInstantiation());
      } else {
        throw new Error(`[${this.filename}:${tok.line}:${tok.col}] Parser error: Unexpected token '${tok.value}'`);
      }
    }

    this.expect('KEYWORD', 'endmodule');

    return {
      name: moduleName,
      ports,
      declarations,
      assignments,
      initialBlocks,
      alwaysBlocks,
      instantiations
    };
  }

  parseRange() {
    this.expect('PUNCTUATION', '[');
    const msbTok = this.expect('NUMBER');
    this.expect('PUNCTUATION', ':');
    const lsbTok = this.expect('NUMBER');
    this.expect('PUNCTUATION', ']');
    return [parseInt(msbTok.value, 10), parseInt(lsbTok.value, 10)];
  }

  parseDeclarations(declarations) {
    let dir = null;
    let type = 'wire';
    let width = [0, 0];

    const tok = this.peek();
    if (tok.value === 'input' || tok.value === 'output' || tok.value === 'inout') {
      dir = this.next().value;
    }

    const typeTok = this.peek();
    if (typeTok && (typeTok.value === 'reg' || typeTok.value === 'wire' || typeTok.value === 'integer' || typeTok.value === 'parameter' || typeTok.value === 'string')) {
      type = this.next().value;
    }

    if (this.peek() && this.peek().value === '[') {
      width = this.parseRange();
    }

    while (this.peek()) {
      const name = this.expect('IDENTIFIER').value;
      let initialVal = null;
      if (this.peek() && this.peek().value === '=') {
        this.next();
        initialVal = this.parseExpression();
      }

      declarations.push({ name, dir, type, width, initialVal });

      if (this.peek() && this.peek().value === ',') {
        this.next();
      } else {
        break;
      }
    }
    this.expect('PUNCTUATION', ';');
  }

  parseContinuousAssignment() {
    const startTok = this.expect('KEYWORD', 'assign');
    const target = this.parseLHS();
    this.expect('OPERATOR', '=');
    const expr = this.parseExpression();
    this.expect('PUNCTUATION', ';');
    return { target, expr, line: startTok.line };
  }

  parseAlwaysBlock() {
    const startTok = this.expect('KEYWORD', 'always');
    let trigger = null;
    
    if (this.peek() && this.peek().value === '@') {
      this.expect('PUNCTUATION', '@');
      this.expect('PUNCTUATION', '(');
      
      trigger = [];
      if (this.peek() && this.peek().value === '*') {
        this.next();
        trigger = '*';
      } else {
        while (this.peek() && this.peek().value !== ')') {
          let edge = 'level';
          if (this.peek().type === 'KEYWORD' && (this.peek().value === 'posedge' || this.peek().value === 'negedge')) {
            edge = this.next().value;
          }
          const sig = this.expect('IDENTIFIER').value;
          trigger.push({ edge, sig });
          
          if (this.peek() && (this.peek().value === 'or' || this.peek().value === ',')) {
            this.next();
          }
        }
      }
      this.expect('PUNCTUATION', ')');
    }
    
    const stmt = this.parseStatement();
    return { trigger, stmt, line: startTok.line };
  }

  parseInstantiation() {
    const modType = this.expect('IDENTIFIER').value;
    const instName = this.expect('IDENTIFIER').value;
    this.expect('PUNCTUATION', '(');
    
    const connections = [];
    while (this.peek() && this.peek().value !== ')') {
      if (this.peek().value === '.') {
        this.next();
        const portName = this.expect('IDENTIFIER').value;
        this.expect('PUNCTUATION', '(');
        const sigExpr = this.parseExpression();
        this.expect('PUNCTUATION', ')');
        connections.push({ port: portName, expr: sigExpr });
      } else {
        const sigExpr = this.parseExpression();
        connections.push({ port: null, expr: sigExpr });
      }
      
      if (this.peek() && this.peek().value === ',') {
        this.next();
      }
    }
    this.expect('PUNCTUATION', ')');
    this.expect('PUNCTUATION', ';');
    return { modType, instName, connections };
  }

  parseStatement() {
    const tok = this.peek();
    if (!tok) return null;

    if (tok.type === 'DELAY') {
      const delayVal = parseInt(this.next().value.substring(1), 10);
      if (this.peek() && this.peek().value === ';') {
        this.next(); // consume ';'
        return { type: 'DELAY', delay: delayVal, stmt: null };
      }
      const stmt = this.parseStatement();
      return { type: 'DELAY', delay: delayVal, stmt };
    }

    if (tok.type === 'KEYWORD') {
      if (tok.value === 'begin') {
        this.next();
        const stmts = [];
        while (this.peek() && this.peek().value !== 'end') {
          stmts.push(this.parseStatement());
        }
        this.expect('KEYWORD', 'end');
        return { type: 'BLOCK', stmts };
      }
      
      if (tok.value === 'if') {
        this.next();
        this.expect('PUNCTUATION', '(');
        const cond = this.parseExpression();
        this.expect('PUNCTUATION', ')');
        const thenBranch = this.parseStatement();
        let elseBranch = null;
        if (this.peek() && this.peek().value === 'else') {
          this.next();
          elseBranch = this.parseStatement();
        }
        return { type: 'IF', cond, thenBranch, elseBranch };
      }

      if (tok.value === 'case') {
        this.next();
        this.expect('PUNCTUATION', '(');
        const expr = this.parseExpression();
        this.expect('PUNCTUATION', ')');
        
        const items = [];
        while (this.peek() && this.peek().value !== 'endcase') {
          const caseTok = this.peek();
          if (caseTok.type === 'KEYWORD' && caseTok.value === 'default') {
            this.next();
            this.expect('PUNCTUATION', ':');
            const stmt = this.parseStatement();
            items.push({ conditions: ['default'], stmt });
          } else {
            const conds = [];
            while (true) {
              conds.push(this.parseExpression());
              if (this.peek() && this.peek().value === ',') {
                this.next();
              } else {
                break;
              }
            }
            this.expect('PUNCTUATION', ':');
            const stmt = this.parseStatement();
            items.push({ conditions: conds, stmt });
          }
        }
        this.expect('KEYWORD', 'endcase');
        return { type: 'CASE', expr, items };
      }
    }

    if (tok.type === 'SYSTEM_TASK') {
      const task = this.next().value;
      let args = [];
      if (this.peek() && this.peek().value === '(') {
        this.expect('PUNCTUATION', '(');
        while (this.peek() && this.peek().value !== ')') {
          if (this.peek().type === 'STRING') {
            args.push({ type: 'STRING_LITERAL', value: this.next().value });
          } else {
            args.push(this.parseExpression());
          }
          if (this.peek() && this.peek().value === ',') {
            this.next();
          }
        }
        this.expect('PUNCTUATION', ')');
      }
      this.expect('PUNCTUATION', ';');
      return { type: 'SYSTEM_TASK', task, args, line: tok.line };
    }

    const lhs = this.parseLHS();
    const opTok = this.expect('OPERATOR');
    const isNonBlocking = opTok.value === '<=';
    const rhs = this.parseExpression();
    this.expect('PUNCTUATION', ';');
    return { type: 'ASSIGNMENT', lhs, rhs, isNonBlocking, line: opTok.line };
  }

  parseLHS() {
    const tok = this.peek();
    if (tok.value === '{') {
      this.next();
      const parts = [];
      while (this.peek() && this.peek().value !== '}') {
        parts.push(this.parseLHS());
        if (this.peek() && this.peek().value === ',') {
          this.next();
        }
      }
      this.expect('PUNCTUATION', '}');
      return { type: 'CONCAT', parts };
    }
    
    const name = this.expect('IDENTIFIER').value;
    if (this.peek() && this.peek().value === '[') {
      this.next();
      const msb = this.parseExpression();
      if (this.peek() && this.peek().value === ':') {
        this.next();
        const lsb = this.parseExpression();
        this.expect('PUNCTUATION', ']');
        return { type: 'SLICE', name, msb, lsb };
      }
      this.expect('PUNCTUATION', ']');
      return { type: 'INDEX', name, idx: msb };
    }
    
    return { type: 'IDENTIFIER', name };
  }

  parseExpression() {
    return this.parseExpressionBP(0);
  }

  parseExpressionBP(minBP) {
    let tok = this.peek();
    if (!tok) throw new Error(`[${this.filename}] Parser error: Empty expression`);

    let lhs = null;

    if (tok.type === 'OPERATOR' && (tok.value === '~' || tok.value === '!' || tok.value === '-' || tok.value === '+')) {
      const op = this.next().value;
      const rBP = this.prefixBP(op);
      const rhs = this.parseExpressionBP(rBP);
      lhs = { type: 'UNARY_OP', op, rhs };
    } else if (tok.value === '(') {
      this.next();
      lhs = this.parseExpression();
      this.expect('PUNCTUATION', ')');
    } else if (tok.value === '{') {
      this.next();
      const parts = [];
      while (this.peek() && this.peek().value !== '}') {
        parts.push(this.parseExpression());
        if (this.peek() && this.peek().value === ',') {
          this.next();
        }
      }
      this.expect('PUNCTUATION', '}');
      lhs = { type: 'CONCAT', parts };
    } else if (tok.type === 'NUMBER') {
      lhs = { type: 'NUMBER', value: this.next().value };
    } else if (tok.type === 'IDENTIFIER') {
      const name = this.next().value;
      if (this.peek() && this.peek().value === '[') {
        this.next();
        const msb = this.parseExpression();
        if (this.peek() && this.peek().value === ':') {
          this.next();
          const lsb = this.parseExpression();
          this.expect('PUNCTUATION', ']');
          lhs = { type: 'SLICE', name, msb, lsb };
        } else {
          this.expect('PUNCTUATION', ']');
          lhs = { type: 'INDEX', name, idx: msb };
        }
      } else {
        lhs = { type: 'IDENTIFIER', name };
      }
    } else if (tok.type === 'SYSTEM_TASK') {
      const name = this.next().value;
      lhs = { type: 'SYSTEM_TASK', name };
    } else if (tok.type === 'STRING') {
      const val = this.next().value;
      lhs = { type: 'STRING_LITERAL', value: val };
    } else {
      throw new Error(`[${this.filename}:${tok.line}:${tok.col}] Parser error: Unexpected expression token '${tok.value}'`);
    }

    while (true) {
      let opTok = this.peek();
      if (!opTok || opTok.type !== 'OPERATOR' && opTok.value !== '?') break;

      const op = opTok.value;
      const [lBP, rBP] = this.infixBP(op);
      if (lBP < minBP) break;

      this.next();

      if (op === '?') {
        const trueExpr = this.parseExpression();
        this.expect('PUNCTUATION', ':');
        const falseExpr = this.parseExpressionBP(rBP);
        lhs = { type: 'TERNARY', cond: lhs, trueExpr, falseExpr };
      } else {
        const rhs = this.parseExpressionBP(rBP);
        lhs = { type: 'BINARY_OP', op, lhs, rhs };
      }
    }

    return lhs;
  }

  prefixBP(op) {
    return 13;
  }

  infixBP(op) {
    switch (op) {
      case '?': return [2, 1];
      case '||': return [3, 4];
      case '&&': return [5, 6];
      case '|': return [7, 8];
      case '^': return [9, 10];
      case '&': return [11, 12];
      case '==':
      case '!=':
        return [13, 14];
      case '<':
      case '>':
      case '<=':
      case '>=':
        return [15, 16];
      case '<<':
      case '>>':
        return [17, 18];
      case '+':
      case '-':
        return [19, 20];
      case '*':
      case '/':
      case '%':
        return [21, 22];
      default:
        return [0, 0];
    }
  }
}

// --- Digital Logic Evaluator and Simulation Engine ---
class VerilogSimulator {
  constructor() {
    this.modules = {};
    this.instances = {};
    this.time = 0;
    this.eventQueue = [];
    this.monitorSignals = [];
    this.logs = [];
    this.waveformLogs = {};
    this.activeProcesses = [];
    this.finished = false;
    this.maxTime = 2000;
    this.deltaCycleLimit = 100;
  }

  log(msg) {
    this.logs.push(msg);
  }

  compile(designSource, tbSource) {
    this.modules = {};
    this.logs = [];
    this.waveformLogs = {};
    this.monitorSignals = [];
    this.time = 0;
    this.eventQueue = [];
    this.finished = false;

    try {
      const designLex = new VerilogLexer(designSource, 'design.sv');
      const designTok = designLex.tokenize();
      const designParser = new VerilogParser(designTok, 'design.sv');
      const designMods = designParser.parse();
      for (let mod of designMods) {
        this.modules[mod.name] = mod;
      }
    } catch (e) {
      this.log(`%E% [Compilation Error in design.sv] ${e.message}`);
      throw e;
    }

    let tbMods = [];
    try {
      const tbLex = new VerilogLexer(tbSource, 'testbench.sv');
      const tbTok = tbLex.tokenize();
      const tbParser = new VerilogParser(tbTok, 'testbench.sv');
      tbMods = tbParser.parse();
      for (let mod of tbMods) {
        this.modules[mod.name] = mod;
      }
    } catch (e) {
      this.log(`%E% [Compilation Error in testbench.sv] ${e.message}`);
      throw e;
    }

    let topModName = null;
    for (let mod of tbMods) {
      if (mod.ports.length === 0) {
        topModName = mod.name;
        break;
      }
    }

    if (!topModName && tbMods.length > 0) {
      topModName = tbMods[0].name;
    }

    if (!topModName) {
      throw new Error("No top-level module found. Please define a module with no ports to act as the testbench.");
    }

    this.log(`Compiling top module: ${topModName}...`);
    this.instances = this.elaborateModule(topModName, 'tb', null);
    this.establishPortConnections(this.instances);
    this.log(`Elaboration completed successfully.`);
  }

  elaborateModule(modName, instName, parentInstance = null) {
    const mod = this.modules[modName];
    if (!mod) {
      throw new Error(`Module '${modName}' is not defined.`);
    }

    const instance = {
      name: instName,
      type: modName,
      parent: parentInstance,
      signals: {},
      subInstances: {},
      assignments: [...mod.assignments],
      initialBlocks: [...mod.initialBlocks],
      alwaysBlocks: [...mod.alwaysBlocks],
      def: mod
    };

    for (let port of mod.ports) {
      const width = port.width;
      const len = Math.abs(width[0] - width[1]) + 1;
      instance.signals[port.name] = {
        type: port.isReg ? 'reg' : 'wire',
        dir: port.dir,
        width: width,
        value: 'x'.repeat(len)
      };
    }

    for (let decl of mod.declarations) {
      const width = decl.width;
      const len = Math.abs(width[0] - width[1]) + 1;
      let initVal = decl.type === 'string' ? '' : 'x'.repeat(len);
      if (decl.initialVal) {
        initVal = this.evaluateExpr(decl.initialVal, instance);
      }
      instance.signals[decl.name] = {
        type: decl.type,
        dir: null,
        width: width,
        value: initVal
      };
    }

    for (let inst of mod.instantiations) {
      const childName = inst.instName;
      const childModType = inst.modType;
      const childInst = this.elaborateModule(childModType, childName, instance);
      instance.subInstances[childName] = childInst;
      childInst.connectionsMeta = inst.connections;
    }

    return instance;
  }

  establishPortConnections(instance) {
    for (let childKey in instance.subInstances) {
      const child = instance.subInstances[childKey];
      this.establishPortConnections(child);
      
      const meta = child.connectionsMeta;
      const childPorts = child.def.ports;
      
      for (let i = 0; i < meta.length; i++) {
        const conn = meta[i];
        let portName = conn.port;
        if (!portName) {
          if (i < childPorts.length) {
            portName = childPorts[i].name;
          } else {
            continue;
          }
        }

        const portSig = child.signals[portName];
        if (!portSig) continue;

        if (portSig.dir === 'input') {
          child.inputsToDrive = child.inputsToDrive || [];
          child.inputsToDrive.push({
            portName: portName,
            parentExpr: conn.expr
          });
        } else if (portSig.dir === 'output') {
          instance.outputsToDrive = instance.outputsToDrive || [];
          instance.outputsToDrive.push({
            parentLHS: conn.expr,
            childPortName: portName,
            childInstance: child
          });
        }
      }
    }
  }

  run() {
    this.log(`Simulation starting...`);
    this.time = 0;
    this.waveformLogs = {};
    
    this.initWaveformTracking(this.instances, 'tb');
    this.initSimulationProcesses();

    let steps = 0;
    while (this.eventQueue.length > 0 && this.time < this.maxTime && !this.finished) {
      steps++;
      
      this.eventQueue.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        const prio = { 'update': 1, 'process': 2, 'monitor': 3, 'finish': 4 };
        return (prio[a.type] || 5) - (prio[b.type] || 5);
      });

      const event = this.eventQueue.shift();
      
      if (event.time > this.time) {
        this.recordAllWaveforms();
        this.time = event.time;
      }

      this.executeEvent(event);
      this.stabilizeCombinational(0);
      
      if (steps > 5000) {
        this.log(`%W% Warning: Exceeded 5000 simulation steps. Stopping potential infinite loop.`);
        break;
      }
    }

    this.recordAllWaveforms();
    this.log(`Simulation finished at time ${this.time} ns.`);
  }

  scheduleEvent(event) {
    this.eventQueue.push(event);
  }

  initWaveformTracking(instance, path) {
    for (let sigName in instance.signals) {
      const fullPath = `${path}.${sigName}`;
      const sig = instance.signals[sigName];
      this.waveformLogs[fullPath] = {
        name: sigName,
        path: fullPath,
        width: Math.abs(sig.width[0] - sig.width[1]) + 1,
        values: []
      };
    }
    for (let childKey in instance.subInstances) {
      this.initWaveformTracking(instance.subInstances[childKey], `${path}.${childKey}`);
    }
  }

  recordAllWaveforms() {
    const recordNode = (instance, path) => {
      for (let sigName in instance.signals) {
        const fullPath = `${path}.${sigName}`;
        const sig = instance.signals[sigName];
        const log = this.waveformLogs[fullPath];
        const lastVal = log.values.length > 0 ? log.values[log.values.length - 1].val : null;
        if (lastVal !== sig.value) {
          log.values.push({ time: this.time, val: sig.value });
        }
      }
      for (let childKey in instance.subInstances) {
        recordNode(instance.subInstances[childKey], `${path}.${childKey}`);
      }
    };
    recordNode(this.instances, 'tb');
  }

  initSimulationProcesses() {
    const startInitialBlocks = (inst) => {
      for (let block of inst.initialBlocks) {
        const proc = {
          inst: inst,
          statement: block,
          pc: 0,
          waitingDelay: 0,
          waitingTrigger: null
        };
        this.executeProcess(proc);
      }
      for (let childKey in inst.subInstances) {
        startInitialBlocks(inst.subInstances[childKey]);
      }
    };
    startInitialBlocks(this.instances);

    const startAlwaysBlocks = (inst) => {
      for (let block of inst.alwaysBlocks) {
        const proc = {
          inst: inst,
          statement: block.stmt,
          trigger: block.trigger,
          pc: 0,
          waitingDelay: 0,
          waitingTrigger: block.trigger
        };
        
        if (!block.trigger) {
          this.executeProcess(proc);
        } else {
          this.registerProcessTrigger(proc);
        }
      }
      for (let childKey in inst.subInstances) {
        startAlwaysBlocks(inst.subInstances[childKey]);
      }
    };
    startAlwaysBlocks(this.instances);

    this.stabilizeCombinational(0);
  }

  stabilizeCombinational(deltaCount) {
    if (deltaCount > this.deltaCycleLimit) {
      throw new Error(`Zero-delay combinational loop detected. Please check assignments for feedback cycles.`);
    }

    let changed = false;

    const evalNode = (inst) => {
      if (inst.inputsToDrive) {
        for (let mapping of inst.inputsToDrive) {
          const val = this.evaluateExpr(mapping.parentExpr, inst.parent);
          const port = inst.signals[mapping.portName];
          if (port.value !== val) {
            port.value = val;
            changed = true;
          }
        }
      }

      for (let assign of inst.assignments) {
        const val = this.evaluateExpr(assign.expr, inst);
        const changedLocal = this.assignLHS(assign.target, val, inst, false);
        if (changedLocal) changed = true;
      }

      if (inst.outputsToDrive) {
        for (let mapping of inst.outputsToDrive) {
          const childVal = mapping.childInstance.signals[mapping.childPortName].value;
          const changedLocal = this.assignLHS(mapping.parentLHS, childVal, inst, false);
          if (changedLocal) changed = true;
        }
      }

      for (let childKey in inst.subInstances) {
        evalNode(inst.subInstances[childKey]);
      }
    };

    evalNode(this.instances);

    if (changed) {
      this.stabilizeCombinational(deltaCount + 1);
    }
  }

  executeProcess(proc) {
    if (this.finished) return;
    const stmt = proc.statement;
    if (!stmt) return;

    if (stmt.type === 'BLOCK') {
      this.executeBlockStatements(proc, stmt.stmts, 0);
    } else {
      this.executeSingleStatement(proc, stmt, () => {});
    }
  }

  executeBlockStatements(proc, stmts, idx) {
    if (idx >= stmts.length) {
      if (proc.trigger === null) {
        this.scheduleEvent({
          time: this.time,
          type: 'process',
          proc: { ...proc, pc: 0 }
        });
      }
      return;
    }

    this.executeSingleStatement(proc, stmts[idx], () => {
      this.executeBlockStatements(proc, stmts, idx + 1);
    });
  }

  executeSingleStatement(proc, stmt, onDone) {
    if (this.finished) return;
    if (!stmt) {
      onDone();
      return;
    }

    if (stmt.type === 'DELAY') {
      const delayTime = this.time + stmt.delay;
      const nextProc = {
        ...proc,
        statement: stmt.stmt,
        pc: 0
      };

      this.scheduleEvent({
        time: delayTime,
        type: 'process',
        proc: nextProc,
        onDone: onDone
      });
    } else if (stmt.type === 'ASSIGNMENT') {
      const val = this.evaluateExpr(stmt.rhs, proc.inst);
      
      if (stmt.isNonBlocking) {
        this.scheduleEvent({
          time: this.time,
          type: 'update',
          inst: proc.inst,
          lhs: stmt.lhs,
          val: val
        });
        onDone();
      } else {
        this.assignLHS(stmt.lhs, val, proc.inst, false);
        onDone();
      }
    } else if (stmt.type === 'IF') {
      const condVal = this.evaluateExpr(stmt.cond, proc.inst);
      if (LOGIC_4VAL.isTrue(condVal) === '1') {
        this.executeSingleStatement(proc, stmt.thenBranch, onDone);
      } else if (stmt.elseBranch) {
        this.executeSingleStatement(proc, stmt.elseBranch, onDone);
      } else {
        onDone();
      }
    } else if (stmt.type === 'CASE') {
      const exprVal = this.evaluateExpr(stmt.expr, proc.inst);
      let matchedBranch = null;
      let defaultBranch = null;

      for (let item of stmt.items) {
        if (item.conditions[0] === 'default') {
          defaultBranch = item.stmt;
          continue;
        }
        for (let cond of item.conditions) {
          const cVal = this.evaluateExpr(cond, proc.inst);
          if (LOGIC_4VAL.eq(exprVal, cVal) === '1') {
            matchedBranch = item.stmt;
            break;
          }
        }
        if (matchedBranch) break;
      }

      const branch = matchedBranch || defaultBranch;
      if (branch) {
        this.executeSingleStatement(proc, branch, onDone);
      } else {
        onDone();
      }
    } else if (stmt.type === 'SYSTEM_TASK') {
      this.executeSystemTask(stmt, proc.inst);
      onDone();
    } else if (stmt.type === 'BLOCK') {
      this.executeBlockStatements(proc, stmt.stmts, 0);
      onDone();
    } else {
      onDone();
    }
  }

  executeEvent(event) {
    if (event.type === 'process') {
      this.executeProcess(event.proc);
      if (event.onDone) event.onDone();
    } else if (event.type === 'update') {
      const changed = this.assignLHS(event.lhs, event.val, event.inst, true);
      if (changed) {
        this.triggerEdgeSensitivities(event.inst, event.lhs, event.val);
      }
    }
  }

  registerProcessTrigger(proc) {
    this.activeProcesses.push(proc);
  }

  triggerEdgeSensitivities(inst, lhs, newVal) {
    const sigName = lhs.name;
    const oldSig = inst.signals[sigName];
    if (!oldSig) return;
    const oldVal = oldSig.lastTriggerValue || 'x'.repeat(newVal.length);
    oldSig.lastTriggerValue = newVal;

    if (oldVal === newVal) return;

    for (let proc of this.activeProcesses) {
      if (proc.inst !== inst) continue;
      
      let triggered = false;
      
      if (proc.trigger === '*') {
        triggered = true;
      } else {
        for (let cond of proc.trigger) {
          if (cond.sig === sigName) {
            const hasPosedge = (oldVal[0] === '0' && newVal[0] === '1');
            const hasNegedge = (oldVal[0] === '1' && newVal[0] === '0');
            
            if (cond.edge === 'posedge' && hasPosedge) triggered = true;
            else if (cond.edge === 'negedge' && hasNegedge) triggered = true;
            else if (cond.edge === 'level') triggered = true;
          }
        }
      }

      if (triggered) {
        this.scheduleEvent({
          time: this.time,
          type: 'process',
          proc: { ...proc, pc: 0 }
        });
      }
    }
  }

  assignLHS(lhs, val, inst, isNonBlockingRegion = false) {
    if (lhs.type === 'IDENTIFIER') {
      const sig = inst.signals[lhs.name];
      if (!sig) throw new Error(`Undeclared identifier '${lhs.name}'`);
      
      if (sig.type === 'string') {
        if (sig.value !== val) {
          sig.value = val;
          if (!isNonBlockingRegion) {
            this.triggerEdgeSensitivities(inst, lhs, val);
          }
          return true;
        }
        return false;
      }
      
      const width = Math.abs(sig.width[0] - sig.width[1]) + 1;
      let finalVal = val.padStart(width, val[0] === 'x' || val[0] === 'z' ? val[0] : '0');
      if (finalVal.length > width) {
        finalVal = finalVal.slice(finalVal.length - width);
      }

      if (sig.value !== finalVal) {
        sig.value = finalVal;
        if (!isNonBlockingRegion) {
          this.triggerEdgeSensitivities(inst, lhs, finalVal);
        }
        return true;
      }
    } else if (lhs.type === 'INDEX') {
      const sig = inst.signals[lhs.name];
      if (!sig) throw new Error(`Undeclared identifier '${lhs.name}'`);
      const idx = parseInt(this.evaluateExpr(lhs.idx, inst), 2);
      
      const msb = sig.width[0];
      const lsb = sig.width[1];
      const bitIndex = msb >= lsb ? (msb - idx) : (idx - msb);

      if (bitIndex >= 0 && bitIndex < sig.value.length) {
        const bitArr = sig.value.split('');
        bitArr[bitIndex] = val[val.length - 1] || 'x';
        const finalVal = bitArr.join('');
        if (sig.value !== finalVal) {
          sig.value = finalVal;
          if (!isNonBlockingRegion) {
            this.triggerEdgeSensitivities(inst, { type: 'IDENTIFIER', name: lhs.name }, finalVal);
          }
          return true;
        }
      }
    } else if (lhs.type === 'SLICE') {
      const sig = inst.signals[lhs.name];
      if (!sig) throw new Error(`Undeclared identifier '${lhs.name}'`);
      const msbExpr = parseInt(this.evaluateExpr(lhs.msb, inst), 2);
      const lsbExpr = parseInt(this.evaluateExpr(lhs.lsb, inst), 2);
      
      const msb = sig.width[0];
      const lsb = sig.width[1];
      
      const startIdx = msb >= lsb ? (msb - msbExpr) : (msbExpr - msb);
      const endIdx = msb >= lsb ? (msb - lsbExpr) : (lsbExpr - msb);
      
      const sliceLen = Math.abs(msbExpr - lsbExpr) + 1;
      let paddedVal = val.padStart(sliceLen, '0');
      if (paddedVal.length > sliceLen) {
        paddedVal = paddedVal.slice(paddedVal.length - sliceLen);
      }

      const bitArr = sig.value.split('');
      for (let i = 0; i < sliceLen; i++) {
        const targetIdx = startIdx + i;
        if (targetIdx >= 0 && targetIdx < bitArr.length) {
          bitArr[targetIdx] = paddedVal[i];
        }
      }
      const finalVal = bitArr.join('');
      if (sig.value !== finalVal) {
        sig.value = finalVal;
        if (!isNonBlockingRegion) {
          this.triggerEdgeSensitivities(inst, { type: 'IDENTIFIER', name: lhs.name }, finalVal);
        }
        return true;
      }
    } else if (lhs.type === 'CONCAT') {
      let currentBitPos = 0;
      let changedAny = false;
      for (let i = lhs.parts.length - 1; i >= 0; i--) {
        const part = lhs.parts[i];
        let partWidth = 1;
        if (part.type === 'IDENTIFIER') {
          const sig = inst.signals[part.name];
          partWidth = Math.abs(sig.width[0] - sig.width[1]) + 1;
        } else if (part.type === 'SLICE') {
          const msb = parseInt(this.evaluateExpr(part.msb, inst), 2);
          const lsb = parseInt(this.evaluateExpr(part.lsb, inst), 2);
          partWidth = Math.abs(msb - lsb) + 1;
        }

        const extractBits = val.substring(
          Math.max(0, val.length - currentBitPos - partWidth),
          val.length - currentBitPos
        ) || 'x';

        const changedLocal = this.assignLHS(part, extractBits, inst, isNonBlockingRegion);
        if (changedLocal) changedAny = true;
        currentBitPos += partWidth;
      }
      return changedAny;
    }
    return false;
  }

  executeSystemTask(stmt, inst) {
    if (stmt.task === '$finish') {
      this.finished = true;
      this.log(`$finish called at simulation time ${this.time} ns.`);
    } else if (stmt.task === '$display') {
      const formatStr = stmt.args[0].value;
      const formatted = this.formatDisplayString(formatStr, stmt.args.slice(1), inst);
      this.log(formatted);
    } else if (stmt.task === '$monitor') {
      const formatStr = stmt.args[0].value;
      this.monitorSignals = {
        format: formatStr,
        args: stmt.args.slice(1),
        inst: inst
      };
      const formatted = this.formatDisplayString(formatStr, stmt.args.slice(1), inst);
      this.log(formatted);
      this.lastMonitorLog = formatted;
    }
  }

  formatDisplayString(formatStr, args, inst) {
    let argIdx = 0;
    let res = '';
    for (let i = 0; i < formatStr.length; i++) {
      if (formatStr[i] === '%' && i + 1 < formatStr.length) {
        const specifier = formatStr[i + 1].toLowerCase();
        i++;
        
        if (specifier === 't') {
          res += this.time.toString();
        } else {
          if (argIdx < args.length) {
            const exprVal = this.evaluateExpr(args[argIdx++], inst);
            if (specifier === 'b') res += exprVal;
            else if (specifier === 's') res += exprVal;
            else if (specifier === 'd') res += LOGIC_4VAL.formatValue(exprVal, 'd');
            else if (specifier === 'h') res += LOGIC_4VAL.formatValue(exprVal, 'h');
            else if (specifier === 'o') res += LOGIC_4VAL.formatValue(exprVal, 'o');
            else res += exprVal;
          } else {
            res += '%?';
          }
        }
      } else if (formatStr[i] === '\\' && i + 1 < formatStr.length) {
        const esc = formatStr[i + 1];
        i++;
        if (esc === 'n') res += '\n';
        else if (esc === 't') res += '\t';
        else res += esc;
      } else {
        res += formatStr[i];
      }
    }
    return res;
  }

  evaluateExpr(expr, inst) {
    if (expr.type === 'NUMBER') {
      return LOGIC_4VAL.parseNumber(expr.value);
    }
    
    if (expr.type === 'IDENTIFIER') {
      const sig = inst.signals[expr.name];
      if (!sig) throw new Error(`Undeclared identifier '${expr.name}'`);
      return sig.value;
    }

    if (expr.type === 'SYSTEM_TASK') {
      if (expr.name === '$time') {
        return this.time.toString(2);
      }
      return 'x';
    }

    if (expr.type === 'STRING_LITERAL') {
      return expr.value;
    }

    if (expr.type === 'INDEX') {
      const sig = inst.signals[expr.name];
      if (!sig) throw new Error(`Undeclared identifier '${expr.name}'`);
      const idx = parseInt(this.evaluateExpr(expr.idx, inst), 2);
      
      const msb = sig.width[0];
      const lsb = sig.width[1];
      const bitIndex = msb >= lsb ? (msb - idx) : (idx - msb);
      
      if (bitIndex >= 0 && bitIndex < sig.value.length) {
        return sig.value[bitIndex];
      }
      return 'x';
    }

    if (expr.type === 'SLICE') {
      const sig = inst.signals[expr.name];
      if (!sig) throw new Error(`Undeclared identifier '${expr.name}'`);
      const msbExpr = parseInt(this.evaluateExpr(expr.msb, inst), 2);
      const lsbExpr = parseInt(this.evaluateExpr(expr.lsb, inst), 2);
      
      const msb = sig.width[0];
      const lsb = sig.width[1];
      
      const startIdx = msb >= lsb ? (msb - msbExpr) : (msbExpr - msb);
      const endIdx = msb >= lsb ? (msb - lsbExpr) : (lsbExpr - msb);
      
      const sliceLen = Math.abs(msbExpr - lsbExpr) + 1;
      
      let res = '';
      for (let i = 0; i < sliceLen; i++) {
        const targetIdx = msb >= lsb ? (startIdx + i) : (startIdx - i);
        if (targetIdx >= 0 && targetIdx < sig.value.length) {
          res += sig.value[targetIdx];
        } else {
          res += 'x';
        }
      }
      return res;
    }

    if (expr.type === 'CONCAT') {
      let bits = '';
      for (let part of expr.parts) {
        bits += this.evaluateExpr(part, inst);
      }
      return bits;
    }

    if (expr.type === 'UNARY_OP') {
      const val = this.evaluateExpr(expr.rhs, inst);
      if (expr.op === '~') return LOGIC_4VAL.not(val);
      if (expr.op === '!') return LOGIC_4VAL.logicalNot(val);
      if (expr.op === '-') {
        if (val.includes('x') || val.includes('z')) return 'x'.repeat(val.length);
        const decVal = parseInt(val, 2);
        const negated = (1 << val.length) - decVal;
        return negated.toString(2).padStart(val.length, '0');
      }
      return val;
    }

    if (expr.type === 'BINARY_OP') {
      const a = this.evaluateExpr(expr.lhs, inst);
      const b = this.evaluateExpr(expr.rhs, inst);
      
      switch (expr.op) {
        case '&': return LOGIC_4VAL.and(a, b);
        case '|': return LOGIC_4VAL.or(a, b);
        case '^': return LOGIC_4VAL.xor(a, b);
        case '+': return LOGIC_4VAL.add(a, b);
        case '-': return LOGIC_4VAL.sub(a, b);
        case '&&': return LOGIC_4VAL.logicalAnd(a, b);
        case '||': return LOGIC_4VAL.logicalOr(a, b);
        case '==': return LOGIC_4VAL.eq(a, b);
        case '!=': return LOGIC_4VAL.neq(a, b);
        case '<': return LOGIC_4VAL.lt(a, b);
        case '>': return LOGIC_4VAL.gt(a, b);
        case '<=': return LOGIC_4VAL.lte(a, b);
        case '>=': return LOGIC_4VAL.gte(a, b);
        
        case '<<': {
          const shift = parseInt(b, 2);
          if (isNaN(shift)) return 'x'.repeat(a.length);
          return a.slice(shift).padEnd(a.length, '0');
        }
        case '>>': {
          const shift = parseInt(b, 2);
          if (isNaN(shift)) return 'x'.repeat(a.length);
          return a.slice(0, Math.max(0, a.length - shift)).padStart(a.length, '0');
        }
        default:
          throw new Error(`Unsupported binary operator '${expr.op}'`);
      }
    }

    if (expr.type === 'TERNARY') {
      const condVal = this.evaluateExpr(expr.cond, inst);
      const isCondTrue = LOGIC_4VAL.isTrue(condVal);
      if (isCondTrue === '1') return this.evaluateExpr(expr.trueExpr, inst);
      if (isCondTrue === '0') return this.evaluateExpr(expr.falseExpr, inst);
      
      const tVal = this.evaluateExpr(expr.trueExpr, inst);
      const fVal = this.evaluateExpr(expr.falseExpr, inst);
      const len = Math.max(tVal.length, fVal.length);
      const padT = tVal.padStart(len, 'x');
      const padF = fVal.padStart(len, 'x');
      let res = '';
      for (let i = 0; i < len; i++) {
        res += (padT[i] === padF[i]) ? padT[i] : 'x';
      }
      return res;
    }

    return 'x';
  }
}

// Export compiler modules for server.js
module.exports = {
  VerilogLexer,
  VerilogParser,
  VerilogSimulator,
  LOGIC_4VAL
};
