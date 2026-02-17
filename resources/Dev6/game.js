/*
game.js for Perlenspiel 3.3.x
Last revision: 2022-03-15 (BM)

Perlenspiel is a scheme by Professor Moriarty (bmoriarty@wpi.edu).
This version of Perlenspiel (3.3.x) is hosted at <https://ps3.perlenspiel.net>
Perlenspiel is Copyright © 2009-22 Brian Moriarty.
This file is part of the standard Perlenspiel 3.3.x devkit distribution.

Perlenspiel is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Perlenspiel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You may have received a copy of the GNU Lesser General Public License
along with the Perlenspiel devkit. If not, see <http://www.gnu.org/licenses/>.
*/

/*
This JavaScript file is a template for creating new Perlenspiel 3.3.x games.
Any unused event-handling function templates can be safely deleted.
Refer to the tutorials and documentation at <https://ps3.perlenspiel.net> for details.
*/

/*
The following comment lines are for JSHint <https://jshint.com>, a tool for monitoring code quality.
You may find them useful if your development environment is configured to support JSHint.
If you don't use JSHint (or are using it with a configuration file), you can safely delete these two lines.
*/

/* jshint browser : true, devel : true, esversion : 6, freeze : true */
/* globals PS : true */

"use strict"; // Do NOT remove this directive!

/*
PS.init( system, options )
Called once after engine is initialized but before event-polling begins.
This function doesn't have to do anything, although initializing the grid dimensions with PS.gridSize() is recommended.
If PS.grid() is not called, the default grid dimensions (8 x 8 beads) are applied.
Any value returned is ignored.
[system : Object] = A JavaScript object containing engine and host platform information properties; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

/*
Laser Mirror Game
* */
const EMPTY = 0;
const WALL = 1;
const MIRROR_FWD = 2;
const MIRROR_BACK = 3;
const EMITTER = 4;
const TARGET = 5;

const W = 11;
const H = 11;

let grid = [];

let emitters = [];           // array of {x,y,dx,dy}
let targets = [];            // array of {x,y}
let targetHit = [];          // boolean per target

let beamTimer = null;
let pulseTimer = null;

let beamStates = [];         // [{ path:[{x,y}], i:0 }, ...]
let solved = false;
let currentLevel = 0;

let beamSet = new Set();

let targetPos = { x: -1, y: -1 };

PS.init = function() {
    // Uncomment the following code line
    // to verify operation:

    // PS.debug( "PS.init() called\n" );

    // This function should normally begin
    // with a call to PS.gridSize( x, y )
    // where x and y are the desired initial
    // dimensions of the grid.
    // Call PS.gridSize() FIRST to avoid problems!
    // The sample call below sets the grid to the
    // default dimensions (8 x 8).
    // Uncomment the following code line and change
    // the x and y parameters as needed.

    PS.gridSize(11, 11);
    PS.border(PS.ALL, PS.ALL, 0);
    PS.gridColor(30, 30, 30);
    PS.statusText("Laser Logic");
    PS.audioLoad("fx_beep");
    PS.audioLoad("fx_tada");

    loadLevel(0);

    // buildLevel();
    // drawGrid();
    // fireLaser();
    //resetGame();
};

const LEVELS = [
    // Level 1:
    {
        name: "Warm-up",
        emitters: [
            { x: 1, y: 5, dx: 1, dy: 0 }
        ],
        targets: [
            { x: 9, y: 3 }
        ],
        mirrors: [
            { x: 6, y: 5, t: MIRROR_BACK },
            { x: 6, y: 3, t: MIRROR_BACK }
        ],
        walls: []
    },

    // Level 2: Two flips teaches chaining (right -> up -> right)
    {
        name: "Dual Ducts",
        emitters: [
            { x: 1, y: 9, dx: 1, dy: 0 },   // Laser A (bottom-left -> right)
            { x: 9, y: 9, dx: 0, dy: -1 }   // Laser B (bottom-right -> up)
        ],

        targets: [
            { x: 9, y: 1 },  // Target A (top-right)
            { x: 1, y: 1 }   // Target B (top-left)
        ],

        mirrors: [
            // Laser A route: right -> up -> right -> up
            { x: 5, y: 9, t: MIRROR_BACK }, // flip to "/" to send RIGHT -> UP
            { x: 5, y: 2, t: MIRROR_FWD  }, // fixed "/" sends UP -> RIGHT
            { x: 9, y: 2, t: MIRROR_BACK }, // flip to "/" sends RIGHT -> UP into (9,1)

            // Laser B route: up -> left -> up
            { x: 9, y: 6, t: MIRROR_FWD  }, // flip to "\" sends UP -> LEFT
            { x: 1, y: 6, t: MIRROR_BACK }  // "\" sends LEFT -> UP into (1,1)
        ],

        // Walls that add structure but NEVER sit on beam-path tiles.
        walls: [
            // Block some “tempting” empty space (visual challenge)
            { x: 3, y: 8 }, { x: 3, y: 7 }, { x: 3, y: 5 },
            { x: 7, y: 8 }, { x: 7, y: 7 },

            // Frame around the (5,2) corner without blocking beam tiles
            { x: 4, y: 1 }, { x: 4, y: 3 },
            { x: 6, y: 3 }, { x: 8, y: 8 },

            // Frame around the mid “crossing” area (don’t place walls on x=5,y=6 or x=8,y=6 etc.)
            { x: 6, y: 7 }
        ]
    },

    {
        name: "Cross Ducts (Clean & Solvable)",
        emitters: [
            { x: 1, y: 5, dx: 1, dy: 0 },
            { x: 9, y: 5, dx: -1, dy: 0 }
        ],

        targets: [
            { x: 7, y: 1 },
            { x: 3, y: 9 }
        ],

        mirrors: [
            // Shared central mirror (must flip)
            { x: 5, y: 5, t: MIRROR_BACK },

            // Laser A path
            { x: 5, y: 4, t: MIRROR_BACK },
            { x: 7, y: 4, t: MIRROR_BACK },

            // Laser B path
            { x: 5, y: 6, t: MIRROR_BACK },
            { x: 3, y: 6, t: MIRROR_BACK },

            // Two decoys (not on solution path)
            { x: 2, y: 4, t: MIRROR_FWD },
            { x: 8, y: 6, t: MIRROR_FWD }
        ],

        walls: [
            // Only decorative — none touch solution path

            { x: 2, y: 2 }, { x: 3, y: 2 },
            { x: 0, y: 2 }, { x: 8, y: 2 },

            { x: 2, y: 8 }, { x: 8, y: 8 },

            { x: 4, y: 3 }, { x: 6, y: 7 }
        ]
    }



]

    // --------------------- CORE LOOP --------------------------------------
function loadLevel(index) {
    stopBeam();
    stopPulse();

    currentLevel = index;
    solved = false;

    const L = LEVELS[currentLevel];

    grid = makeBaseGrid();

    placeEmitters(L.emitters);     // NEW
    placeTargets(L.targets);       // NEW
    placeWalls(L.walls);
    placeMirrors(L.mirrors);

    drawGrid();
    startPulseTargets();
    fireLasersAnimated();
}

function nextLevel() {
    if (currentLevel + 1 < LEVELS.length) {
        loadLevel(currentLevel + 1);
    } else {
        // Simple end screen via status + keeping grid
        stopPulse();
        PS.statusText("All puzzles cleared!");
        PS.audioPlay("fx_tada");
    }
}

function makeBaseGrid() {
    const g = [];
    for (let y = 0; y < H; y++) {
        const row = [];
        for (let x = 0; x < W; x++) {
            // Border walls
            if (x === 0 || y === 0 || x === W - 1 || y === H - 1) row.push(WALL);
            else row.push(EMPTY);
        }
        g.push(row);
    }
    return g;
}

function placeEmitters(list) {
    emitters = list.map(e => ({ ...e }));
    for (const e of emitters) {
        grid[e.y][e.x] = EMITTER;
    }
}

function placeTargets(list) {
    targets = list.map(t => ({ ...t }));
    targetHit = targets.map(_ => false);
    for (const t of targets) {
        grid[t.y][t.x] = TARGET;
    }
}

function placeWalls(walls) {
    if (!walls) return;
    for (const w of walls) {
        grid[w.y][w.x] = WALL;
    }
}

function placeMirrors(mirrors) {
    if (!mirrors) return;
    for (const m of mirrors) {
        grid[m.y][m.x] = m.t;
    }
}

// -------------------- DRAWING --------------------
//

function drawCell(x, y) {
    const tile = grid[y][x];

    PS.glyph(x, y, "");
    PS.alpha(x, y, 255);
    PS.border(x, y, 0);

    switch (tile) {
        case EMPTY:
            PS.color(x, y, 60, 60, 60);
            break;

        case WALL:
            PS.color(x, y, 20, 20, 20);
            break;

        case MIRROR_FWD:
            PS.color(x, y, 0, 210, 230);
            PS.glyph(x, y, "/");
            PS.border(x, y, 2);
            PS.borderColor(x, y, 0, 255, 255);
            break;

        case MIRROR_BACK:
            PS.color(x, y, 0, 180, 210);
            PS.glyph(x, y, "\\");
            PS.border(x, y, 2);
            PS.borderColor(x, y, 0, 255, 255);
            break;

        case EMITTER: {
            PS.color(x, y, 220, 40, 40);

            // find emitter direction for this cell
            const e = emitters.find(em => em.x === x && em.y === y);
            const dx = e ? e.dx : 1;
            const dy = e ? e.dy : 0;

            PS.glyph(x, y, dirGlyph(dx, dy));
            break;
        }

        case TARGET:
            PS.color(x, y, 40, 200, 40);
            PS.glyph(x, y, "*");
            break;
    }
}

function drawGrid() {
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            drawCell(x, y);
        }
    }
    updateStatus();
}

function updateStatus() {
    const L = LEVELS[currentLevel];
    if (solved) {
        PS.statusText(`Solved! Click the target to continue.`);
    } else {
        PS.statusText(`Level ${currentLevel + 1}: ${L.name}`);
    }
}

function dirGlyph(dx, dy) {
    if (dx === 1 && dy === 0) return ">";
    if (dx === -1 && dy === 0) return "<";
    if (dx === 0 && dy === 1) return "v";
    return "^";
}

//
// -------------------- TARGET PULSE (discoverability) --------------------
//

function startPulseTargets() {
    let up = true;
    pulseTimer = PS.timerStart(6, function () {
        if (solved) return;
        for (let k = 0; k < targets.length; k++) {
            if (targetHit[k]) continue;
            const t = targets[k];
            PS.alpha(t.x, t.y, up ? 220 : 140);
        }
        up = !up;
    });
}

function stopPulse() {
    if (pulseTimer !== null) {
        PS.timerStop(pulseTimer);
        pulseTimer = null;
    }
}

//
// -------------------- LASER (animated + safe) --------------------
//

function stopBeam() {
    if (beamTimer !== null) {
        PS.timerStop(beamTimer);
        beamTimer = null;
    }
}

function clearBeamVisual() {
    // Redraw everything to erase beam coloring
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            drawCell(x, y);
        }
    }
}

function computeBeamPath(fromEmitter) {
    const path = [];
    let x = fromEmitter.x;
    let y = fromEmitter.y;
    let dx = fromEmitter.dx;
    let dy = fromEmitter.dy;

    let steps = 0;
    const STEP_LIMIT = 220;

    while (steps++ < STEP_LIMIT) {
        x += dx;
        y += dy;

        if (x < 0 || x >= W || y < 0 || y >= H) return { path, hitIndex: -1 };

        const tile = grid[y][x];
        if (tile === WALL) return { path, hitIndex: -1 };

        path.push({ x, y });

        // hit a target?
        if (tile === TARGET) {
            const idx = targets.findIndex(t => t.x === x && t.y === y);
            return { path, hitIndex: idx };
        }

        // reflect
        if (tile === MIRROR_FWD) {
            const temp = dx;
            dx = -dy;
            dy = -temp;
        }
        else if (tile === MIRROR_BACK) {
            const temp = dx;
            dx = dy;
            dy = temp;
        }
    }

    return { path, hitIndex: -1 };
}

function fireLasersAnimated() {
    solved = false;
    targetHit = targets.map(_ => false);
    updateStatus();
    beamSet.clear();

    stopBeam();
    clearBeamVisual();

    // compute all paths first
    const results = emitters.map(e => computeBeamPath(e));

    // record which targets get hit
    for (const r of results) {
        if (r.hitIndex >= 0) targetHit[r.hitIndex] = true;
    }

    beamStates = results.map(r => ({ path: r.path, i: 0 }));

    beamTimer = PS.timerStart(1, function () {
        let anyActive = false;

        for (const s of beamStates) {
            if (s.i >= s.path.length) continue;
            anyActive = true;

            const p = s.path[s.i++];
            const tile = grid[p.y][p.x];

            PS.color(p.x, p.y, 255, 255, 0);
            PS.alpha(p.x, p.y, (tile === TARGET) ? 255 : 220);
            beamSet.add(p.x + "," + p.y);
        }

        if (!anyActive) {
            stopBeam();

            // solved if ALL targets are hit
            const allHit = targetHit.every(v => v);
            if (allHit) onSolvedMulti();
        }
    });
}

function onSolvedMulti() {
    solved = true;
    stopPulse();

    // glow all targets
    for (const t of targets) {
        PS.color(t.x, t.y, 255, 255, 120);
        PS.alpha(t.x, t.y, 255);
    }

    PS.audioPlay("fx_tada");
    updateStatus();
}

//
// -------------------- INPUT --------------------
//

PS.touch = function (x, y) {
    if (solved) {
        if (grid[y][x] === TARGET) nextLevel();
        return;
    }

    const tile = grid[y][x];

    if (tile === MIRROR_FWD) {
        grid[y][x] = MIRROR_BACK;
        PS.audioPlay("fx_beep");
        drawCell(x, y);
        fireLasersAnimated();
        return;
    }

    if (tile === MIRROR_BACK) {
        grid[y][x] = MIRROR_FWD;
        PS.audioPlay("fx_beep");
        drawCell(x, y);
        fireLasersAnimated();   // <-- fixed name
        return;
    }

    // Don't erase beam tiles when clicked
    if (beamSet.has(x + "," + y)) {
        return;
    }

// Optional tiny feedback for clicking non-interactive, non-beam cells
    PS.alpha(x, y, 200);
    PS.timerStart(2, function () { drawCell(x, y); });

};

// function buildLevel() {
//     grid = [
//         [1,1,1,1,1,1,1,1,1,1,1],
//         [1,0,0,0,0,0,0,0,0,0,1],
//         [1,0,1,1,0,1,1,1,1,0,1],
//         [1,0,0,0,0,0,0,0,1,0,1],
//         [1,0,1,0,1,1,1,0,1,0,1],
//         [1,4,0,0,1,0,0,0,0,5,1],
//         [1,0,1,0,1,1,1,0,1,0,1],
//         [1,0,0,0,0,0,0,0,1,0,1],
//         [1,0,1,1,0,1,1,1,1,0,1],
//         [1,0,0,0,0,0,0,0,0,0,1],
//         [1,1,1,1,1,1,1,1,1,1,1],
//     ];
//
//     grid[5][3] = MIRROR_BACK;
//     grid[3][3] = MIRROR_BACK;
//     grid[3][7] = MIRROR_FWD;
//     grid[7][7] = MIRROR_FWD;
//     grid[7][4] = MIRROR_BACK;
//     grid[9][4] = MIRROR_BACK;
//     grid[9][9] = MIRROR_BACK;
//
// }

// function drawCell(x, y) {
//     let tile = grid[y][x];
//     PS.glyph(x,y, "");
//
//     switch (tile) {
//         case EMPTY:
//             PS.color(x, y, 60, 60, 60);
//             break;
//         case WALL:
//             PS.color(x, y, 20, 20, 20);
//             break;
//         case MIRROR_FWD:
//             PS.color(x, y, 0, 200, 200);
//             PS.glyph(x, y, "/");
//             break;
//         case MIRROR_BACK:
//             PS.color(x, y, 0, 200, 200);
//             PS.glyph(x, y, "\\");
//             break;
//         case EMITTER:
//             PS.color(x, y, 220, 40, 40);
//             PS.glyph(x, y, ">");
//             break;
//         case TARGET:
//             PS.color(x, y, 40, 200, 40);
//             PS.glyph(x, y, "*");
//             break;
//
//     }
// }

// function drawGrid(){
//     for (let y= 0; y < 11; y++) {
//         for (let x= 0; x < 11; x++) {
//             drawCell(x, y);
//         }
//     }
// }

// function fireLaser() {
//     solved = false;
//     PS.statusText("Laser Logic");
//     clearBeam();
//
//     let x = emitter.x;
//     let y = emitter.y;
//     let dx = emitter.dx;
//     let dy = emitter.dy;
//
//     while (true) {
//         x += dx;
//         y += dy;
//
//         if (x < 0 || x >= 11 || y < 0 || y >= 11) return;
//
//         let tile = grid[y][x];
//
//         if (tile === WALL) return;
//
//         if (tile === TARGET) {
//             PS.color(x, y, 255, 255, 100);
//             solved = true;
//             PS.audioPlay("fx_tada");
//             PS.statusText("Solved!");
//             return;
//         }
//
//         PS.color(x, y, 255, 255, 0);
//
//         if (tile === MIRROR_FWD) {
//             let temp = dx;
//             dx = -dy;
//             dy = -temp;
//         }
//         else if (tile === MIRROR_BACK) {
//             let temp = dx;
//             dx = dy;
//             dy = temp;
//         }
//     }
// }
//
// function clearBeam() {
//     for (let y = 0; y < 11; y++) {
//         for (let x = 0; x < 11; x++) {
//             drawCell(x, y);
//         }
//     }
// }

// function resetGame() {
//     if (timer !== null) {
//         PS.timerStop(timer);
//         timer = null;
//     }




	// This is also a good place to display
	// your game title or a welcome message
	// in the status line above the grid.
	// Uncomment the following code line and
	// change the string parameter as needed.


	// Add any other initialization code you need here.


/*
PS.touch ( x, y, data, options )
Called when the left mouse button is clicked over bead(x, y), or when bead(x, y) is touched.
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/
//
// PS.touch = function( x, y) {
// 	if (solved) return;
//
//     if (grid[y][x] === MIRROR_FWD) {
//         grid[y][x] = MIRROR_BACK;
//     }
//     else if (grid[y][x] === MIRROR_BACK) {
//         grid[y][x] = MIRROR_FWD;
//     }
//     else return;
//
//     PS.audioPlay("fx_beep");
//     drawCell(x, y);
//     fireLaser();
// };


/*
PS.release ( x, y, data, options )
Called when the left mouse button is released, or when a touch is lifted, over bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.release = function( x, y, data, options ) {
	// Uncomment the following code line to inspect x/y parameters:

	// PS.debug( "PS.release() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse button/touch is released over a bead.
};

/*
PS.enter ( x, y, button, data, options )
Called when the mouse cursor/touch enters bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.enter = function( x, y, data, options ) {
	// Uncomment the following code line to inspect x/y parameters:

	// PS.debug( "PS.enter() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse cursor/touch enters a bead.
};

/*
PS.exit ( x, y, data, options )
Called when the mouse cursor/touch exits bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.exit = function( x, y, data, options ) {
	// Uncomment the following code line to inspect x/y parameters:

	// PS.debug( "PS.exit() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse cursor/touch exits a bead.
};

/*
PS.exitGrid ( options )
Called when the mouse cursor/touch exits the grid perimeter.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.exitGrid = function( options ) {
	// Uncomment the following code line to verify operation:

	// PS.debug( "PS.exitGrid() called\n" );

	// Add code here for when the mouse cursor/touch moves off the grid.
};

/*
PS.keyDown ( key, shift, ctrl, options )
Called when a key on the keyboard is pressed.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.keyDown = function( key, shift, ctrl, options ) {
	// Uncomment the following code line to inspect first three parameters:

	// PS.debug( "PS.keyDown(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );

	// Add code here for when a key is pressed.
};

/*
PS.keyUp ( key, shift, ctrl, options )
Called when a key on the keyboard is released.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.keyUp = function( key, shift, ctrl, options ) {
	// Uncomment the following code line to inspect first three parameters:

	// PS.debug( "PS.keyUp(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );

	// Add code here for when a key is released.
};

/*
PS.input ( sensors, options )
Called when a supported input device event (other than those above) is detected.
This function doesn't have to do anything. Any value returned is ignored.
[sensors : Object] = A JavaScript object with properties indicating sensor status; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
NOTE: Currently, only mouse wheel events are reported, and only when the mouse cursor is positioned directly over the grid.
*/

PS.input = function( sensors, options ) {
	// Uncomment the following code lines to inspect first parameter:

//	 var device = sensors.wheel; // check for scroll wheel
//
//	 if ( device ) {
//	   PS.debug( "PS.input(): " + device + "\n" );
//	 }

	// Add code here for when an input event is detected.
};

