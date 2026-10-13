// =====================================================================
//  PYTHON AST  ->  BLOCKLY JSON  (read-only mirror of the learner's code)
//  Uses ONE generic block type ("py_block") whose shape is described in
//  its extraState, so any Python construct can be shown faithfully.
// =====================================================================
const PyBlocks = (() => {
  const COL = {
    motion: "#4C97FF", sensor: "#5CB1D6", output: "#FFAB19", variable: "#FF8C1A",
    control: "#E6A700", logic: "#59C059", math: "#40BF4A", text: "#CF63CF",
    list: "#9966FF", dict: "#7E57C2", func: "#FF6680", builtin: "#0FBD8C", other: "#8892A6",
  };
  const MOTION = new Set(["move_forward", "turn_left", "turn_right", "collect"]);
  const SENSOR = new Set(["is_path_ahead", "is_path_left", "is_path_right", "at_goal", "read_beacon", "get_position", "get_heading"]);
  const BOOL_FUNCS = new Set(["is_path_ahead", "is_path_left", "is_path_right", "at_goal", "collect", "isinstance"]);
  const BUILTINS = new Set(["range", "len", "int", "str", "float", "bool", "list", "dict", "set", "tuple", "sum", "min", "max", "abs", "round", "type", "sorted", "enumerate", "zip", "repr", "isinstance", "reversed", "any", "all"]);
  const OPS = {
    Add: "+", Sub: "-", Mult: "*", Div: "/", FloorDiv: "//", Mod: "%", Pow: "**", MatMult: "@",
    BitAnd: "&", BitOr: "|", BitXor: "^", LShift: "<<", RShift: ">>",
    Eq: "==", NotEq: "!=", Lt: "<", LtE: "<=", Gt: ">", GtE: ">=", Is: "is", IsNot: "is not", In: "in", NotIn: "not in",
    And: "and", Or: "or", Not: "not", USub: "-", UAdd: "+", Invert: "~",
  };
  const MAX_LABEL = 42;
  let uid = 0, lineMap = {};

  const clip = (s) => { s = String(s); return s.length > MAX_LABEL ? s.slice(0, MAX_LABEL - 1) + "…" : s; };

  function make(colour, output, check, line) {
    return { type: "py_block", id: "pb" + uid++, extraState: { c: colour, o: !!output, k: check || null, r: [], t: line ? "Line " + line : "" }, inputs: {} };
  }
  function lab(b, text) { if (text !== "" && text != null) b.extraState.r.push({ k: "d", l: clip(text) }); return b; }
  function val(b, child, label) {
    const n = "V" + b.extraState.r.length;
    b.extraState.r.push({ k: "v", n, l: label ? clip(label) : "" });
    if (child) b.inputs[n] = { block: child };
    return b;
  }
  function stm(b, stmts) {
    const n = "S" + b.extraState.r.length;
    b.extraState.r.push({ k: "s", n });
    const first = chain(stmts || []);
    if (first) b.inputs[n] = { block: first };
    return b;
  }
  function mapLine(node, b) {
    if (node && node.lineno && !(node.lineno in lineMap)) lineMap[node.lineno] = b.id;
  }

  // ---------- expressions ----------
  function nameOf(n) {
    if (!n) return "";
    if (n._t === "Name") return n.id;
    if (n._t === "Attribute") return nameOf(n.value) + "." + n.attr;
    if (n._t === "Tuple" || n._t === "List") return n.elts.map(nameOf).join(", ");
    if (n._t === "Starred") return "*" + nameOf(n.value);
    return "";
  }
  function argsText(a) {
    if (!a) return "";
    const parts = [];
    const pos = [...(a.posonlyargs || []), ...(a.args || [])];
    const nd = (a.defaults || []).length;
    pos.forEach((p, i) => {
      const di = i - (pos.length - nd);
      parts.push(di >= 0 ? `${p.arg}=${exprText(a.defaults[di])}` : p.arg);
    });
    if (a.vararg) parts.push("*" + a.vararg.arg);
    if (!a.vararg && (a.kwonlyargs || []).length) parts.push("*");
    (a.kwonlyargs || []).forEach((p, i) => { const d = (a.kw_defaults || [])[i]; parts.push(d ? `${p.arg}=${exprText(d)}` : p.arg); });
    if (a.kwarg) parts.push("**" + a.kwarg.arg);
    return parts.join(", ");
  }
  function exprText(n) {
    if (!n) return "";
    if (n._t === "Constant") return n.repr;
    if (n._t === "Name") return n.id;
    return "…";
  }
  function seq(b, items, open, close) {
    lab(b, open);
    items.forEach((it, i) => val(b, expr(it), i ? "," : ""));
    lab(b, close);
    return b;
  }
  function callArgs(b, node) {
    const all = [...node.args.map((a) => ["", a]), ...node.keywords.map((k) => [k.arg ? k.arg + "=" : "**", k.value])];
    all.forEach(([kw, v], i) => val(b, expr(v), (i ? ", " : "") + kw));
  }

  function expr(n) {
    if (!n) return null;
    const L = n.lineno;
    let b;
    switch (n._t) {
      case "Constant": {
        if (n.vt === "bool") return lab(make(COL.logic, true, "Boolean", L), n.repr);
        if (n.vt === "int" || n.vt === "float") return lab(make(COL.math, true, "Number", L), n.repr);
        if (n.vt === "str") return lab(make(COL.text, true, "String", L), n.repr);
        return lab(make(COL.other, true, null, L), n.repr);
      }
      case "BigInt": return lab(make(COL.math, true, "Number", L), n.repr);
      case "Name": return lab(make(COL.variable, true, null, L), n.id);
      case "Call": {
        const f = n.func;
        if (f._t === "Name") {
          const nm = f.id;
          const col = MOTION.has(nm) ? COL.motion : SENSOR.has(nm) ? COL.sensor : nm === "print" ? COL.output : BUILTINS.has(nm) ? COL.builtin : COL.func;
          b = make(col, true, BOOL_FUNCS.has(nm) ? "Boolean" : null, L);
          if (!n.args.length && !n.keywords.length) return lab(b, nm + "()");
          lab(b, nm + "(");
          callArgs(b, n);
          return lab(b, ")");
        }
        if (f._t === "Attribute") {
          b = make(COL.list, true, null, L);
          val(b, expr(f.value));
          if (!n.args.length && !n.keywords.length) return lab(b, "." + f.attr + "()");
          lab(b, "." + f.attr + "(");
          callArgs(b, n);
          return lab(b, ")");
        }
        b = make(COL.func, true, null, L);
        val(b, expr(f)); lab(b, "("); callArgs(b, n); return lab(b, ")");
      }
      case "Attribute": b = make(COL.variable, true, null, L); val(b, expr(n.value)); return lab(b, "." + n.attr);
      case "BinOp": b = make(n.op._t === "Add" && (isStr(n.left) || isStr(n.right)) ? COL.text : COL.math, true, null, L);
        val(b, expr(n.left)); val(b, expr(n.right), OPS[n.op._t] || n.op._t); return b;
      case "UnaryOp": {
        const not = n.op._t === "Not";
        b = make(not ? COL.logic : COL.math, true, not ? "Boolean" : null, L);
        return val(b, expr(n.operand), OPS[n.op._t]);
      }
      case "BoolOp": b = make(COL.logic, true, "Boolean", L);
        n.values.forEach((v, i) => val(b, expr(v), i ? OPS[n.op._t] : "")); return b;
      case "Compare": b = make(COL.logic, true, "Boolean", L);
        val(b, expr(n.left));
        n.ops.forEach((op, i) => val(b, expr(n.comparators[i]), OPS[op._t] || op._t)); return b;
      case "IfExp": b = make(COL.control, true, null, L);
        val(b, expr(n.body)); val(b, expr(n.test), "if"); val(b, expr(n.orelse), "else"); return b;
      case "List": return seq(make(COL.list, true, null, L), n.elts, "[", "]");
      case "Tuple": return seq(make(COL.list, true, null, L), n.elts, "(", n.elts.length === 1 ? ",)" : ")");
      case "Set": return seq(make(COL.list, true, null, L), n.elts, "{", "}");
      case "Dict": b = make(COL.dict, true, null, L); lab(b, "{");
        n.keys.forEach((k, i) => { if (k) { val(b, expr(k), i ? "," : ""); val(b, expr(n.values[i]), ":"); } else val(b, expr(n.values[i]), (i ? ", " : "") + "**"); });
        return lab(b, "}");
      case "Subscript": b = make(COL.list, true, null, L);
        val(b, expr(n.value)); val(b, expr(n.slice), "["); return lab(b, "]");
      case "Slice": b = make(COL.list, true, null, L);
        if (n.lower) val(b, expr(n.lower)); lab(b, ":"); if (n.upper) val(b, expr(n.upper));
        if (n.step) { lab(b, ":"); val(b, expr(n.step)); } return b;
      case "JoinedStr": b = make(COL.text, true, "String", L); lab(b, 'f"');
        n.values.forEach((p) => {
          if (p._t === "Constant") lab(b, String(p.value));
          else if (p._t === "FormattedValue") { val(b, expr(p.value), "{"); lab(b, "}"); }
        });
        return lab(b, '"');
      case "ListComp": case "SetComp": case "GeneratorExp": case "DictComp": {
        const br = n._t === "ListComp" ? ["[", "]"] : n._t === "GeneratorExp" ? ["(", ")"] : ["{", "}"];
        b = make(COL.list, true, null, L); lab(b, br[0]);
        if (n._t === "DictComp") { val(b, expr(n.key)); val(b, expr(n.value), ":"); } else val(b, expr(n.elt));
        n.generators.forEach((g) => { val(b, expr(g.target), "for"); val(b, expr(g.iter), "in"); g.ifs.forEach((c) => val(b, expr(c), "if")); });
        return lab(b, br[1]);
      }
      case "Lambda": b = make(COL.func, true, null, L); return val(b, expr(n.body), `lambda ${argsText(n.args)}:`);
      case "Starred": return val(make(COL.list, true, null, L), expr(n.value), "*");
      case "NamedExpr": b = make(COL.variable, true, null, L); val(b, expr(n.target)); return val(b, expr(n.value), ":=");
      case "Yield": case "YieldFrom": return n.value ? val(make(COL.func, true, null, L), expr(n.value), "yield") : lab(make(COL.func, true, null, L), "yield");
      case "Await": return val(make(COL.other, true, null, L), expr(n.value), "await");
      default: return lab(make(COL.other, true, null, L), n._t);
    }
  }
  const isStr = (n) => n && ((n._t === "Constant" && n.vt === "str") || n._t === "JoinedStr");

  // ---------- statements ----------
  function stmt(n) {
    const L = n.lineno;
    let b;
    switch (n._t) {
      case "Expr": {
        const v = n.value;
        if (v._t === "Call") {
          const f = v.func;
          const nm = f._t === "Name" ? f.id : null;
          const col = nm ? (MOTION.has(nm) ? COL.motion : SENSOR.has(nm) ? COL.sensor : nm === "print" ? COL.output : BUILTINS.has(nm) ? COL.builtin : COL.func) : COL.list;
          b = make(col, false, null, L);
          if (nm) {
            if (!v.args.length && !v.keywords.length) lab(b, nm + "()");
            else { lab(b, nm + "("); callArgs(b, v); lab(b, ")"); }
          } else if (f._t === "Attribute") {
            val(b, expr(f.value));
            if (!v.args.length && !v.keywords.length) lab(b, "." + f.attr + "()");
            else { lab(b, "." + f.attr + "("); callArgs(b, v); lab(b, ")"); }
          } else { val(b, expr(f)); lab(b, "("); callArgs(b, v); lab(b, ")"); }
        } else if (v._t === "Name") {
          // a bare name: very often a forgotten () on a function call
          b = make(COL.other, false, null, L); lab(b, " " + v.id + "   (not called; missing ( ) ?)");
        } else if (v._t === "Constant" && v.vt === "str") {
          b = make(COL.other, false, null, L); lab(b, "docstring " + v.repr);
        } else { b = make(COL.other, false, null, L); val(b, expr(v), "evaluate"); }
        break;
      }
      case "Assign": b = make(COL.variable, false, null, L); lab(b, "set");
        n.targets.forEach((t, i) => { if (t._t === "Name") lab(b, (i ? "= " : "") + t.id); else val(b, expr(t), i ? "=" : ""); });
        val(b, expr(n.value), "="); break;
      case "AugAssign": b = make(COL.variable, false, null, L); lab(b, "change");
        if (n.target._t === "Name") lab(b, n.target.id); else val(b, expr(n.target));
        val(b, expr(n.value), (OPS[n.op._t] || "?") + "="); break;
      case "AnnAssign": b = make(COL.variable, false, null, L); lab(b, "set");
        if (n.target._t === "Name") lab(b, n.target.id); else val(b, expr(n.target));
        if (n.value) val(b, expr(n.value), "="); break;
      case "If": {
        b = make(COL.control, false, null, L);
        let cur = n, first = true;
        while (true) {
          val(b, expr(cur.test), first ? "if" : "elif");
          if (!first) mapLine(cur, b);
          lab(b, "then");
          stm(b, cur.body);
          first = false;
          if (cur.orelse.length === 1 && cur.orelse[0]._t === "If") { cur = cur.orelse[0]; continue; }
          if (cur.orelse.length) { lab(b, "else"); stm(b, cur.orelse); }
          break;
        }
        break;
      }
      case "For": b = make(COL.control, false, null, L);
        if (n.target._t === "Name") lab(b, "for each " + n.target.id); else { lab(b, "for each"); val(b, expr(n.target)); }
        val(b, expr(n.iter), "in"); stm(b, n.body);
        if (n.orelse.length) { lab(b, "else"); stm(b, n.orelse); } break;
      case "While": b = make(COL.control, false, null, L);
        val(b, expr(n.test), "repeat while"); stm(b, n.body);
        if (n.orelse.length) { lab(b, "else"); stm(b, n.orelse); } break;
      case "FunctionDef": case "AsyncFunctionDef": b = make(COL.func, false, null, L);
        lab(b, `define ${n.name}(${argsText(n.args)})`); stm(b, n.body); break;
      case "ClassDef": b = make(COL.dict, false, null, L);
        lab(b, `class ${n.name}` + (n.bases.length ? `(${n.bases.map(nameOf).join(", ")})` : "")); stm(b, n.body); break;
      case "Return": b = make(COL.func, false, null, L); lab(b, "return"); if (n.value) val(b, expr(n.value)); break;
      case "Pass": b = lab(make(COL.other, false, null, L), "pass (do nothing)"); break;
      case "Break": b = lab(make(COL.control, false, null, L), "break out of loop"); break;
      case "Continue": b = lab(make(COL.control, false, null, L), "continue to next loop"); break;
      case "Try": case "TryStar": b = make(COL.control, false, null, L); lab(b, "try"); stm(b, n.body);
        n.handlers.forEach((h) => { lab(b, "except" + (h.type ? " " + (nameOf(h.type) || "…") : "") + (h.name ? " as " + h.name : "")); mapLine(h, b); stm(b, h.body); });
        if (n.orelse.length) { lab(b, "else"); stm(b, n.orelse); }
        if (n.finalbody.length) { lab(b, "finally"); stm(b, n.finalbody); } break;
      case "Import": b = lab(make(COL.other, false, null, L), "import " + n.names.map((a) => a.name + (a.asname ? " as " + a.asname : "")).join(", ")); break;
      case "ImportFrom": b = lab(make(COL.other, false, null, L), `from ${n.module || "."} import ` + n.names.map((a) => a.name + (a.asname ? " as " + a.asname : "")).join(", ")); break;
      case "Global": case "Nonlocal": b = lab(make(COL.variable, false, null, L), n._t.toLowerCase() + " " + n.names.join(", ")); break;
      case "Delete": b = make(COL.variable, false, null, L); lab(b, "delete"); n.targets.forEach((t) => val(b, expr(t))); break;
      case "Assert": b = make(COL.logic, false, null, L); val(b, expr(n.test), "assert"); break;
      case "Raise": b = make(COL.control, false, null, L); lab(b, "raise"); if (n.exc) val(b, expr(n.exc)); break;
      case "With": b = make(COL.control, false, null, L); lab(b, "with");
        n.items.forEach((it) => { val(b, expr(it.context_expr)); if (it.optional_vars) val(b, expr(it.optional_vars), "as"); });
        stm(b, n.body); break;
      default: b = lab(make(COL.other, false, null, L), n._t);
    }
    mapLine(n, b);
    return b;
  }

  function chain(stmts) {
    let first = null, prev = null;
    for (const s of stmts) {
      const b = stmt(s);
      if (!first) first = b; else prev.next = { block: b };
      prev = b;
    }
    return first;
  }

  /** Convert a Python Module AST (JSON) into a Blockly workspace JSON + line->block map */
  function build(moduleAst) {
    uid = 0; lineMap = {};
    const first = chain(moduleAst.body || []);
    const blocks = first ? [Object.assign(first, { x: 16, y: 16 })] : [];
    return { json: { blocks: { languageVersion: 0, blocks } }, lineMap: { ...lineMap }, count: uid };
  }

  /** Register the generic block with Blockly (call once, in the browser). */
  function register(Blockly) {
    Blockly.Blocks["py_block"] = {
      init() { this.state_ = null; },
      saveExtraState() { return this.state_; },
      loadExtraState(st) {
        this.state_ = st;
        if (st.o) this.setOutput(true, st.k || null);
        else { this.setPreviousStatement(true); this.setNextStatement(true); }
        this.setColour(st.c);
        this.setInputsInline(true);
        if (st.t) this.setTooltip(st.t);
        for (const row of st.r) {
          let input;
          if (row.k === "v") input = this.appendValueInput(row.n);
          else if (row.k === "s") input = this.appendStatementInput(row.n);
          else input = this.appendDummyInput();
          if (row.l) input.appendField(new Blockly.FieldLabel(row.l));
        }
        if (!st.r.length) this.appendDummyInput().appendField(new Blockly.FieldLabel("…"));
      },
    };
  }

  return { build, register, COL };
})();

if (typeof module !== "undefined") module.exports = PyBlocks;
