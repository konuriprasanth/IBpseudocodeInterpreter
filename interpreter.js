// ─── EXAMPLES ───────────────────────────────────────────
const EXAMPLES = {
  averaging: `// Averaging non-zero elements in STOCK array
// Populate STOCK array first
loop I from 0 to 9
  STOCK[I] = I * 7 mod 13  // some values including 0s
end loop

COUNT = 0
TOTAL = 0
loop N from 0 to 9
  if STOCK[N] > 0 then
    COUNT = COUNT + 1
    TOTAL = TOTAL + STOCK[N]
  end if
end loop

if NOT COUNT = 0 then
  AVERAGE = TOTAL / COUNT
  output "Average = " , AVERAGE
else
  output "There are no non-zero values"
end if`,

  dedup: `// Copy collection into array, eliminating duplicates
NAMES.addItem("Alice")
NAMES.addItem("Bob")
NAMES.addItem("Alice")
NAMES.addItem("Charlie")
NAMES.addItem("Bob")
NAMES.addItem("Diana")

COUNT = 0
loop while NAMES.hasNext()
  DATA = NAMES.getNext()
  FOUND = false
  loop POS from 0 to COUNT-1
    if DATA = LIST[POS] then
      FOUND = true
    end if
  end loop
  if FOUND = false then
    LIST[COUNT] = DATA
    COUNT = COUNT + 1
  end if
end loop

output "Unique names:"
loop I from 0 to COUNT-1
  output LIST[I]
end loop`,

  factors: `// Print all factors of a number
NUM = 140
F = 1
FACTORS = 0

loop for F*F > NUM
  if NUM mod F = 0 then
    D = NUM div F
    output NUM , " = " , F , " * " , D
    if F = 1 then
      FACTORS = FACTORS + 0
    else if F = D then
      FACTORS = FACTORS + 1
    else
      FACTORS = FACTORS + 2
    end if
  end if
  F = F + 1
end loop

output NUM , " has " , FACTORS , " factors"`,

  reversestack: `// Copy collection into array in reverse using a stack
SURVEY.addItem("Alpha")
SURVEY.addItem("Beta")
SURVEY.addItem("Gamma")
SURVEY.addItem("Delta")

COUNT = 0
loop while SURVEY.hasNext()
  MYSTACK.push( SURVEY.getNext() )
  COUNT = COUNT + 1
end loop

loop POS from 0 to COUNT-1
  MYARRAY[POS] = MYSTACK.pop()
end loop

output "Reversed:"
loop I from 0 to COUNT-1
  output MYARRAY[I]
end loop`,

  fibonacci: `// Fibonacci sequence up to 20 terms
N = 20
A = 0
B = 1
output "Fibonacci sequence:"
loop I from 1 to N
  output A
  TEMP = A + B
  A = B
  B = TEMP
end loop`,

  bubblesort: `// Bubble sort algorithm
ARR[0] = 64
ARR[1] = 34
ARR[2] = 25
ARR[3] = 12
ARR[4] = 22
ARR[5] = 11
ARR[6] = 90
N = 7

loop I from 0 to N-2
  loop J from 0 to N-2-I
    if ARR[J] > ARR[J+1] then
      TEMP = ARR[J]
      ARR[J] = ARR[J+1]
      ARR[J+1] = TEMP
    end if
  end loop
end loop

output "Sorted array:"
loop K from 0 to N-1
  output ARR[K]
end loop`,

  binary: `// Binary search
ARR[0] = 10
ARR[1] = 20
ARR[2] = 30
ARR[3] = 40
ARR[4] = 50
ARR[5] = 60
ARR[6] = 70
N = 7
TARGET = 40

LOW = 0
HIGH = N - 1
RESULT = -1

loop while LOW <= HIGH
  MID = (LOW + HIGH) div 2
  if ARR[MID] = TARGET then
    RESULT = MID
    LOW = HIGH + 1  // break
  else if ARR[MID] < TARGET then
    LOW = MID + 1
  else
    HIGH = MID - 1
  end if
end loop

if RESULT ≠ -1 then
  output "Found " , TARGET , " at index " , RESULT
else
  output TARGET , " not found"
end if`,

  queuedemo: `// Queue demonstration (FIFO)
input NAME

WAIT.enqueue("Sebastian")
WAIT.enqueue("Max")
WAIT.enqueue(NAME)
WAIT.enqueue("Lewis")

output "Processing queue:"
loop while NOT WAIT.isEmpty()
  // Queue.isEmpty() visual representation
  output "Is Queue empty: " , WAIT.isEmpty()

  CLIENT = WAIT.dequeue()
  output CLIENT
end loop

output "Queue empty: " , WAIT.isEmpty()`
};

// ─── INTERPRETER ────────────────────────────────────────

class IB_Interpreter {
  constructor(code, stdinLines) {
    this.code = code;
    this.lines = code.split('\n');
    this.pos = 0;
    this.env = {}; // flat vars
    this.arrays = {}; // ARR[i]
    this.collections = {}; // Collection objects
    this.stacks = {}; // Stack objects
    this.queues = {}; // Queue objects
    this.output = [];
    this.stdinLines = [...stdinLines];
    this.stdinIdx = 0;
    this.maxSteps = 1000000; // to prevent infinite loops
    this.steps = 0;
    this.pendingInput = null; // for async input
  }

  getVar(name) {
    if (name in this.env) return this.env[name];
    return 0;
  }

  setVar(name, val) {
    this.env[name] = val;
  }

  getArr(name, idx) {
    if (!this.arrays[name]) this.arrays[name] = {};
    const v = this.arrays[name][idx];
    return v === undefined ? 0 : v;
  }

  setArr(name, idx, val) {
    if (!this.arrays[name]) this.arrays[name] = {};
    this.arrays[name][idx] = val;
  }

  getCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = { items: [], cursor: 0 };
    }
    return this.collections[name];
  }

  getStack(name) {
    if (!this.stacks[name]) this.stacks[name] = [];
    return this.stacks[name];
  }

  getQueue(name) {
    if (!this.queues[name]) this.queues[name] = [];
    return this.queues[name];
  }

  isCollection(name) { return name in this.collections; }
  isStack(name) { return name in this.stacks; }
  isQueue(name) { return name in this.queues; }

  // Tokenize a line
  tokenize(line) {
    const tokens = [];
    let i = 0;
    line = line.trim();
    while (i < line.length) {
      // skip whitespace
      if (/\s/.test(line[i])) { i++; continue; }
      // comment
      if (line[i] === '/' && line[i+1] === '/') break;
      // string
      if (line[i] === '"') {
        let j = i+1;
        while (j < line.length && line[j] !== '"') j++;
        tokens.push({ type: 'STRING', value: line.slice(i+1, j) });
        i = j+1; continue;
      }
      // number
      if (/\d/.test(line[i]) || (line[i] === '-' && /\d/.test(line[i+1]) && (tokens.length === 0 || ['OP','COMMA','LPAREN','KEYWORD'].includes(tokens[tokens.length-1]?.type)))) {
        let j = i; if (line[j] === '-') j++;
        while (j < line.length && /[\d.]/.test(line[j])) j++;
        tokens.push({ type: 'NUMBER', value: parseFloat(line.slice(i, j)) });
        i = j; continue;
      }
      // operators / symbols
      // ≠ is U+2260, always 1 JS code unit
      if (line[i] === '≠') { tokens.push({type:'OP',value:'≠'}); i++; continue; }
      if (line.slice(i,i+2) === '>=') { tokens.push({type:'OP',value:'>='}); i+=2; continue; }
      if (line.slice(i,i+2) === '<=') { tokens.push({type:'OP',value:'<='}); i+=2; continue; }
      if (line.slice(i,i+2) === '<>') { tokens.push({type:'OP',value:'≠'}); i+=2; continue; }
      if (line[i] === '=') { tokens.push({type:'OP',value:'='}); i++; continue; }
      if (line[i] === '>') { tokens.push({type:'OP',value:'>'}); i++; continue; }
      if (line[i] === '<') { tokens.push({type:'OP',value:'<'}); i++; continue; }
      if (line[i] === '+') { tokens.push({type:'OP',value:'+'}); i++; continue; }
      if (line[i] === '-') { tokens.push({type:'OP',value:'-'}); i++; continue; }
      if (line[i] === '*') { tokens.push({type:'OP',value:'*'}); i++; continue; }
      if (line[i] === '/') { tokens.push({type:'OP',value:'/'}); i++; continue; }
      if (line[i] === '(') { tokens.push({type:'LPAREN',value:'('}); i++; continue; }
      if (line[i] === ')') { tokens.push({type:'RPAREN',value:')'}); i++; continue; }
      if (line[i] === '[') { tokens.push({type:'LBRACK',value:'['}); i++; continue; }
      if (line[i] === ']') { tokens.push({type:'RBRACK',value:']'}); i++; continue; }
      if (line[i] === ',') { tokens.push({type:'COMMA',value:','}); i++; continue; }
      if (line[i] === '.') { tokens.push({type:'DOT',value:'.'}); i++; continue; }
      // identifier or keyword
      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const kwds = ['if','then','else','end','loop','while','for','from','to','output','input','not','and','or','mod','div','true','false'];
        const type = kwds.includes(word.toLowerCase()) ? 'KEYWORD' : 'IDENT';
        tokens.push({ type, value: word });
        i = j; continue;
      }
      i++;
    }
    return tokens;
  }

  // Parse expression from token array
  parseExpr(tokens, start) {
    // Returns {value, nextIdx}
    return this.parseOr(tokens, start);
  }

  parseOr(tokens, i) {
    let left = this.parseAnd(tokens, i);
    while (left.next < tokens.length && String(tokens[left.next]?.value).toLowerCase() === 'or') {
      let right = this.parseAnd(tokens, left.next + 1);
      left = { value: left.value || right.value, next: right.next };
    }
    return left;
  }

  parseAnd(tokens, i) {
    let left = this.parseNot(tokens, i);
    while (left.next < tokens.length && String(tokens[left.next]?.value).toLowerCase() === 'and') {
      let right = this.parseNot(tokens, left.next + 1);
      left = { value: left.value && right.value, next: right.next };
    }
    return left;
  }

  parseNot(tokens, i) {
    if (String(tokens[i]?.value).toLowerCase() === 'not') {
      const r = this.parseComparison(tokens, i+1);
      return { value: !r.value, next: r.next };
    }
    return this.parseComparison(tokens, i);
  }

  parseComparison(tokens, i) {
    let left = this.parseAddSub(tokens, i);
    const op = tokens[left.next];
    if (op && ['=','≠','>','<','>=','<='].includes(op.value)) {
      let right = this.parseAddSub(tokens, left.next + 1);
      let res;
      switch(op.value) {
        case '=': res = left.value == right.value; break;
        case '≠': res = left.value != right.value; break;
        case '>': res = left.value > right.value; break;
        case '<': res = left.value < right.value; break;
        case '>=': res = left.value >= right.value; break;
        case '<=': res = left.value <= right.value; break;
      }
      return { value: res, next: right.next };
    }
    return left;
  }

  parseAddSub(tokens, i) {
    let left = this.parseMulDiv(tokens, i);
    while (left.next < tokens.length) {
      const op = tokens[left.next];
      if (!op || (op.value !== '+' && op.value !== '-')) break;
      let right = this.parseMulDiv(tokens, left.next + 1);
      left = {
        value: op.value === '+' ? left.value + right.value : left.value - right.value,
        next: right.next
      };
    }
    return left;
  }

  parseMulDiv(tokens, i) {
    let left = this.parseUnary(tokens, i);
    while (left.next < tokens.length) {
      const op = tokens[left.next];
      if (!op) break;
      const v = typeof op.value === 'string' ? op.value.toLowerCase() : null;
      if (v === '*') {
        let right = this.parseUnary(tokens, left.next + 1);
        left = { value: left.value * right.value, next: right.next };
      } else if (v === '/') {
        let right = this.parseUnary(tokens, left.next + 1);
        left = { value: left.value / right.value, next: right.next };
      } else if (v === 'mod') {
        let right = this.parseUnary(tokens, left.next + 1);
        left = { value: ((left.value % right.value) + Math.abs(right.value)) % Math.abs(right.value), next: right.next };
      } else if (v === 'div') {
        let right = this.parseUnary(tokens, left.next + 1);
        left = { value: Math.trunc(left.value / right.value), next: right.next };
      } else break;
    }
    return left;
  }

  parseUnary(tokens, i) {
    if (tokens[i]?.value === '-') {
      const r = this.parsePrimary(tokens, i+1);
      return { value: -r.value, next: r.next };
    }
    return this.parsePrimary(tokens, i);
  }

  parsePrimary(tokens, i) {
    const t = tokens[i];
    if (!t) return { value: 0, next: i };

    // Parenthesized
    if (t.type === 'LPAREN') {
      const inner = this.parseExpr(tokens, i+1);
      const close = inner.next;
      return { value: inner.value, next: close + (tokens[close]?.type === 'RPAREN' ? 1 : 0) };
    }

    // Number literal
    if (t.type === 'NUMBER') return { value: t.value, next: i+1 };

    // String literal
    if (t.type === 'STRING') return { value: t.value, next: i+1 };

    // true/false
    if (t.type === 'KEYWORD' && t.value.toLowerCase() === 'true') return { value: true, next: i+1 };
    if (t.type === 'KEYWORD' && t.value.toLowerCase() === 'false') return { value: false, next: i+1 };

    // Identifier: could be variable, array access, or method call
    if (t.type === 'IDENT') {
      // Check for dot notation: NAME.method(...)
      if (tokens[i+1]?.type === 'DOT' && tokens[i+2]?.type === 'IDENT') {
        const objName = t.value;
        const method = tokens[i+2].value.toLowerCase();
        let j = i+3;
        // Parse args
        let args = [];
        if (tokens[j]?.type === 'LPAREN') {
          j++;
          while (j < tokens.length && tokens[j]?.type !== 'RPAREN') {
            if (tokens[j]?.type === 'COMMA') { j++; continue; }
            const arg = this.parseExpr(tokens, j);
            args.push(arg.value);
            j = arg.next;
          }
          if (tokens[j]?.type === 'RPAREN') j++;
        }
        const result = this.callMethod(objName, method, args);
        return { value: result, next: j };
      }

      // Array access: NAME[expr]
      if (tokens[i+1]?.type === 'LBRACK') {
        const arrName = t.value;
        const idxExpr = this.parseExpr(tokens, i+2);
        const idx = Math.round(idxExpr.value);
        const close = idxExpr.next;
        const endBrack = tokens[close]?.type === 'RBRACK' ? close+1 : close;
        return { value: this.getArr(arrName, idx), next: endBrack };
      }

      // Plain variable
      return { value: this.getVar(t.value), next: i+1 };
    }

    return { value: 0, next: i+1 };
  }

  callMethod(objName, method, args) {
    // Auto-detect type from existing registrations, or guess
    if (method === 'additem') {
      this.getCollection(objName).items.push(args[0]);
      return null;
    }
    if (method === 'getnext') {
      const col = this.getCollection(objName);
      if (col.cursor < col.items.length) return col.items[col.cursor++];
      throw new Error(`${objName}.getNext() called but no more items`);
    }
    if (method === 'hasnext') {
      const col = this.getCollection(objName);
      return col.cursor < col.items.length;
    }
    if (method === 'resetnext') {
      this.getCollection(objName).cursor = 0;
      return null;
    }
    if (method === 'isempty') {
      if (objName in this.stacks) return this.getStack(objName).length === 0;
      if (objName in this.queues) return this.getQueue(objName).length === 0;
      const col = this.getCollection(objName);
      return col.items.length === 0;
    }
    if (method === 'push') {
      this.getStack(objName).push(args[0]);
      return null;
    }
    if (method === 'pop') {
      const s = this.getStack(objName);
      if (s.length === 0) throw new Error(`${objName}.pop() on empty stack`);
      return s.pop();
    }
    if (method === 'enqueue') {
      this.getQueue(objName).push(args[0]);
      return null;
    }
    if (method === 'dequeue') {
      const q = this.getQueue(objName);
      if (q.length === 0) throw new Error(`${objName}.dequeue() on empty queue`);
      return q.shift();
    }
    // String methods (if specified in question)
    if (method === 'charat') {
      return String(this.getVar(objName))[args[0]] || '';
    }
    if (method === 'substring') {
      return String(this.getVar(objName)).substring(args[0], args[1]);
    }
    if (method === 'length') {
      return String(this.getVar(objName)).length;
    }
    throw new Error(`Unknown method: ${objName}.${method}()`);
  }

  // Evaluate entire line as expression
  evalExpr(line) {
    const tokens = this.tokenize(line);
    const result = this.parseExpr(tokens, 0);
    return result.value;
  }

  // Execute assignment: LHS = expr
  evalAssignment(tokens) {
    // LHS is either IDENT or IDENT[expr]
    let i = 0;
    const name = tokens[i].value;

    // Check for dot.method calls on LHS (shouldn't normally happen, but for side effects)
    if (tokens[i+1]?.type === 'DOT') {
      // method call as statement
      const method = tokens[i+2].value.toLowerCase();
      let j = i+3;
      let args = [];
      if (tokens[j]?.type === 'LPAREN') {
        j++;
        while (j < tokens.length && tokens[j]?.type !== 'RPAREN') {
          if (tokens[j]?.type === 'COMMA') { j++; continue; }
          const arg = this.parseExpr(tokens, j);
          args.push(arg.value);
          j = arg.next;
        }
      }
      this.callMethod(name, method, args);
      return;
    }

    // Array assignment
    if (tokens[i+1]?.type === 'LBRACK') {
      const idxExpr = this.parseExpr(tokens, i+2);
      const idx = Math.round(idxExpr.value);
      let j = idxExpr.next;
      if (tokens[j]?.type === 'RBRACK') j++;
      if (tokens[j]?.value === '=') j++;
      const valExpr = this.parseExpr(tokens, j);
      this.setArr(name, idx, valExpr.value);
      return;
    }

    // Normal assignment
    if (tokens[i+1]?.value === '=') {
      const valExpr = this.parseExpr(tokens, i+2);
      this.setVar(name, valExpr.value);
      return;
    }

    // Method call as statement (COLLECTION.method(...))
    throw new Error(`Cannot parse statement: ${tokens.map(t=>String(t.value)).join(' ')}`);
  }

  // Read input
  readInput() {
    if (this.stdinIdx < this.stdinLines.length) {
      return this.stdinLines[this.stdinIdx++];
    }
    throw new Error('INPUT: no more input lines provided');
  }

  // Format output value
  fmt(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(Math.round(v * 1e10) / 1e10);
    }
    return String(v);
  }

  // Main execution
  execute() {
    this.pos = 0;
    this.output = [];
    try {
      this.runBlock(this.lines.length);
    } catch(e) {
      this.output.push({ type: 'error', text: '✗ Runtime Error: ' + e.message });
    }
    return { output: this.output, env: this.env, arrays: this.arrays, collections: this.collections, stacks: this.stacks, queues: this.queues };
  }

  // Run lines from current pos up to endLine
  runBlock(endLine) {
    while (this.pos < endLine) {
      if (this.steps++ > this.maxSteps) throw new Error('Execution limit reached (infinite loop?)');
      const raw = this.lines[this.pos];
      if (!raw) { this.pos++; continue; }
      const line = raw.trim();
      if (!line || line.startsWith('//')) { this.pos++; continue; }
      this.executeLine(line, raw);
    }
  }

  executeLine(line, raw) {
    const tokens = this.tokenize(line);
    if (!tokens.length) { this.pos++; return; }
    const first = tokens[0];
    // Guard: NUMBER tokens have numeric values — always coerce to string first
    const kw = String(first.value).toLowerCase();

    // output
    if (kw === 'output') {
      const rest = line.replace(/^output\s*/i, '');
      // Split on commas that are NOT inside quotes
      const parts = [];
      let cur = '', inStr = false;
      for (let ci = 0; ci < rest.length; ci++) {
        const ch = rest[ci];
        if (ch === '"') inStr = !inStr;
        if (ch === ',' && !inStr) { parts.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      if (cur.trim()) parts.push(cur.trim());
      let out = parts.map(p => this.fmt(this.evalExpr(p.trim()))).join('');
      this.output.push({ type: 'stdout', text: out });
      this.pos++; return;
    }

    // input
    if (kw === 'input') {
      const varName = tokens[1]?.value;
      const val = this.readInput();
      const num = parseFloat(val);
      this.setVar(varName, isNaN(num) ? val : num);
      this.output.push({ type: 'info', text: `← input: ${val}` });
      this.pos++; return;
    }

    // if / else if / else / end if
    if (kw === 'if') {
      this.executeIf();
      return;
    }

    // loop
    if (kw === 'loop') {
      this.executeLoop();
      return;
    }

    // end loop / end if — handled by callers, but skip if encountered alone
    if (kw === 'end') { this.pos++; return; }
    if (kw === 'else') { this.pos++; return; }

    // Method calls as standalone statements: OBJ.method(...)
    if (tokens[1]?.type === 'DOT') {
      const objName = tokens[0].value;
      const method = tokens[2].value.toLowerCase();
      let j = 3;
      let args = [];
      if (tokens[j]?.type === 'LPAREN') {
        j++;
        while (j < tokens.length && tokens[j]?.type !== 'RPAREN') {
          if (tokens[j]?.type === 'COMMA') { j++; continue; }
          const arg = this.parseExpr(tokens, j);
          args.push(arg.value);
          j = arg.next;
        }
      }
      this.callMethod(objName, method, args);
      this.pos++; return;
    }

    // Assignment
    if (tokens[1]?.value === '=' || tokens[1]?.type === 'LBRACK') {
      this.evalAssignment(tokens);
      this.pos++; return;
    }

    // Unknown — skip
    this.pos++;
  }

  // Skip a block until matching end if/end loop/else/else if
  skipBlock(stopOn) {
    // stopOn is array of patterns to stop on (at current nesting)
    let depth = 0;
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos].trim().toLowerCase();
      if (!line || line.startsWith('//')) { this.pos++; continue; }
      // Track nesting
      if (line.startsWith('if ') || line.startsWith('loop ')) depth++;
      if ((line === 'end if' || line === 'end loop' || line.startsWith('end if') || line.startsWith('end loop'))) {
        if (depth === 0) { return; }
        depth--;
      }
      if (depth === 0 && stopOn.some(s => line.startsWith(s))) { return; }
      this.pos++;
    }
  }

  executeIf() {
    // Parse condition from "if CONDITION then"
    const line = this.lines[this.pos].trim();
    const condStr = line.replace(/^if\s+/i,'').replace(/\s+then\s*$/i,'');
    const cond = this.evalExpr(condStr);
    this.pos++;

    if (cond) {
      // Execute true branch, skip to end if
      while (this.pos < this.lines.length) {
        const l = this.lines[this.pos].trim().toLowerCase();
        if (l.startsWith('else if ') || l === 'else' || l.startsWith('end if')) break;
        this.executeLineOrBlock();
      }
      // Now skip remaining branches
      let depth = 0;
      while (this.pos < this.lines.length) {
        const l = this.lines[this.pos].trim().toLowerCase();
        if (l.startsWith('if ') || l.startsWith('loop ')) depth++;
        if (depth === 0 && (l.startsWith('end if') || l === 'end if')) { this.pos++; return; }
        if (depth > 0 && (l === 'end if' || l === 'end loop')) depth--;
        this.pos++;
      }
    } else {
      // Skip to else if / else / end if
      let depth = 0;
      while (this.pos < this.lines.length) {
        const l = this.lines[this.pos].trim().toLowerCase();
        if (l.startsWith('if ') || l.startsWith('loop ')) depth++;
        if (depth === 0) {
          if (l.startsWith('else if ') || l === 'else') break;
          if (l.startsWith('end if')) { this.pos++; return; }
        }
        if (depth > 0 && (l === 'end if' || l === 'end loop')) depth--;
        this.pos++;
      }

      const next = this.lines[this.pos]?.trim().toLowerCase();
      if (!next) return;

      if (next.startsWith('else if ')) {
        // Treat as new if
        const newLine = this.lines[this.pos].trim().replace(/^else\s+/i,'');
        this.lines[this.pos] = ' '.repeat(this.lines[this.pos].search(/\S/)) + newLine;
        this.executeIf();
      } else if (next === 'else') {
        this.pos++;
        while (this.pos < this.lines.length) {
          const l = this.lines[this.pos].trim().toLowerCase();
          if (l.startsWith('end if')) { this.pos++; return; }
          this.executeLineOrBlock();
        }
      } else if (next.startsWith('end if')) {
        this.pos++;
      }
    }
  }

  executeLineOrBlock() {
    const line = this.lines[this.pos]?.trim();
    if (!line || line.startsWith('//')) { this.pos++; return; }
    const kw = line.toLowerCase();
    if (kw.startsWith('if ')) { this.executeIf(); return; }
    if (kw.startsWith('loop ')) { this.executeLoop(); return; }
    this.executeLine(line, this.lines[this.pos]);
  }

  executeLoop() {
    const raw = this.lines[this.pos].trim();
    const tokens = this.tokenize(raw);
    // tokens[0] = 'loop'
    const second = tokens[1] ? String(tokens[1].value).toLowerCase() : '';

    // loop while COND
    if (second === 'while') {
      const loopStart = this.pos;
      const condStr = raw.replace(/^loop\s+while\s+/i, '');
      while (true) {
        this.pos = loopStart;
        if (this.steps++ > this.maxSteps) throw new Error('Execution limit reached (infinite loop?)');
        const cond = this.evalExpr(condStr);
        if (!cond) {
          // Skip body to end loop
          this.pos++;
          this.skipToEndLoop();
          return;
        }
        this.pos++;
        this.runLoopBody();
      }
    }

    // loop for COND
    if (second === 'for') {
      const loopStart = this.pos;
      const condStr = raw.replace(/^loop\s+for\s+/i, '');
      while (true) {
        this.pos = loopStart;
        if (this.steps++ > this.maxSteps) throw new Error('Execution limit reached (infinite loop?)');
        this.pos++;
        this.runLoopBody();
        // Re-check condition
        const cond = this.evalExpr(condStr);
        if (cond) return;
      }
    }

    // loop VAR from START to END
    if (second !== 'while' && second !== 'for') {
      // loop COUNT from 0 to N
      const varName = tokens[1].value;
      // find 'from' and 'to'
      let fromIdx = tokens.findIndex(t => String(t.value).toLowerCase() === 'from');
      let toIdx = tokens.findIndex(t => String(t.value).toLowerCase() === 'to');
      const startTokens = tokens.slice(fromIdx+1, toIdx);
      const endTokens = tokens.slice(toIdx+1);

      const startStr = startTokens.map(t => t.type === 'STRING' ? `"${t.value}"` : String(t.value)).join(' ');
      const endStr = endTokens.map(t => t.type === 'STRING' ? `"${t.value}"` : String(t.value)).join(' ');

      const loopStart = this.pos;

      const startVal = this.evalExpr(startStr);
      const endVal = this.evalExpr(endStr);

      if (startVal > endVal) {
        // Skip body entirely
        this.pos = loopStart + 1;
        this.skipToEndLoop();
        return;
      }

      for (let v = startVal; v <= endVal; v++) {
        if (this.steps++ > this.maxSteps) throw new Error('Execution limit reached (infinite loop?)');
        this.setVar(varName, v);
        this.pos = loopStart + 1;
        this.runLoopBody();
      }
      // After loop, pos is already past end loop (set by runLoopBody)
      return;
    }
  }

  runLoopBody() {
    // Run until we hit matching 'end loop'
    let depth = 0;
    const bodyStart = this.pos;
    // First collect body end position
    let scanPos = this.pos;
    let bodyEnd = -1;
    let sd = 0;
    while (scanPos < this.lines.length) {
      const l = this.lines[scanPos].trim().toLowerCase();
      if (l.startsWith('loop ')) sd++;
      if (l === 'end loop' || l.startsWith('end loop')) {
        if (sd === 0) { bodyEnd = scanPos; break; }
        sd--;
      }
      scanPos++;
    }

    // Execute body lines
    this.pos = bodyStart;
    while (this.pos < (bodyEnd === -1 ? this.lines.length : bodyEnd)) {
      this.executeLineOrBlock();
    }
    if (bodyEnd !== -1) this.pos = bodyEnd + 1;
  }

  skipToEndLoop() {
    let depth = 0;
    while (this.pos < this.lines.length) {
      const l = this.lines[this.pos].trim().toLowerCase();
      if (l.startsWith('loop ')) depth++;
      if (l === 'end loop' || l.startsWith('end loop')) {
        if (depth === 0) { this.pos++; return; }
        depth--;
      }
      this.pos++;
    }
  }
}

// ─── UI ─────────────────────────────────────────────────

const editor = document.getElementById('editor');
const lineNumbers = document.getElementById('lineNumbers');
const outputContent = document.getElementById('outputContent');
const statusDot = document.getElementById('statusDot');

// Line numbers
function updateLineNumbers() {
  const lines = editor.value.split('\n');
  lineNumbers.innerHTML = lines.map((_,i) => `<span>${i+1}</span>`).join('');
}

editor.addEventListener('input', updateLineNumbers);
editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart, end = editor.selectionEnd;
    editor.value = editor.value.slice(0,s) + '  ' + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = s+2;
    updateLineNumbers();
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runCode();
  }
});

function clearOutput() {
  outputContent.innerHTML = '<div class="empty-state">Output cleared</div>';
  document.getElementById('varsContent').innerHTML = '<div class="empty-state" style="padding:8px 0;">No variables yet</div>';
  statusDot.className = 'status-dot';
}

function clearAll() {
  editor.value = '';
  updateLineNumbers();
  clearOutput();
  document.querySelectorAll('.example-btn').forEach(b=>b.classList.remove('active'));
}

function loadExample(name) {
  editor.value = EXAMPLES[name] || '';
  updateLineNumbers();
  clearOutput();
  document.querySelectorAll('.example-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
}

function runCode() {
  const code = editor.value;
  const stdinRaw = document.getElementById('stdinInput').value;
  const stdinLines = stdinRaw ? stdinRaw.split('\n').filter(l=>l.trim()!=='') : [];

  statusDot.className = 'status-dot running';
  outputContent.innerHTML = '';

  setTimeout(() => {
    try {
      const interp = new IB_Interpreter(code, stdinLines);
      const result = interp.execute();

      if (result.output.length === 0) {
        outputContent.innerHTML = '<div class="empty-state">Program executed — no output</div>';
      } else {
        result.output.forEach(line => {
          const div = document.createElement('div');
          div.className = `output-line ${line.type}`;
          div.innerHTML = `<span class="output-prefix">${line.type==='error'?'✗':line.type==='info'?'ℹ':'›'}</span><span class="output-text">${escapeHtml(String(line.text))}</span>`;
          outputContent.appendChild(div);
        });
      }

      const hasError = result.output.some(l=>l.type==='error');
      statusDot.className = 'status-dot ' + (hasError ? 'error' : 'success');

      // Vars
      renderVars(result.env, result.arrays, result.stacks, result.queues, result.collections);

    } catch(e) {
      outputContent.innerHTML = `<div class="output-line error"><span class="output-prefix">✗</span><span class="output-text">Error: ${escapeHtml(e.message)}</span></div>`;
      statusDot.className = 'status-dot error';
    }
  }, 0);
}

function renderVars(env, arrays, stacks, queues, collections) {
  const cont = document.getElementById('varsContent');
  const allVars = [];

  Object.entries(env).forEach(([k,v]) => {
    allVars.push({ name: k, type: typeof v, value: formatVal(v) });
  });

  Object.entries(arrays).forEach(([name, arr]) => {
    const entries = Object.entries(arr).sort((a,b)=>Number(a[0])-Number(b[0]));
    const preview = '[' + entries.slice(0,5).map(([i,v])=>formatVal(v)).join(', ') + (entries.length>5?', …':'') + ']';
    allVars.push({ name, type: 'array', value: preview });
  });

  Object.entries(stacks).forEach(([name, s]) => {
    allVars.push({ name, type: 'stack', value: `[${s.slice(-3).join(', ')}${s.length>3?'…':''}] (${s.length})` });
  });

  Object.entries(queues).forEach(([name, q]) => {
    allVars.push({ name, type: 'queue', value: `[${q.slice(0,3).join(', ')}${q.length>3?'…':''}] (${q.length})` });
  });

  Object.entries(collections).forEach(([name, c]) => {
    allVars.push({ name, type: 'collection', value: `[${c.items.slice(0,3).join(', ')}${c.items.length>3?'…':''}] (${c.items.length})` });
  });

  if (!allVars.length) {
    cont.innerHTML = '<div class="empty-state" style="padding:8px 0;">No variables yet</div>';
    return;
  }

  cont.innerHTML = `<table class="vars-table">
    <thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>
    <tbody>
      ${allVars.map(v=>`<tr><td>${escapeHtml(v.name)}</td><td>${v.type}</td><td>${escapeHtml(v.value)}</td></tr>`).join('')}
    </tbody>
  </table>`;
}

function formatVal(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : (Math.round(v*1e8)/1e8).toString();
  return String(v);
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Init
updateLineNumbers();
loadExample('averaging');
document.querySelector('.example-btn').classList.add('active');