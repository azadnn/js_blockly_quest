# =====================================================================
#  PYTHON QUEST RUNTIME  (runs inside Pyodide in a Web Worker)
#  - parse_code(): Python source -> JSON AST (for live Blockly view)
#  - run_level():  executes learner code against every level layout,
#                  recording a timeline of line/move/turn/print events
# =====================================================================
import ast, sys, json, re, types, builtins as _b

MAX_LINE_EVENTS = 4000      # infinite-loop guard
KEEP_ON_TIMEOUT = 160       # line events kept for replay when guard trips
DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]   # N E S W
HEADINGS = "NESW"


class _Halt(BaseException):
    """Stops the program (crash / too long). Not catchable by `except Exception`."""


class World:
    def __init__(self, layout):
        self.grid = [list(r) for r in layout["grid"]]
        self.h, self.w = len(self.grid), len(self.grid[0])
        self.crystals, self.goal, self.start = set(), None, (0, 0)
        for y, row in enumerate(self.grid):
            for x, c in enumerate(row):
                if c == "S": self.start = (x, y)
                elif c == "G": self.goal = (x, y)
                elif c == "C": self.crystals.add((x, y))
        if layout.get("goal"): self.goal = tuple(layout["goal"])
        self.x, self.y = self.start
        self.dir = HEADINGS.index(layout.get("dir", "E"))
        self.beacons = {tuple(int(v) for v in k.split(",")): val
                        for k, val in (layout.get("beacons") or {}).items()}
        self.total_crystals = len(self.crystals)
        self.collected = 0
        self.events, self.output = [], []
        self.line_events = 0

    def open(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h and self.grid[y][x] != "#"

    def ahead(self, turn=0):
        d = (self.dir + turn) % 4
        return self.x + DIRS[d][0], self.y + DIRS[d][1]


def _describe(v):
    if v is None: return "None"
    return f"{v!r} ({type(v).__name__})"


def _make_api(W):
    def _need_int(fn, v):
        if isinstance(v, bool) or not isinstance(v, int):
            hint = ""
            if isinstance(v, str): hint = " Text must be converted first: int(" + repr(v) + ")."
            elif isinstance(v, float): hint = " Use whole numbers. Tip: // divides and drops the decimals."
            elif v is None: hint = " Did a function forget to `return` a value?"
            raise TypeError(f"{fn}() needs a whole number (int), but got {_describe(v)}.{hint}")

    def move_forward(steps=1):
        _need_int("move_forward", steps)
        if steps < 0: raise ValueError("move_forward() can't take a negative number of steps.")
        for _ in range(steps):
            nx, ny = W.ahead()
            if not W.open(nx, ny):
                W.events.append({"t": "crash", "from": [W.x, W.y], "to": [nx, ny]})
                raise _Halt("crash")
            W.events.append({"t": "move", "from": [W.x, W.y], "to": [nx, ny]})
            W.x, W.y = nx, ny

    def _turn(delta):
        old = W.dir
        W.dir = (W.dir + delta) % 4
        W.events.append({"t": "turn", "from": old, "to": W.dir, "delta": delta})

    def turn_left(): _turn(-1)
    def turn_right(): _turn(1)
    def is_path_ahead(): return W.open(*W.ahead(0))
    def is_path_left(): return W.open(*W.ahead(-1))
    def is_path_right(): return W.open(*W.ahead(1))
    def at_goal(): return W.goal is not None and (W.x, W.y) == W.goal
    def get_position(): return (W.x, W.y)
    def get_heading(): return HEADINGS[W.dir]
    def read_beacon(): return W.beacons.get((W.x, W.y))

    def collect():
        if (W.x, W.y) in W.crystals:
            W.crystals.discard((W.x, W.y))
            W.collected += 1
            W.events.append({"t": "collect", "at": [W.x, W.y]})
            return True
        return False

    def _print(*args, sep=" ", end="\n", **_):
        text = sep.join(str(a) for a in args) + end
        W.output.append(text)
        W.events.append({"t": "print", "text": text})

    def _input(*_a, **_k):
        raise RuntimeError("input() isn't available in Space Academy. Use read_beacon() to receive data.")

    api = dict(move_forward=move_forward, turn_left=turn_left, turn_right=turn_right,
               is_path_ahead=is_path_ahead, is_path_left=is_path_left,
               is_path_right=is_path_right, at_goal=at_goal, collect=collect,
               get_position=get_position, get_heading=get_heading,
               read_beacon=read_beacon, print=_print, input=_input)
    bi = dict(vars(_b))
    for k in ("open", "exit", "quit", "help", "breakpoint", "eval", "exec", "compile"):
        bi.pop(k, None)
    bi.update(api)
    return bi


def _snapshot(frame):
    out = {}
    for k, v in list(frame.f_locals.items()):
        if k.startswith("_") or isinstance(v, types.ModuleType):
            continue
        if isinstance(v, (types.FunctionType, types.BuiltinFunctionType)):
            r, t = f"<function {k}>", "function"
        elif isinstance(v, type):
            r, t = f"<class {v.__name__}>", "class"
        else:
            try: r = repr(v)
            except Exception: r = "<?>"
            t = type(v).__name__
            if " object at 0x" in r: r = f"<{t} object>"
        if len(r) > 70: r = r[:67] + "..."
        out[k] = [r, t]
        if len(out) >= 30: break
    return out


class _Sanitize(ast.NodeTransformer):
    """Turn bare `except:` / `except BaseException` into `except Exception`
    so the runtime's halt signal can't be swallowed by learner code."""
    def visit_ExceptHandler(self, node):
        self.generic_visit(node)
        if node.type is None or (isinstance(node.type, ast.Name) and node.type.id == "BaseException"):
            node.type = ast.copy_location(ast.Name(id="Exception", ctx=ast.Load()), node)
        return node


# ---------------------------------------------------------------------
#  Friendly error messages
# ---------------------------------------------------------------------
def _hint(kind, msg):
    m = msg or ""
    if kind == "NameError":
        name = re.search(r"'(.+?)'", m)
        n = name.group(1) if name else "that name"
        if n[:1].isupper() and n.lower() in ("move_forward", "turn_left", "turn_right", "true", "false", "none", "print"):
            return f"Python is case-sensitive: '{n}' is not the same as '{n.lower()}'." if n.lower() not in ("true", "false", "none") else "Booleans are written True / False and the empty value None (capital first letter)."
        return f"Python doesn't know '{n}'. Check the spelling and capitals, or create the variable (name = value) before you use it."
    if kind in ("SyntaxError",):
        if "never closed" in m or "unmatched" in m or "does not match" in m:
            return "Check your brackets: every ( [ { needs a matching ) ] }."
        if "expected ':'" in m:
            return "Lines that start a block (if, elif, else, for, while, def, class, try) must end with a colon :"
        if "Maybe you meant '=='" in m or "cannot assign" in m:
            return "Use == to compare values. A single = stores a value in a variable."
        if "unterminated string" in m:
            return "A text string is missing its closing quote."
        return "Python couldn't read this line. Look for typos, missing brackets, quotes or colons."
    if kind == "IndentationError":
        return "Python uses indentation (4 spaces) to group lines. Lines inside if/for/while/def must be indented the same amount."
    if kind == "TypeError":
        if "needs a whole number" in m:
            return ""
        if "can only concatenate str" in m or "unsupported operand type(s) for +: 'int' and 'str'" in m:
            return "You can't add text and numbers. Convert with str(number) or int(text), or use an f-string: f\"{value}\"."
        if "not callable" in m:
            return "You used ( ) on something that isn't a function."
        if "takes" in m and "positional argument" in m:
            return "The number of values you passed doesn't match the function's parameters."
        if "NoneType" in m:
            return "Something is None. Did a function forget to `return` a value?"
        return "A value has the wrong type for this operation."
    if kind == "IndexError":
        return "Indexes start at 0, so the last item is at len(my_list) - 1."
    if kind == "KeyError":
        return "That key isn't in the dictionary. Check spelling, or use my_dict.get(key)."
    if kind == "ValueError" and "invalid literal for int()" in m:
        return "That text isn't a whole number, so int() can't convert it. A try/except can handle it."
    if kind == "ZeroDivisionError":
        return "You can't divide by zero."
    if kind == "AttributeError":
        return "That value doesn't have this method or property. Check the spelling, or the type of the value."
    if kind == "RecursionError":
        return "A function keeps calling itself without stopping."
    if kind == "UnboundLocalError":
        return "Inside a function, you used a variable before giving it a value."
    return ""


def _syntax_info(e):
    kind = type(e).__name__
    return {"kind": kind, "line": e.lineno or 1, "col": (e.offset or 1),
            "msg": e.msg, "hint": _hint(kind, e.msg)}


# ---------------------------------------------------------------------
#  AST -> JSON  (for the Blockly mirror)
# ---------------------------------------------------------------------
def _to_json(node):
    if isinstance(node, ast.AST):
        d = {"_t": type(node).__name__}
        for f in node._fields:
            d[f] = _to_json(getattr(node, f, None))
        if hasattr(node, "lineno"):
            d["lineno"] = node.lineno
        if isinstance(node, ast.Constant):
            d["repr"] = repr(node.value)[:60]
            d["vt"] = type(node.value).__name__
        return d
    if isinstance(node, list):
        return [_to_json(x) for x in node]
    if node is None or isinstance(node, (bool, int, float, str)):
        if isinstance(node, float) and (node != node or node in (float("inf"), float("-inf"))):
            return repr(node)
        if isinstance(node, int) and not isinstance(node, bool) and abs(node) > 2**53:
            return {"_t": "BigInt", "repr": str(node)}
        return node
    return repr(node)


def parse_code(code):
    try:
        tree = ast.parse(code, "<player>")
        return json.dumps({"ok": True, "ast": _to_json(tree)})
    except SyntaxError as e:
        return json.dumps({"ok": False, "error": _syntax_info(e)})


# ---------------------------------------------------------------------
#  Static requirements (checked against the learner's AST)
# ---------------------------------------------------------------------
def _call_name(call):
    f = call.func
    if isinstance(f, ast.Name): return f.id
    if isinstance(f, ast.Attribute): return f.attr
    return None


def _static_checks(tree, code, level):
    fails = []
    nodes = list(ast.walk(tree))
    calls = [n for n in nodes if isinstance(n, ast.Call)]
    for req in level.get("requires", []):
        ok = True
        if "node" in req:
            ok = any(type(n).__name__ == req["node"] for n in nodes)
        elif "call" in req:
            ok = any(_call_name(c) == req["call"] for c in calls)
        elif "varArg" in req:
            ok = any(_call_name(c) == req["varArg"] and c.args and isinstance(c.args[0], ast.Name) for c in calls)
        elif "regex" in req:
            ok = len(re.findall(req["regex"], code, re.M)) >= req.get("min", 1)
        if not ok: fails.append(req["msg"])
    for fb in level.get("forbid", []):
        if "node" in fb and any(type(n).__name__ == fb["node"] for n in nodes):
            fails.append(fb["msg"])
        if "literalArg" in fb and any(_call_name(c) == fb["literalArg"] and c.args and isinstance(c.args[0], ast.Constant) for c in calls):
            fails.append(fb["msg"])
    for name, limit in (level.get("maxCalls") or {}).items():
        count = sum(1 for c in calls if _call_name(c) == name)
        if count > limit:
            fails.append(f"Use at most {limit} call{'s' if limit != 1 else ''} to {name}() in your code (you have {count}). Let a loop or function do the repeating.")
    return fails


# ---------------------------------------------------------------------
#  Run learner code on one layout
# ---------------------------------------------------------------------
def _run_layout(code_obj, tree, code, level, layout):
    W = World(layout)
    g = {"__name__": "__main__", "__builtins__": _make_api(W)}
    error, crashed, timeout = None, False, False

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<player>":
            return None
        if event == "line":
            W.line_events += 1
            if W.line_events > MAX_LINE_EVENTS:
                raise _Halt("timeout")
            W.events.append({"t": "line", "line": frame.f_lineno,
                             "scope": frame.f_code.co_name, "vars": _snapshot(frame)})
        return tracer

    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(200)
    try:
        sys.settrace(tracer)
        exec(code_obj, g)
    except _Halt as h:
        if str(h) == "crash": crashed = True
        else: timeout = True
    except Exception as e:
        sys.settrace(None)
        line, tb = None, e.__traceback__
        while tb:
            if tb.tb_frame.f_code.co_filename == "<player>": line = tb.tb_lineno
            tb = tb.tb_next
        kind = type(e).__name__
        error = {"kind": kind, "line": line, "msg": str(e), "hint": _hint(kind, str(e))}
    finally:
        sys.settrace(None)
        sys.setrecursionlimit(old_limit)

    if timeout:
        kept, cut = [], 0
        for ev in W.events:
            if ev["t"] == "line":
                cut += 1
                if cut > KEEP_ON_TIMEOUT: break
            kept.append(ev)
        W.events = kept
        last = next((e["line"] for e in reversed(kept) if e["t"] == "line"), None)
        error = {"kind": "InfiniteLoop", "line": last,
                 "msg": f"Your program ran more than {MAX_LINE_EVENTS} lines without finishing.",
                 "hint": "This usually means a loop never stops. Check that the loop's condition eventually becomes False (for example, that a counter is updated inside the loop)."}
    if error:
        W.events.append({"t": "error", **error})

    failures = []
    if not error and not crashed:
        if W.goal is not None and level.get("needGoal", True) and (W.x, W.y) != W.goal:
            failures.append(f"The program finished at {(W.x, W.y)}, but the portal is at {W.goal}.")
        if W.total_crystals and level.get("collectAll", True) and W.crystals:
            failures.append(f"Collected {W.collected} of {W.total_crystals} crystals. Use collect() while standing on each crystal.")
        expected = layout.get("expectOutput", level.get("expectOutput"))
        if expected is not None:
            got = "".join(W.output).rstrip("\n").split("\n") if W.output else []
            got = [s.rstrip() for s in got]
            if got != expected:
                failures.append("Printed output doesn't match. Expected:\n  " + "\n  ".join(expected) +
                                "\nGot:\n  " + ("\n  ".join(got) if got else "(nothing printed)"))
        for chk in level.get("checks", []):
            try:
                ok = eval(chk["expr"], g)
            except Exception:
                ok = False
            if not ok: failures.append(chk["msg"])

    return {"events": W.events, "crashed": crashed, "error": error,
            "failures": failures, "success": not error and not crashed and not failures,
            "final": [W.x, W.y, W.dir], "collected": W.collected,
            "output": "".join(W.output)}


def run_level(payload_json):
    p = json.loads(payload_json)
    code, level = p["code"], p["level"]
    try:
        tree = ast.parse(code, "<player>")
    except SyntaxError as e:
        return json.dumps({"syntax": _syntax_info(e)})
    static_fails = _static_checks(tree, code, level)
    safe = ast.fix_missing_locations(_Sanitize().visit(ast.parse(code, "<player>")))
    code_obj = compile(safe, "<player>", "exec")
    results = [_run_layout(code_obj, tree, code, level, lay) for lay in p["layouts"]]
    return json.dumps({"layouts": results, "static": static_fails})
