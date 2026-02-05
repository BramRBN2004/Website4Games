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

let grid = [];
let emitter = { x: 1, y: 5, dx: 1, dy: 0 };
let solved = false;


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

    buildLevel();
    drawGrid();
    fireLaser();
    //resetGame();
};

function buildLevel() {
    grid = [
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,0,1,1,1,0,1,0,1],
        [1,4,0,0,1,0,0,0,0,5,1],
        [1,0,1,0,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1],
    ];

    grid[5][3] = MIRROR_BACK;
    grid[3][3] = MIRROR_BACK;
    grid[3][7] = MIRROR_FWD;
    grid[7][7] = MIRROR_FWD;
    grid[7][4] = MIRROR_BACK;
    grid[9][4] = MIRROR_BACK;
    grid[9][9] = MIRROR_BACK;

}

function drawCell(x, y) {
    let tile = grid[y][x];
    PS.glyph(x,y, "");

    switch (tile) {
        case EMPTY:
            PS.color(x, y, 60, 60, 60);
            break;
        case WALL:
            PS.color(x, y, 20, 20, 20);
            break;
        case MIRROR_FWD:
            PS.color(x, y, 0, 200, 200);
            PS.glyph(x, y, "/");
            break;
        case MIRROR_BACK:
            PS.color(x, y, 0, 200, 200);
            PS.glyph(x, y, "\\");
            break;
        case EMITTER:
            PS.color(x, y, 220, 40, 40);
            PS.glyph(x, y, ">");
            break;
        case TARGET:
            PS.color(x, y, 40, 200, 40);
            PS.glyph(x, y, "*");
            break;

    }
}

function drawGrid(){
    for (let y= 0; y < 11; y++) {
        for (let x= 0; x < 11; x++) {
            drawCell(x, y);
        }
    }
}

function fireLaser() {
    solved = false;
    PS.statusText("Laser Logic");
    clearBeam();

    let x = emitter.x;
    let y = emitter.y;
    let dx = emitter.dx;
    let dy = emitter.dy;

    while (true) {
        x += dx;
        y += dy;

        if (x < 0 || x >= 11 || y < 0 || y >= 11) return;

        let tile = grid[y][x];

        if (tile === WALL) return;

        if (tile === TARGET) {
            PS.color(x, y, 255, 255, 100);
            solved = true;
            PS.audioPlay("fx_tada");
            PS.statusText("Solved!");
            return;
        }

        PS.color(x, y, 255, 255, 0);

        if (tile === MIRROR_FWD) {
            let temp = dx;
            dx = -dy;
            dy = -temp;
        }
        else if (tile === MIRROR_BACK) {
            let temp = dx;
            dx = dy;
            dy = temp;
        }
    }
}

function clearBeam() {
    for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 11; x++) {
            drawCell(x, y);
        }
    }
}

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

PS.touch = function( x, y) {
	if (solved) return;

    if (grid[y][x] === MIRROR_FWD) {
        grid[y][x] = MIRROR_BACK;
    }
    else if (grid[y][x] === MIRROR_BACK) {
        grid[y][x] = MIRROR_FWD;
    }
    else return;

    PS.audioPlay("fx_beep");
    drawCell(x, y);
    fireLaser();
};


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

