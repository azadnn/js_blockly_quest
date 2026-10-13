// =====================================================================
//  CURRICULUM — 40 missions, 8 chapters
//  Grid legend:  #  asteroid   .  open lane   S  start   G  portal   C  crystal
//  Directions:   N E S W        Beacons: { "x,y": "value" }
// =====================================================================
const CHAPTERS = [
  { title: "Launch: Commands", theme: 0 },
  { title: "Memory: Variables & Types", theme: 1 },
  { title: "Decisions: Conditionals", theme: 2 },
  { title: "Repetition: Loops", theme: 3 },
  { title: "Collections: Lists", theme: 4 },
  { title: "Lookup: Tuples & Dicts", theme: 5 },
  { title: "Reuse: Functions", theme: 6 },
  { title: "Mastery: Advanced Python", theme: 7 },
];

const API_DOCS = {
  move_forward: { insert: "move_forward()", sig: "move_forward(steps=1)", desc: "Fly forward 1 cell, or `steps` cells." },
  turn_left: { insert: "turn_left()", sig: "turn_left()", desc: "Rotate 90° counter-clockwise (from the pilot's view)." },
  turn_right: { insert: "turn_right()", sig: "turn_right()", desc: "Rotate 90° clockwise (from the pilot's view)." },
  is_path_ahead: { insert: "is_path_ahead()", sig: "is_path_ahead() → bool", desc: "True if the next cell ahead is open." },
  is_path_left: { insert: "is_path_left()", sig: "is_path_left() → bool", desc: "True if the cell on your left is open." },
  is_path_right: { insert: "is_path_right()", sig: "is_path_right() → bool", desc: "True if the cell on your right is open." },
  at_goal: { insert: "at_goal()", sig: "at_goal() → bool", desc: "True when the rocket is on the portal." },
  collect: { insert: "collect()", sig: "collect() → bool", desc: "Pick up a crystal on this cell. Returns True if one was collected." },
  read_beacon: { insert: "read_beacon()", sig: "read_beacon() → str | None", desc: "Read the beacon on this cell. Always returns text (str), or None if there's no beacon." },
  get_position: { insert: "get_position()", sig: "get_position() → (x, y)", desc: "Returns the rocket's position as a tuple (x, y)." },
  get_heading: { insert: "get_heading()", sig: "get_heading() → str", desc: 'Returns "N", "E", "S" or "W".' },
  print: { insert: 'print("")', sig: "print(value, ...)", desc: "Show values in the terminal." },
};

const LEVELS = [
  // ───────────────────────── CHAPTER 1: COMMANDS ─────────────────────────
  {
    chapter: 0, concept: "Calling functions", title: "Ignition",
    lesson: `Welcome, cadet! In block coding you snapped together a **move forward** block. In Python you **call a function** by typing its name followed by parentheses:

~~~
move_forward()
~~~

- Python runs your lines **from top to bottom**, one at a time.
- Spelling and capital letters matter: \`Move_Forward()\` is not the same as \`move_forward()\`.
- Lines that start with \`#\` are **comments**. Python ignores them. They're notes for humans.

Watch the read-only **Blocks** panel: it rebuilds itself from your Python as you type.`,
    task: "Fly the rocket 5 cells forward into the portal.",
    api: ["move_forward"],
    starter: `# Each line is one instruction.\n# Add more lines to reach the portal!\nmove_forward()\nmove_forward()\n`,
    hints: ["Count the open cells between the rocket and the portal.", "You need move_forward() five times, each on its own line."],
    solution: `move_forward()\nmove_forward()\nmove_forward()\nmove_forward()\nmove_forward()\n`,
    layouts: [{ dir: "E", grid: ["########", "########", "########", "#S....G#", "########", "########", "########", "########"] }],
  },
  {
    chapter: 0, concept: "Sequencing", title: "Turn Signals",
    lesson: `The rocket can rotate on the spot:

~~~
turn_left()    # rotate 90° counter-clockwise
turn_right()   # rotate 90° clockwise
~~~

Turns are **relative to the rocket**, not the screen. Imagine sitting in the cockpit: "left" is the pilot's left.

The **order** of your lines is the order things happen. That's called **sequencing**.

 Use **Step** to run one line at a time and watch what each line does.`,
    task: "Fly north, take the left turn, then the right turn to reach the portal.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `move_forward()\nmove_forward()\nmove_forward()\n# Now turn and keep going...\n`,
    hints: ["After 3 moves north, turn_left() points the rocket west.", "West 2 cells, then turn_right() to face north again, then 2 more moves."],
    solution: `move_forward()\nmove_forward()\nmove_forward()\nturn_left()\nmove_forward()\nmove_forward()\nturn_right()\nmove_forward()\nmove_forward()\n`,
    layouts: [{ dir: "N", grid: ["########", "#G######", "#.######", "#...####", "###.####", "###.####", "###S####", "########"] }],
  },
  {
    chapter: 0, concept: "Arguments", title: "Long-Range Thrusters",
    lesson: `Some functions accept values inside their parentheses. These values are called **arguments**:

~~~
move_forward(5)   # fly 5 cells in one command
move_forward()    # no argument means the default: 1 cell
~~~

Arguments let one function do many different jobs. \`print("hi")\` is another function call with an argument.`,
    task: "Reach the portal using move_forward at most 3 times. Give each call an argument.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `move_forward(5)\n# keep going...\n`,
    hints: ["The lanes are 5, 3 and 5 cells long.", "move_forward(5), turn_right(), move_forward(3), turn_right(), move_forward(5)"],
    solution: `move_forward(5)\nturn_right()\nmove_forward(3)\nturn_right()\nmove_forward(5)\n`,
    maxCalls: { move_forward: 3 },
    layouts: [{ dir: "E", grid: ["##########", "#S.....###", "######.###", "######.###", "#G.....###", "##########"] }],
  },
  {
    chapter: 0, concept: "Debugging", title: "Debug: Scrambled Signal", debug: true,
    lesson: `Every programmer writes bugs. **Debugging** means finding and fixing them. Python errors tell you the **line number** and the **kind** of problem:

- **SyntaxError**: Python can't read the line (for example, a missing bracket).
- **NameError**: Python doesn't know that name (a typo, or wrong capital letters).
- **Logic bug**: there's no error message, but the program does the wrong thing.

 \`turn_right\` without \`()\` does **not** call the function! It just names it, and nothing happens.

Fix one error, run again, and repeat.`,
    task: "Three bugs are hiding in this flight plan. Find them all and reach the portal.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `# Three bugs are hiding here. Run, read the error, fix, repeat!\nmove_forward(2)\nturn_right\nMove_forward(3)\nturn_left()\nmove_forward(4\n`,
    hints: ["Line 6 is missing a closing bracket ).", "Line 4 has a capital M. Line 3 is missing its () so the turn never happens."],
    solution: `move_forward(2)\nturn_right()\nmove_forward(3)\nturn_left()\nmove_forward(4)\n`,
    layouts: [{ dir: "E", grid: ["########", "#S..####", "###.####", "###.####", "###....G", "########"] }],
  },
  {
    chapter: 0, concept: "Comments", title: "Silence the Noise",
    lesson: `A **comment** starts with \`#\`. Python ignores everything after it on that line.

~~~
# This whole line is a comment
move_forward()   # a comment can also follow code
# turn_left()    <- "commented out": this line won't run
~~~

Programmers often **comment out** code to switch it off without deleting it. Notice that commented-out lines disappear from the Blocks panel!`,
    task: 'Two flight plans got mixed together. Comment out every line marked "# B" by putting # at the start of it. Don\'t delete them!',
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `move_forward(4)   # A\nturn_left()       # B\nturn_right()      # A\nmove_forward(2)   # A\nmove_forward(1)   # B\nturn_left()       # A\nturn_right()      # B\nmove_forward(3)   # A\n`,
    hints: ["Put # at the very start of each line that ends with # B.", "There are three B lines: lines 2, 5 and 7."],
    solution: `move_forward(4)   # A\n# turn_left()       # B\nturn_right()      # A\nmove_forward(2)   # A\n# move_forward(1)   # B\nturn_left()       # A\n# turn_right()      # B\nmove_forward(3)   # A\n`,
    requires: [{ regex: "^\\s*#.*#\\s*B\\s*$", min: 3, msg: "Comment out the three \"# B\" lines (put # in front) instead of deleting them." }],
    layouts: [{ dir: "E", grid: ["##########", "#S....####", "#####.####", "#####...G#", "##########", "##########"] }],
  },

  // ───────────────────────── CHAPTER 2: VARIABLES & TYPES ─────────────────────────
  {
    chapter: 1, concept: "Variables", title: "Memory Banks",
    lesson: `A **variable** is a named box that stores a value:

~~~
jump = 3          # create the variable jump and store 3 in it
move_forward(jump)   # Python replaces jump with 3
~~~

- \`=\` means **store** (assign). It does not mean "equals" like in math.
- Names use lowercase_with_underscores, and can't start with a number.
- Change the value in **one** place and every use updates.

Use **Step** and open the **Memory** tab to see your variables live.`,
    task: "Every lane here is 3 cells long. Store 3 in a variable called jump and use move_forward(jump) for every move.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `jump = 3\n\nmove_forward(jump)\nturn_left()\n# finish the flight using jump\n`,
    hints: ["The pattern is: move, turn left, move, turn right, move, turn left, move.", "Every move is move_forward(jump)."],
    solution: `jump = 3\nmove_forward(jump)\nturn_left()\nmove_forward(jump)\nturn_right()\nmove_forward(jump)\nturn_left()\nmove_forward(jump)\n`,
    requires: [{ varArg: "move_forward", msg: "Pass the variable to move_forward, like move_forward(jump)." }],
    forbid: [{ literalArg: "move_forward", msg: "Use the variable jump instead of typing numbers into move_forward()." }],
    checks: [{ expr: "isinstance(jump, int)", msg: "Create a variable named jump that holds a whole number." }],
    layouts: [{ dir: "E", grid: ["##########", "##########", "#######G##", "#######.##", "#######.##", "####....##", "####.#####", "####.#####", "#S...#####", "##########"] }],
  },
  {
    chapter: 1, concept: "Updating variables", title: "Spiral Out",
    lesson: `A variable can **change** while the program runs. Python works out the right side first, then stores the result:

~~~
dist = 1
dist = dist + 1   # take dist (1), add 1, store 2 back in dist
dist += 1         # shortcut: same as dist = dist + 1
~~~

Math operators: \`+  -  *  /\`, plus \`//\` (whole-number divide), \`%\` (remainder) and \`**\` (power).`,
    task: "Fly the spiral. Each lane is 1 cell longer than the last (1, 2, 3, 4, 5). Use one variable dist and increase it after each lane.",
    api: ["move_forward", "turn_right"],
    starter: `dist = 1\nmove_forward(dist)\nturn_right()\ndist = dist + 1   # now dist is 2\nmove_forward(dist)\nturn_right()\n# keep growing dist...\n`,
    hints: ["Repeat the pattern: increase dist, move_forward(dist), turn_right().", "The last lane is 5 cells long, so dist should reach 5."],
    solution: `dist = 1\nmove_forward(dist)\nturn_right()\ndist += 1\nmove_forward(dist)\nturn_right()\ndist += 1\nmove_forward(dist)\nturn_right()\ndist += 1\nmove_forward(dist)\nturn_right()\ndist += 1\nmove_forward(dist)\n`,
    forbid: [{ literalArg: "move_forward", msg: "Always use move_forward(dist). Change dist instead of typing numbers." }],
    checks: [{ expr: "dist == 5", msg: "dist should finish at 5." }],
    layouts: [{ dir: "E", grid: ["#########", "#########", "##.....G#", "##.######", "##.#S.###", "##.##.###", "##....###", "#########", "#########"] }],
  },
  {
    chapter: 1, concept: "Arithmetic", title: "Fuel Math",
    lesson: `Python is a powerful calculator:

~~~
17 / 3    # 5.666...  normal division always gives a decimal
17 // 3   # 5         floor division: whole part only
17 % 3    # 2         modulo: the remainder
2 ** 3    # 8         power
~~~

Store results in variables: \`jumps = fuel // burn\`.`,
    task: "You have 17 fuel and each jump burns 3. Calculate jumps (how many whole jumps) and leftover (the remainder). Fly jumps cells, turn right, then fly leftover cells.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `fuel = 17\nburn = 3\n\njumps = 0      # calculate this with //\nleftover = 0   # calculate this with %\n\nmove_forward(jumps)\nturn_right()\nmove_forward(leftover)\n`,
    hints: ["jumps = fuel // burn", "leftover = fuel % burn"],
    solution: `fuel = 17\nburn = 3\njumps = fuel // burn\nleftover = fuel % burn\nmove_forward(jumps)\nturn_right()\nmove_forward(leftover)\n`,
    requires: [{ node: "FloorDiv", msg: "Calculate jumps with the // operator." }, { node: "Mod", msg: "Calculate leftover with the % operator." }],
    checks: [{ expr: "jumps == 5 and leftover == 2", msg: "jumps should be 5 and leftover should be 2." }],
    layouts: [{ dir: "E", grid: ["########", "########", "#S.....#", "######.#", "######G#", "########"] }],
  },
  {
    chapter: 1, concept: "Strings & f-strings", title: "Hello, Mission Control",
    lesson: `Text in Python is called a **string** (\`str\`). Write it inside quotes:

~~~
pilot = "Nova"
print("Hello " + pilot)        # + joins strings: Hello Nova
print(f"Hi {pilot}!")          # f-string: {} inserts a value
print("Crew:", 3)              # commas print values separated by spaces
~~~

**f-strings** (put \`f\` before the quote) are the easiest way to mix text and numbers.`,
    task: 'Create pilot = "Nova", ship = "Comet" and crew = 3. Print exactly: Nova commands the Comet with 3 crew. Use an f-string. Then fly 3 cells to the portal.',
    api: ["move_forward", "print"],
    starter: `pilot = "Nova"\n# create ship and crew\n\nprint(f"{pilot} commands the ...")\n`,
    hints: ['ship = "Comet" and crew = 3 (a number, no quotes).', 'print(f"{pilot} commands the {ship} with {crew} crew")'],
    solution: `pilot = "Nova"\nship = "Comet"\ncrew = 3\nprint(f"{pilot} commands the {ship} with {crew} crew")\nmove_forward(3)\n`,
    requires: [{ node: "JoinedStr", msg: "Use an f-string, like f\"... {ship} ...\"" }],
    checks: [{ expr: "pilot == 'Nova' and ship == 'Comet' and crew == 3", msg: 'Variables needed: pilot = "Nova", ship = "Comet", crew = 3 (a number).' }],
    expectOutput: ["Nova commands the Comet with 3 crew"],
    layouts: [{ dir: "E", grid: ["#######", "#######", "#S..G##", "#######", "#######"] }],
  },
  {
    chapter: 1, concept: "Data types", title: "Cargo Inspection",
    lesson: `Every value has a **type**:

~~~
crates = 12        # int:   whole number
mass = 4.5         # float: decimal number
cargo = "ice"      # str:   text
fragile = True     # bool:  True or False
type(mass)         # <class 'float'>
~~~

Mixing types follows rules: \`int * float\` gives a \`float\`. The Memory tab shows each variable's type.`,
    task: "Create crates = 12, mass = 4.5, cargo = \"ice\", fragile = True. Calculate total = crates * mass. Print f\"Total mass: {total}\", then print(type(total)). Fly 3 to the portal.",
    api: ["move_forward", "print"],
    starter: `crates = 12\n# create mass, cargo and fragile\n\ntotal = 0   # crates times mass\n\nprint(f"Total mass: {total}")\nprint(type(total))\nmove_forward(3)\n`,
    hints: ["mass = 4.5, cargo = \"ice\", fragile = True (capital T, no quotes).", "total = crates * mass gives 54.0"],
    solution: `crates = 12\nmass = 4.5\ncargo = "ice"\nfragile = True\ntotal = crates * mass\nprint(f"Total mass: {total}")\nprint(type(total))\nmove_forward(3)\n`,
    checks: [
      { expr: "type(crates) is int and type(mass) is float", msg: "crates must be an int (12) and mass a float (4.5)." },
      { expr: "type(cargo) is str and type(fragile) is bool", msg: 'cargo must be a str ("ice") and fragile a bool (True).' },
    ],
    expectOutput: ["Total mass: 54.0", "<class 'float'>"],
    layouts: [{ dir: "E", grid: ["#######", "#######", "#S..G##", "#######", "#######"] }],
  },
  {
    chapter: 1, concept: "Type conversion", title: "Decode the Beacon",
    lesson: `Data from sensors, files and users usually arrives as **text**. \`read_beacon()\` always returns a \`str\`, such as \`"4"\`. You must **convert** it before doing math:

~~~
text = read_beacon()   # "4"   (str)
steps = int(text)      # 4     (int)
str(10)                # "10"
float("2.5")           # 2.5
~~~

This mission has **several layouts**, and your code must work on all of them. Read the beacon; don't guess the number!`,
    task: "Read the beacon you're sitting on. It tells you how far away the portal is. Convert it to an int and fly that far.",
    api: ["move_forward", "read_beacon", "print"],
    starter: `text = read_beacon()\nprint(text)\nmove_forward(text)   # text is a str!\n`,
    hints: ["move_forward needs an int, so convert with int(text).", "steps = int(read_beacon()) then move_forward(steps)"],
    solution: `steps = int(read_beacon())\nmove_forward(steps)\n`,
    requires: [{ call: "int", msg: "Convert the beacon text with int()." }, { call: "read_beacon", msg: "Read the distance with read_beacon()." }],
    layouts: [
      { dir: "E", beacons: { "1,2": "3" }, grid: ["#########", "#########", "#S..G...#", "#########", "#########"] },
      { dir: "E", beacons: { "1,2": "5" }, grid: ["#########", "#########", "#S....G.#", "#########", "#########"] },
      { dir: "E", beacons: { "1,2": "6" }, grid: ["#########", "#########", "#S.....G#", "#########", "#########"] },
    ],
  },
  {
    chapter: 1, concept: "Debugging types", title: "Debug: Type Trouble", debug: true,
    lesson: `A **TypeError** means a value has the wrong type for an operation:

~~~
"3" + 2            # TypeError: can't add str and int
int("3") + 2       # 5
"Jumping " + 5     # TypeError
f"Jumping {5}"     # "Jumping 5"
~~~

Use **Step** and watch the types in the Memory tab to see where things go wrong.`,
    task: "Fix the type bugs. The program must print Jumping N cells (where N is the beacon number + 2) and then fly N cells.",
    api: ["move_forward", "read_beacon", "print"],
    starter: `distance = read_beacon()\ntotal = distance + 2\nprint("Jumping " + total + " cells")\nmove_forward(total)\n`,
    hints: ["distance is a str. Wrap read_beacon() with int().", 'Print with an f-string: print(f"Jumping {total} cells")'],
    solution: `distance = int(read_beacon())\ntotal = distance + 2\nprint(f"Jumping {total} cells")\nmove_forward(total)\n`,
    layouts: [
      { dir: "E", beacons: { "1,2": "3" }, expectOutput: ["Jumping 5 cells"], grid: ["#########", "#########", "#S....G.#", "#########", "#########"] },
      { dir: "E", beacons: { "1,2": "1" }, expectOutput: ["Jumping 3 cells"], grid: ["#########", "#########", "#S..G...#", "#########", "#########"] },
    ],
  },

  // ───────────────────────── CHAPTER 3: CONDITIONALS ─────────────────────────
  {
    chapter: 2, concept: "if statements", title: "Fork in the Lane",
    lesson: `An **if statement** runs code only when a condition is \`True\`:

~~~
if is_path_right():
    turn_right()        # runs only if the condition is True
move_forward(2)         # not indented, so this always runs
~~~

- The line ends with a **colon** \`:\`
- The code inside is **indented 4 spaces**. Indentation is how Python knows what belongs to the if. It works like the mouth of a C-shaped block.

This mission has 2 layouts. One program must solve both!`,
    task: "Fly 2 cells. If there's a path on the right, turn right. Then fly 2 more cells.",
    api: ["move_forward", "turn_left", "turn_right", "is_path_right", "is_path_ahead"],
    starter: `move_forward(2)\n\n# if there's a path on the right, turn right\n\nmove_forward(2)\n`,
    hints: ["if is_path_right():", "Indent turn_right() by 4 spaces under the if line."],
    solution: `move_forward(2)\nif is_path_right():\n    turn_right()\nmove_forward(2)\n`,
    requires: [{ node: "If", msg: "Use an if statement to decide whether to turn." }],
    layouts: [
      { dir: "E", grid: ["#######", "#######", "#######", "#S...G#", "#######", "#######", "#######"] },
      { dir: "E", grid: ["#######", "#######", "#######", "#S..###", "###.###", "###G###", "#######"] },
    ],
  },
  {
    chapter: 2, concept: "if / else", title: "T-Junction",
    lesson: `\`else\` gives the program a **second path**, for when the condition is \`False\`:

~~~
if is_path_left():
    turn_left()
else:
    turn_right()
~~~

Exactly **one** of the two blocks runs, never both. Notice \`else:\` has no condition, and it needs a colon too.`,
    task: "Fly to the junction (3 cells). Turn left if that way is open, otherwise turn right. Then fly 2 cells.",
    api: ["move_forward", "turn_left", "turn_right", "is_path_left", "is_path_right"],
    starter: `move_forward(3)\n\n# decide: left or right?\n\nmove_forward(2)\n`,
    hints: ["if is_path_left(): turn_left() ... else: turn_right()", "Remember the colons and the 4-space indents."],
    solution: `move_forward(3)\nif is_path_left():\n    turn_left()\nelse:\n    turn_right()\nmove_forward(2)\n`,
    requires: [{ node: "If", msg: "Use if / else to choose the direction." }],
    layouts: [
      { dir: "N", grid: ["#######", "#######", "#######", "#G..###", "###.###", "###.###", "###S###", "#######"] },
      { dir: "N", grid: ["#######", "#######", "#######", "###..G#", "###.###", "###.###", "###S###", "#######"] },
    ],
  },
  {
    chapter: 2, concept: "elif & comparison", title: "Signal Colors",
    lesson: `**Comparison operators** produce \`True\` or \`False\`:

~~~
==  equal      !=  not equal
<   less       >   greater      <=   >=
~~~

Use \`elif\` ("else if") to check several options in order:

~~~
if signal == "red":
    turn_left()
elif signal == "blue":
    turn_right()
else:
    print("straight on")
~~~

 \`=\` stores a value, while \`==\` compares two values.`,
    task: 'At the crossroads, read the beacon. "red" means turn left, "blue" means turn right, "green" means go straight. Then fly 2 cells.',
    api: ["move_forward", "turn_left", "turn_right", "read_beacon", "print"],
    starter: `move_forward(3)\nsignal = read_beacon()\nprint("Signal:", signal)\n\n# decide using if / elif\n\nmove_forward(2)\n`,
    hints: ['if signal == "red":', 'Add elif signal == "blue": for the right turn. Green needs no turn at all.'],
    solution: `move_forward(3)\nsignal = read_beacon()\nif signal == "red":\n    turn_left()\nelif signal == "blue":\n    turn_right()\nmove_forward(2)\n`,
    requires: [{ call: "read_beacon", msg: "Read the signal with read_beacon()." }, { node: "If", msg: "Use if / elif to react to the signal." }],
    layouts: [
      { dir: "N", beacons: { "3,3": "red" }, grid: ["#######", "###.###", "###.###", "#G....#", "###.###", "###.###", "###S###", "#######"] },
      { dir: "N", beacons: { "3,3": "green" }, grid: ["#######", "###G###", "###.###", "#.....#", "###.###", "###.###", "###S###", "#######"] },
      { dir: "N", beacons: { "3,3": "blue" }, grid: ["#######", "###.###", "###.###", "#....G#", "###.###", "###.###", "###S###", "#######"] },
    ],
  },
  {
    chapter: 2, concept: "and / or / not", title: "Logic Gates",
    lesson: `Combine conditions with **logical operators**:

~~~
a and b    # True only if BOTH are True
a or b     # True if AT LEAST ONE is True
not a      # flips True <-> False
~~~

Example:

~~~
if is_path_ahead() and read_beacon() != "danger":
    move_forward(3)
~~~`,
    task: 'At the checkpoint (2 cells ahead), go straight only if the path ahead is open AND the beacon isn\'t "danger". Otherwise turn left. Either way, then fly 3 cells.',
    api: ["move_forward", "turn_left", "turn_right", "is_path_ahead", "read_beacon"],
    starter: `move_forward(2)\n\n# combine two conditions with and\n\nmove_forward(3)\n`,
    hints: ['if is_path_ahead() and read_beacon() != "danger":', "Inside that if, do nothing special (use pass), or flip it: if not (...): turn_left()"],
    solution: `move_forward(2)\nif is_path_ahead() and read_beacon() != "danger":\n    pass\nelse:\n    turn_left()\nmove_forward(3)\n`,
    requires: [{ node: "BoolOp", msg: "Combine the two conditions with and / or." }],
    layouts: [
      { dir: "E", beacons: { "3,4": "clear" }, grid: ["########", "###.####", "###.####", "###.####", "#S....G#", "########"] },
      { dir: "E", beacons: { "3,4": "danger" }, grid: ["########", "###G####", "###.####", "###.####", "#S....##", "########"] },
      { dir: "E", beacons: { "3,4": "clear" }, grid: ["########", "###G####", "###.####", "###.####", "#S..####", "########"] },
    ],
  },
  {
    chapter: 2, concept: "Debugging conditionals", title: "Debug: Logic Leak", debug: true,
    lesson: `The most common if-statement bugs:

- Using \`=\` instead of \`==\` in a condition.
- Forgetting the colon \`:\` at the end of \`if\`, \`elif\` or \`else\`.
- Wrong indentation: code that should be inside the block isn't indented.

Python reports these as **SyntaxError** or **IndentationError**, with the line number.`,
    task: "Repair the signal-reading program from Signal Colors so it works on every layout.",
    api: ["move_forward", "turn_left", "turn_right", "read_beacon"],
    starter: `move_forward(3)\nsignal = read_beacon()\nif signal = "red"\n    turn_left()\nelif signal == "blue":\nturn_right()\nmove_forward(2)\n`,
    hints: ['Line 3 should be: if signal == "red":', "Indent turn_right() on line 6 by 4 spaces."],
    solution: `move_forward(3)\nsignal = read_beacon()\nif signal == "red":\n    turn_left()\nelif signal == "blue":\n    turn_right()\nmove_forward(2)\n`,
    layoutsFrom: 15,
  },

  // ───────────────────────── CHAPTER 4: LOOPS ─────────────────────────
  {
    chapter: 3, concept: "for loops", title: "Crystal Corridor",
    lesson: `The **repeat** block becomes a **for loop** in Python:

~~~
for i in range(6):
    move_forward()
    collect()
~~~

- \`range(6)\` produces 0, 1, 2, 3, 4, 5. That's 6 numbers, so the loop runs 6 times.
- The indented lines are the **loop body**.
- \`i\` holds the current count. Watch it change in the Memory tab!`,
    task: "Collect every crystal on the way to the portal. You may call move_forward and collect only once each, so use a loop.",
    api: ["move_forward", "collect"],
    starter: `for i in range(1):\n    move_forward()\n`,
    hints: ["The portal is 6 cells away, so use range(6).", "Put collect() inside the loop, indented like move_forward()."],
    solution: `for i in range(6):\n    move_forward()\n    collect()\n`,
    requires: [{ node: "For", msg: "Use a for loop." }],
    maxCalls: { move_forward: 1, collect: 1 },
    layouts: [{ dir: "E", grid: ["#########", "#########", "#SCCCCCG#", "#########", "#########"] }],
  },
  {
    chapter: 3, concept: "Loop variables & range", title: "Spiral Revisited",
    lesson: `The loop variable changes each time around, and you can **use** it:

~~~
for dist in range(1, 6):   # 1, 2, 3, 4, 5  (start, stop - stop isn't included)
    print(dist)
~~~

\`range(start, stop, step)\`. For example, \`range(0, 10, 2)\` gives 0, 2, 4, 6, 8.

Remember the spiral from the variables chapter? It took 14 lines. Now try it with a loop.`,
    task: "Fly the spiral (lanes of 1, 2, 3, 4, 5) using a for loop. Only one move_forward call is allowed!",
    api: ["move_forward", "turn_right"],
    starter: `for dist in range(1, 2):\n    print(dist)\n`,
    hints: ["range(1, 6) gives 1 to 5.", "In the loop body: move_forward(dist) then turn_right()."],
    solution: `for dist in range(1, 6):\n    move_forward(dist)\n    turn_right()\n`,
    requires: [{ node: "For", msg: "Use a for loop." }],
    maxCalls: { move_forward: 1 },
    layoutsFrom: 7,
  },
  {
    chapter: 3, concept: "Nested loops", title: "Perimeter Patrol",
    lesson: `A loop can live **inside** another loop. The inner loop runs completely, every time the outer loop runs once:

~~~
for side in range(4):        # 4 sides
    for step in range(3):    # 3 steps on each side
        move_forward()
    turn_right()             # once per side
~~~

Look at the indentation: \`turn_right()\` belongs to the **outer** loop only.`,
    task: "Patrol the square, collecting all 11 crystals, and finish back on the portal where you started. Use nested loops (one call each to move_forward, collect and turn_right).",
    api: ["move_forward", "turn_right", "collect"],
    starter: `for side in range(4):\n    # inner loop here\n    turn_right()\n`,
    hints: ["Each side is 3 steps long.", "Inner loop: for step in range(3): move_forward() then collect()"],
    solution: `for side in range(4):\n    for step in range(3):\n        move_forward()\n        collect()\n    turn_right()\n`,
    maxCalls: { move_forward: 1, collect: 1, turn_right: 1 },
    layouts: [{ dir: "E", goal: [2, 2], grid: ["########", "########", "##SCCC##", "##C##C##", "##C##C##", "##CCCC##", "########", "########"] }],
  },
  {
    chapter: 3, concept: "while loops", title: "Unknown Distance",
    lesson: `A **while loop** repeats **as long as** its condition is True. It's useful when you don't know how many repeats you'll need:

~~~
while not at_goal():
    move_forward()
~~~

The condition is checked **before** each repeat. If the condition never becomes False, you get an **infinite loop**.`,
    task: "The portal distance changes between 3 layouts. Use a while loop to fly until you reach it.",
    api: ["move_forward", "at_goal", "is_path_ahead"],
    starter: `while False:\n    move_forward()\n`,
    hints: ["Loop while you're NOT at the goal.", "while not at_goal():"],
    solution: `while not at_goal():\n    move_forward()\n`,
    requires: [{ node: "While", msg: "Use a while loop." }],
    maxCalls: { move_forward: 1 },
    layouts: [
      { dir: "E", grid: ["##########", "##########", "#S..G....#", "##########"] },
      { dir: "E", grid: ["##########", "##########", "#S....G..#", "##########"] },
      { dir: "E", grid: ["##########", "##########", "#S......G#", "##########"] },
    ],
  },
  {
    chapter: 3, concept: "Loops + decisions", title: "Autopilot",
    lesson: `Combine loops and conditionals and your program can react to **any** path:

~~~
while not at_goal():
    if is_path_ahead():
        move_forward()
    elif is_path_left():
        turn_left()
    else:
        turn_right()
~~~

This is your first real **algorithm**: a set of rules that works on maps you've never seen.`,
    task: "Write an autopilot that follows any winding tunnel to the portal. It must work on both layouts.",
    api: ["move_forward", "turn_left", "turn_right", "is_path_ahead", "is_path_left", "is_path_right", "at_goal"],
    starter: `while not at_goal():\n    # decide what to do on each step\n    move_forward()\n`,
    hints: ["Inside the loop: if path ahead, move. Otherwise turn toward the open side.", "Use if / elif / else with is_path_ahead() and is_path_left()."],
    solution: `while not at_goal():\n    if is_path_ahead():\n        move_forward()\n    elif is_path_left():\n        turn_left()\n    else:\n        turn_right()\n`,
    requires: [{ node: "While", msg: "Use a while loop." }, { node: "If", msg: "Use if statements inside the loop." }],
    layouts: [
      { dir: "E", grid: ["########", "#S...###", "####.###", "##...###", "##.#####", "##....##", "#####G##", "########"] },
      { dir: "N", grid: ["########", "#....G##", "#.######", "#.######", "#...####", "###.####", "###S####", "########"] },
    ],
  },
  {
    chapter: 3, concept: "break & continue", title: "Crystal Hunt",
    lesson: `Two keywords control loops from the inside:

~~~
for i in range(10):
    move_forward()
    if collect():
        break        # leave the loop right now
~~~

- \`break\` exits the loop immediately.
- \`continue\` skips to the next repeat.

\`collect()\` **returns** True when it picked up a crystal, so you can use it directly as a condition.`,
    task: "One crystal is hidden somewhere in the corridor. Fly until you collect it, break out of the loop, then turn right and fly 2 to the portal below.",
    api: ["move_forward", "turn_right", "collect"],
    starter: `for i in range(7):\n    move_forward()\n    # stop the loop once you collect the crystal\n\nturn_right()\nmove_forward(2)\n`,
    hints: ["if collect(): break", "Both lines go inside the loop, after move_forward()."],
    solution: `for i in range(7):\n    move_forward()\n    if collect():\n        break\nturn_right()\nmove_forward(2)\n`,
    requires: [{ node: "Break", msg: "Use break to leave the loop when the crystal is found." }],
    layouts: [
      { dir: "E", grid: ["##########", "#S.C.....#", "###.######", "###G######", "##########"] },
      { dir: "E", grid: ["##########", "#S...C...#", "#####.####", "#####G####", "##########"] },
      { dir: "E", grid: ["##########", "#S.....C.#", "#######.##", "#######G##", "##########"] },
    ],
  },
  {
    chapter: 3, concept: "Debugging loops", title: "Debug: Endless Orbit", debug: true,
    lesson: `An **infinite loop** never stops. The academy stops your program after 4000 lines. The usual causes:

- A counter that's never updated **inside** the loop.
- A condition that can never become False.

Use **Step** and watch the counter in the Memory tab. Is it changing?`,
    task: "The patrol should fly around the square once (collecting 3 crystals) and stop back on the portal. Fix the loop.",
    api: ["move_forward", "turn_right", "collect"],
    starter: `sides = 0\nwhile sides < 4:\n    move_forward(2)\n    collect()\n    turn_right()\nsides = sides + 1\n`,
    hints: ["Step through and watch sides in the Memory tab. Does it ever change?", "Indent sides = sides + 1 so it's inside the loop."],
    solution: `sides = 0\nwhile sides < 4:\n    move_forward(2)\n    collect()\n    turn_right()\n    sides = sides + 1\n`,
    layouts: [{ dir: "E", goal: [1, 1], grid: ["#####", "#S.C#", "#.#.#", "#C.C#", "#####"] }],
  },

  // ───────────────────────── CHAPTER 5: LISTS ─────────────────────────
  {
    chapter: 4, concept: "Lists", title: "Flight Plan",
    lesson: `A **list** stores many values, in order, in one variable:

~~~
route = [4, 3, 2, 1]
for distance in route:      # visits each item in turn
    move_forward(distance)
~~~

Lists use square brackets, and their items are separated by commas. They can hold any type: \`["a", "b"]\`, \`[True, 3.5]\`.`,
    task: "Fly the route [4, 3, 2, 1], turning left after each lane. Use a for loop over the list (only one move_forward call).",
    api: ["move_forward", "turn_left"],
    starter: `route = [4, 3, 2, 1]\n\n# loop over the route\n`,
    hints: ["for distance in route:", "Body: move_forward(distance) then turn_left()"],
    solution: `route = [4, 3, 2, 1]\nfor distance in route:\n    move_forward(distance)\n    turn_left()\n`,
    requires: [{ node: "List", msg: "Store the route in a list." }, { node: "For", msg: "Loop over the list with for." }],
    maxCalls: { move_forward: 1 },
    layouts: [{ dir: "E", grid: ["########", "########", "########", "###...##", "###G#.##", "#####.##", "#S....##", "########"] }],
  },
  {
    chapter: 4, concept: "Indexing & len()", title: "Codebook",
    lesson: `Each list item has a numbered position called an **index**. Indexes start at **0**!

~~~
codes = ["alpha", "bravo", "charlie"]
codes[0]      # "alpha"   first item
codes[-1]     # "charlie" negative indexes count from the end
len(codes)    # 3         how many items
codes[1:3]    # ["bravo", "charlie"]  a slice
~~~`,
    task: "Print the first code, then the last code, then the number of codes. Then fly len(codes) cells to the portal.",
    api: ["move_forward", "print"],
    starter: `codes = ["alpha", "bravo", "charlie", "delta"]\n\n# print first, last, and how many\n`,
    hints: ["print(codes[0]) then print(codes[-1])", "print(len(codes)) and move_forward(len(codes))"],
    solution: `codes = ["alpha", "bravo", "charlie", "delta"]\nprint(codes[0])\nprint(codes[-1])\nprint(len(codes))\nmove_forward(len(codes))\n`,
    requires: [{ node: "Subscript", msg: "Use indexes like codes[0]." }, { call: "len", msg: "Use len() to count the codes." }],
    expectOutput: ["alpha", "delta", "4"],
    layouts: [{ dir: "E", grid: ["########", "########", "#S...G##", "########", "########"] }],
  },
  {
    chapter: 4, concept: "append & building lists", title: "Sensor Log",
    lesson: `Lists can **grow** while the program runs:

~~~
readings = []              # an empty list
readings.append(7)         # [7]
readings.append(3)         # [7, 3]
sum(readings)              # 10
max(readings)              # 7
~~~

\`.append()\` is a **method**: a function that belongs to a value, called with a dot.`,
    task: "Fly 5 cells. After each move, read the beacon, convert it to int and append it to a list called readings. At the end, print(readings) and then print(sum(readings)).",
    api: ["move_forward", "read_beacon", "print"],
    starter: `readings = []\nfor i in range(5):\n    move_forward()\n    # read, convert, append\n\nprint(readings)\n`,
    hints: ["readings.append(int(read_beacon()))", "After the loop (not indented): print(sum(readings))"],
    solution: `readings = []\nfor i in range(5):\n    move_forward()\n    readings.append(int(read_beacon()))\nprint(readings)\nprint(sum(readings))\n`,
    requires: [{ call: "append", msg: "Add values with readings.append(...)." }],
    layouts: [
      { dir: "E", beacons: { "2,2": "3", "3,2": "1", "4,2": "4", "5,2": "1", "6,2": "5" }, expectOutput: ["[3, 1, 4, 1, 5]", "14"], grid: ["########", "########", "#S....G#", "########"] },
      { dir: "E", beacons: { "2,2": "2", "3,2": "7", "4,2": "1", "5,2": "8", "6,2": "2" }, expectOutput: ["[2, 7, 1, 8, 2]", "20"], grid: ["########", "########", "#S....G#", "########"] },
    ],
  },
  {
    chapter: 4, concept: "Strings as sequences", title: "Command Tape",
    lesson: `A string is a **sequence of characters**, so you can loop over it just like a list:

~~~
for letter in "FLR":
    print(letter)     # F, then L, then R
~~~

Here, the beacon holds a whole flight plan as text. **F** = forward, **L** = turn left, **R** = turn right. You're writing a tiny **interpreter**!`,
    task: "Read the plan from the beacon and run it: F moves forward 1, L turns left, R turns right. It must work on both layouts.",
    api: ["move_forward", "turn_left", "turn_right", "read_beacon", "print"],
    starter: `plan = read_beacon()\nprint("Plan:", plan)\nfor command in plan:\n    print(command)\n    # act on each command\n`,
    hints: ['if command == "F": move_forward()', 'Add elif command == "L": turn_left() and elif command == "R": turn_right()'],
    solution: `plan = read_beacon()\nfor command in plan:\n    if command == "F":\n        move_forward()\n    elif command == "L":\n        turn_left()\n    elif command == "R":\n        turn_right()\n`,
    requires: [{ node: "For", msg: "Loop over the characters of the plan." }],
    maxCalls: { move_forward: 1 },
    layouts: [
      { dir: "E", beacons: { "1,1": "FFRFFLFF" }, grid: ["########", "#S..####", "###.####", "###..G##", "########", "########", "########", "########"] },
      { dir: "E", beacons: { "1,6": "FLFFRFFF" }, grid: ["########", "########", "########", "########", "##...G##", "##.#####", "#S.#####", "########"] },
    ],
  },
  {
    chapter: 4, concept: "Debugging lists", title: "Debug: Off by One", debug: true,
    lesson: `**Off-by-one** errors are classic list bugs:

~~~
items = [10, 20, 30]       # valid indexes are 0, 1, 2
items[3]                   # IndexError: list index out of range
range(len(items))          # 0, 1, 2  (exactly right)
range(1, len(items) + 1)   # 1, 2, 3  (off by one!)
~~~`,
    task: "This program should fly each distance in route, turning right after each lane. Fix the loop's range.",
    api: ["move_forward", "turn_right"],
    starter: `route = [2, 3, 2]\nfor i in range(1, len(route) + 1):\n    move_forward(route[i])\n    turn_right()\n`,
    hints: ["The first index is 0, not 1.", "range(len(route)) gives 0, 1, 2."],
    solution: `route = [2, 3, 2]\nfor i in range(len(route)):\n    move_forward(route[i])\n    turn_right()\n`,
    layouts: [{ dir: "E", grid: ["######", "#S..##", "###.##", "###.##", "#G..##", "######"] }],
  },

  // ───────────────────────── CHAPTER 6: TUPLES & DICTS ─────────────────────────
  {
    chapter: 5, concept: "Tuples & unpacking", title: "Coordinates",
    lesson: `A **tuple** is like a list that can't be changed. It's written with parentheses:

~~~
pos = get_position()   # for example (3, 2)
x, y = pos             # "unpacking": x = 3, y = 2
print(f"x={x} y={y}")
~~~

Coordinates start at (0, 0) in the **top-left** corner. **x** grows to the right and **y** grows downward.`,
    task: "The portal is always at x = 7. Use get_position() to work out how far away it is, then fly there with a single move_forward call. No loops this time: use math!",
    api: ["move_forward", "get_position", "print"],
    starter: `x, y = get_position()\nprint("I am at", x, y)\n\n# how far to x = 7?\n`,
    hints: ["The distance is 7 - x.", "move_forward(7 - x)"],
    solution: `x, y = get_position()\nmove_forward(7 - x)\n`,
    requires: [{ call: "get_position", msg: "Use get_position()." }],
    forbid: [{ node: "While", msg: "Solve this one with math, not a while loop." }, { node: "For", msg: "Solve this one with math, not a loop." }],
    maxCalls: { move_forward: 1 },
    layouts: [
      { dir: "E", grid: ["#########", "#########", "#S.....G#", "#########"] },
      { dir: "E", grid: ["#########", "#########", "#..S...G#", "#########"] },
      { dir: "E", grid: ["#########", "#########", "#....S.G#", "#########"] },
    ],
  },
  {
    chapter: 5, concept: "Dictionaries", title: "Star Chart",
    lesson: `A **dictionary** maps **keys** to **values**, like a real dictionary maps words to meanings:

~~~
distances = {"alpha": 2, "beta": 4}
distances["beta"]          # 4
distances["gamma"] = 6     # add a new key
"alpha" in distances       # True
~~~

Dictionaries can often replace long if/elif chains.`,
    task: 'The beacon names a sector. Sector "alpha" is 2 cells away, "beta" is 4 and "gamma" is 6. Use a dictionary lookup (no if statements!) to fly the right distance.',
    api: ["move_forward", "read_beacon", "print"],
    starter: `distances = {"alpha": 2}\nsector = read_beacon()\nprint("Sector:", sector)\n`,
    hints: ['distances = {"alpha": 2, "beta": 4, "gamma": 6}', "move_forward(distances[sector])"],
    solution: `distances = {"alpha": 2, "beta": 4, "gamma": 6}\nsector = read_beacon()\nmove_forward(distances[sector])\n`,
    requires: [{ node: "Dict", msg: "Create a dictionary." }, { node: "Subscript", msg: "Look the value up with distances[sector]." }],
    forbid: [{ node: "If", msg: "Use the dictionary instead of if statements." }],
    layouts: [
      { dir: "E", beacons: { "1,2": "alpha" }, grid: ["#########", "#########", "#S.G....#", "#########"] },
      { dir: "E", beacons: { "1,2": "beta" }, grid: ["#########", "#########", "#S...G..#", "#########"] },
      { dir: "E", beacons: { "1,2": "gamma" }, grid: ["#########", "#########", "#S.....G#", "#########"] },
    ],
  },
  {
    chapter: 5, concept: "Dict methods & loops", title: "Cargo Manifest",
    lesson: `Loop over a dictionary's keys **and** values with \`.items()\`:

~~~
cargo = {"ice": 4, "ore": 7}
cargo["ore"] += 1             # update a value
cargo["gems"] = 3             # add a key
for item, qty in cargo.items():
    print(f"{item}: {qty}")
sum(cargo.values())           # total of all values
~~~`,
    task: "Add gems: 3 to the manifest and increase ore by 1. Then print every line as item: qty, followed by Total: N. Finally fly 2 to the portal.",
    api: ["move_forward", "print"],
    starter: `manifest = {"ice": 4, "ore": 7, "fuel": 2}\n\n# update, then print each line and the total\n`,
    hints: ['manifest["gems"] = 3 and manifest["ore"] += 1', 'for item, qty in manifest.items(): print(f"{item}: {qty}")  then  print(f"Total: {sum(manifest.values())}")'],
    solution: `manifest = {"ice": 4, "ore": 7, "fuel": 2}\nmanifest["gems"] = 3\nmanifest["ore"] += 1\nfor item, qty in manifest.items():\n    print(f"{item}: {qty}")\nprint(f"Total: {sum(manifest.values())}")\nmove_forward(2)\n`,
    requires: [{ call: "items", msg: "Loop with manifest.items()." }],
    checks: [{ expr: "manifest == {'ice': 4, 'ore': 8, 'fuel': 2, 'gems': 3}", msg: "manifest should end as {'ice': 4, 'ore': 8, 'fuel': 2, 'gems': 3}." }],
    expectOutput: ["ice: 4", "ore: 8", "fuel: 2", "gems: 3", "Total: 17"],
    layouts: [{ dir: "E", grid: ["######", "######", "#S.G##", "######"] }],
  },

  // ───────────────────────── CHAPTER 7: FUNCTIONS ─────────────────────────
  {
    chapter: 6, concept: "Defining functions", title: "Staircase",
    lesson: `You've been **calling** functions all along. Now **define** your own, a bit like making a custom block:

~~~
def step_up():          # define it (nothing happens yet!)
    move_forward()
    turn_left()

step_up()               # call it: now its body runs
step_up()
~~~

Define a function once, then reuse it anywhere. Function names follow the same rules as variable names.`,
    task: "Climb the 4-step staircase. Define a function step_up() that climbs one step (move, turn left, move, turn right), then call it 4 times.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `def step_up():\n    move_forward()\n    # finish the step\n\nstep_up()\n`,
    hints: ["Body: move_forward(), turn_left(), move_forward(), turn_right()", "Call step_up() 4 times, or in a loop."],
    solution: `def step_up():\n    move_forward()\n    turn_left()\n    move_forward()\n    turn_right()\n\nfor i in range(4):\n    step_up()\n`,
    requires: [{ node: "FunctionDef", msg: "Define a function with def." }],
    maxCalls: { turn_left: 1, move_forward: 2 },
    layouts: [{ dir: "E", grid: ["########", "########", "########", "#####G##", "####..##", "###..###", "##..####", "#S.#####", "########"] }],
  },
  {
    chapter: 6, concept: "Parameters", title: "Mining Run",
    lesson: `**Parameters** let a function take inputs:

~~~
def mine(steps):              # steps is a parameter
    for i in range(steps):
        move_forward()
        collect()

mine(3)                       # steps = 3 this time
mine(2)                       # steps = 2 this time
~~~

When you Step into a function, the Memory tab shows its **own** local variables.`,
    task: "Collect every crystal. Define mine(steps) to fly and collect, then use it for each lane (3, then 2, then 4). Only one collect call is allowed.",
    api: ["move_forward", "turn_left", "turn_right", "collect"],
    starter: `def mine(steps):\n    pass   # replace with a loop\n\nmine(3)\n`,
    hints: ["Inside mine: for i in range(steps): move_forward() then collect()", "mine(3), turn_right(), mine(2), turn_left(), mine(4)"],
    solution: `def mine(steps):\n    for i in range(steps):\n        move_forward()\n        collect()\n\nmine(3)\nturn_right()\nmine(2)\nturn_left()\nmine(4)\n`,
    requires: [{ node: "FunctionDef", msg: "Define a function with def." }, { node: "arg", msg: "Give your function a parameter, like def mine(steps):" }],
    maxCalls: { collect: 1 },
    layouts: [{ dir: "E", grid: ["##########", "#SCCC#####", "####C#####", "####CCCCG#", "##########"] }],
  },
  {
    chapter: 6, concept: "return values", title: "Fuel Calculator",
    lesson: `A function can send a value **back** with \`return\`:

~~~
def double(n):
    return n * 2

answer = double(5)     # answer = 10
move_forward(double(1))
~~~

\`return\` ends the function immediately. A function without \`return\` gives back \`None\`.`,
    task: "Write fuel_needed(distance), which returns distance * 3 + 2. Print fuel_needed(4), then fly fuel_needed(1) cells to the portal. The academy will test your function too!",
    api: ["move_forward", "print"],
    starter: `def fuel_needed(distance):\n    pass   # return the formula\n\nprint(fuel_needed(4))\n`,
    hints: ["return distance * 3 + 2", "move_forward(fuel_needed(1)) flies 5 cells."],
    solution: `def fuel_needed(distance):\n    return distance * 3 + 2\n\nprint(fuel_needed(4))\nmove_forward(fuel_needed(1))\n`,
    requires: [{ node: "Return", msg: "Use return to send back the result." }],
    checks: [{ expr: "fuel_needed(0) == 2 and fuel_needed(10) == 32 and fuel_needed(7) == 23", msg: "Test failed: fuel_needed(0) should be 2, fuel_needed(10) should be 32, fuel_needed(7) should be 23." }],
    expectOutput: ["14"],
    layouts: [{ dir: "E", grid: ["########", "########", "#S....G#", "########"] }],
  },
  {
    chapter: 6, concept: "Debugging functions", title: "Debug: Lost Return", debug: true,
    lesson: `Common function bugs:

- **No return**: the function calculates a value but never sends it back, so the caller gets \`None\`.
- **Not called**: writing \`turn_around\` without \`()\` does nothing.
- **Defined after use**: in Python, \`def\` must run **before** you call the function.`,
    task: "Fly 4 cells, turn around, then fly back 2 cells to the portal. Fix the functions.",
    api: ["move_forward", "turn_left", "turn_right"],
    starter: `def double(n):\n    result = n * 2\n\ndef turn_around():\n    turn_left()\n    turn_left()\n\nmove_forward(double(2))\nturn_around\nmove_forward(double(1))\n`,
    hints: ["double never returns its result. Add: return result", "turn_around needs () to actually be called."],
    solution: `def double(n):\n    result = n * 2\n    return result\n\ndef turn_around():\n    turn_left()\n    turn_left()\n\nmove_forward(double(2))\nturn_around()\nmove_forward(double(1))\n`,
    layouts: [{ dir: "E", grid: ["########", "########", "########", "#S.G..##", "########", "########"] }],
  },

  // ───────────────────────── CHAPTER 8: MASTERY ─────────────────────────
  {
    chapter: 7, concept: "try / except", title: "Static Shield",
    lesson: `Some errors are **expected**, such as corrupted data. Handle them instead of crashing:

~~~
try:
    jump = int(read_beacon())
except ValueError:
    jump = 1           # runs only if int() failed
~~~

Catch **specific** errors (like \`ValueError\`) so that real bugs still show up.`,
    task: 'Three beacons give jump distances. Some broadcast "static", which means jump 1. Read 3 times: convert, fly, and handle the static with try/except.',
    api: ["move_forward", "read_beacon", "print"],
    starter: `for i in range(3):\n    jump = int(read_beacon())\n    move_forward(jump)\n`,
    hints: ["Wrap the int(...) line in try: and add except ValueError:", "In the except block: jump = 1"],
    solution: `for i in range(3):\n    try:\n        jump = int(read_beacon())\n    except ValueError:\n        jump = 1\n    move_forward(jump)\n`,
    requires: [{ node: "Try", msg: "Use try / except." }],
    layouts: [
      { dir: "E", beacons: { "1,2": "2", "3,2": "static", "4,2": "3" }, grid: ["#########", "#########", "#S.....G#", "#########"] },
      { dir: "E", beacons: { "1,2": "static", "2,2": "4", "6,2": "1" }, grid: ["#########", "#########", "#S.....G#", "#########"] },
    ],
  },
  {
    chapter: 7, concept: "String methods & comprehensions", title: "Garbled Transmission",
    lesson: `Strings have handy **methods**:

~~~
"  Hi ".strip()          # "Hi"     removes surrounding spaces
"LEFT".lower()           # "left"
"a,b,c".split(",")       # ["a", "b", "c"]
~~~

A **list comprehension** builds a list in one line:

~~~
clean = [w.strip().lower() for w in words]
~~~

It reads as: "w cleaned up, for each w in words".`,
    task: "The beacon sends messy turns like \" Right, left ,RIGHT\". Split it, clean each word with a list comprehension, then for each turn: fly 2 and make that turn. Finish with one last fly 2.",
    api: ["move_forward", "turn_left", "turn_right", "read_beacon", "print"],
    starter: `message = read_beacon()\nprint(repr(message))\nturns = message.split(",")\nprint(turns)\n`,
    hints: ['turns = [t.strip().lower() for t in message.split(",")]', 'for t in turns: move_forward(2), then if t == "right": turn_right() else: turn_left(). After the loop: move_forward(2)'],
    solution: `message = read_beacon()\nturns = [t.strip().lower() for t in message.split(",")]\nfor t in turns:\n    move_forward(2)\n    if t == "right":\n        turn_right()\n    else:\n        turn_left()\nmove_forward(2)\n`,
    requires: [{ call: "split", msg: "Split the message with .split(\",\")." }, { node: "ListComp", msg: "Clean the words with a list comprehension." }],
    layouts: [
      { dir: "E", beacons: { "1,1": " Right, left ,RIGHT" }, grid: ["########", "#S..####", "###.####", "###...##", "#####.##", "#####G##", "########"] },
      { dir: "E", beacons: { "1,7": "LEFT , right,right " }, grid: ["########", "########", "########", "########", "########", "###...##", "###.#.##", "#S..#G##", "########"] },
    ],
  },
  {
    chapter: 7, concept: "Classes & objects", title: "Navigator Class",
    lesson: `A **class** is a blueprint that bundles data (**attributes**) with functions (**methods**):

~~~
class Navigator:
    def __init__(self):        # runs when the object is created
        self.distance = 0

    def fly(self, steps):
        move_forward(steps)
        self.distance += steps

nav = Navigator()              # create an object
nav.fly(3)
print(nav.distance)            # 3
~~~

\`self\` means "this particular object".`,
    task: "Create the Navigator class and an object nav. Fly 3, turn right, fly 2, turn left, fly 4, always using nav.fly(). Then print f\"Total distance: {nav.distance}\".",
    api: ["move_forward", "turn_left", "turn_right", "print"],
    starter: `class Navigator:\n    def __init__(self):\n        self.distance = 0\n\n    def fly(self, steps):\n        move_forward(steps)\n        # keep count in self.distance\n\nnav = Navigator()\n`,
    hints: ["Inside fly: self.distance += steps", 'nav.fly(3), turn_right(), nav.fly(2), turn_left(), nav.fly(4), then print(f"Total distance: {nav.distance}")'],
    solution: `class Navigator:\n    def __init__(self):\n        self.distance = 0\n\n    def fly(self, steps):\n        move_forward(steps)\n        self.distance += steps\n\nnav = Navigator()\nnav.fly(3)\nturn_right()\nnav.fly(2)\nturn_left()\nnav.fly(4)\nprint(f"Total distance: {nav.distance}")\n`,
    requires: [{ node: "ClassDef", msg: "Define a class with class Navigator:" }],
    maxCalls: { move_forward: 1 },
    checks: [{ expr: "isinstance(nav, Navigator) and nav.distance == 9", msg: "nav must be a Navigator whose distance ends at 9." }],
    expectOutput: ["Total distance: 9"],
    layouts: [{ dir: "E", grid: ["##########", "#S...#####", "####.#####", "####....G#", "##########"] }],
  },
  {
    chapter: 7, concept: "Putting it all together", title: "Final Mission: The Labyrinth",
    lesson: `Time to use everything you've learned. The **right-hand rule** solves any maze whose walls are all connected: keep your right hand on the wall and walk.

~~~
def step():
    if is_path_right():
        turn_right()
        move_forward()
    elif is_path_ahead():
        ...
~~~

Break the problem into small functions, loop until you're at the goal, and collect everything along the way.`,
    task: "Escape both labyrinths and collect every crystal. Use a function and a while loop.",
    api: ["move_forward", "turn_left", "turn_right", "is_path_ahead", "is_path_left", "is_path_right", "at_goal", "collect"],
    starter: `def step():\n    # right-hand rule:\n    # 1) right open? turn right and move\n    # 2) ahead open? move\n    # 3) left open? turn left and move\n    # 4) otherwise turn around\n    pass\n\nwhile not at_goal():\n    step()\n    collect()\n`,
    hints: ["Use if / elif / elif / else inside step().", "Turning around is two turn_left() calls."],
    solution: `def step():\n    if is_path_right():\n        turn_right()\n        move_forward()\n    elif is_path_ahead():\n        move_forward()\n    elif is_path_left():\n        turn_left()\n        move_forward()\n    else:\n        turn_left()\n        turn_left()\n\nwhile not at_goal():\n    step()\n    collect()\n`,
    requires: [{ node: "FunctionDef", msg: "Define at least one function." }, { node: "While", msg: "Use a while loop." }],
    layouts: [
      { dir: "N", grid: ["#########", "#C..#..G#", "#.#.#.###", "#.#...#C#", "#.###.#.#", "#...#...#", "###.#.###", "#S..#...#", "#########"] },
      { dir: "N", grid: ["#########", "#...#.C.#", "#.#.#.#.#", "#.#...#.#", "#.#####.#", "#.#C#...#", "#.#.#.#.#", "#S#...#G#", "#########"] },
    ],
  },
];

// Resolve shared layouts, normalise
LEVELS.forEach((lv, i) => {
  if (lv.layoutsFrom) lv.layouts = LEVELS[lv.layoutsFrom - 1].layouts;
  lv.number = i + 1;
  lv.id = "m" + String(i + 1).padStart(2, "0");
});
CHAPTERS.forEach((ch, ci) => {
  const idx = LEVELS.map((l, i) => (l.chapter === ci ? i + 1 : 0)).filter(Boolean);
  ch.start = idx[0]; ch.end = idx[idx.length - 1];
});

if (typeof module !== "undefined") module.exports = { LEVELS, CHAPTERS, API_DOCS };
