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
Bomb Diffuse Game
* */

let bombX;
let bombY;
let fuse = [];
let burnIndex = 0;
let timer = null;
let gameOver = false;
let resetX = 0;
let resetY = 0;
let fuseSound, explodeSound, winSound;
let fuseChannel;
let disarmClicks = 0;
let requiredClicks = 1;
let burnRate = 15;

let score = 0;


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

    PS.gridSize(10, 5);
    PS.border(PS.ALL, PS.ALL, 0);
    //fuseSound = PS.audioLoad("fuse", {path: "audio/fuse.mp3", autoplay: true, filetypes: ["mp3"]});
    //explodeSound = PS.audioLoad("explode", {path: "audio/explode.mp3", autoplay: true, filetypes: ["mp3"]});
    //winSound = PS.audioLoad("win", {path: "audio/win.mp3", autoplay: true, filetypes: ["mp3"]});
    resetGame();
};

function resetGame() {
    if (timer !== null) {
        PS.timerStop(timer);
        timer = null;
    }

    //Stop fuse sound if currently playing
    //if (fuseChannel) PS.audioStop(fuseChannel);

    fuse = [];
    burnIndex = 0;
    disarmClicks = 0;
    gameOver = false;

    burnRate = PS.random(10) + 8; // random fuse speed
    buildFuse();
    drawScene();

    PS.statusText("Click the F to stop the fuse.")
    //fuseChannel = PS.audioPlay(fuseSound, { loop: true, volume: 0.4});
    timer = PS.timerStart(burnRate, burnFuse); //Start fuse timer
}

function buildFuse() {
    fuse = [];
    let y = 2;
    let length = PS.random(4) + 3; // 3-7 fuse length

    for (let x = 1; x <= length; x++) {
        fuse.push({x: x, y: y});
    }

    // Place bomb at the end of fuse
    bombX = fuse[fuse.length - 1].x +1;
    bombY = y;

}

function drawScene() {
    PS.color(PS.ALL, PS.ALL, PS.COLOR_BLACK);
    PS.glyph(PS.ALL, PS.ALL, "");

    // Draw Reset button
    PS.color(resetX, resetY, PS.COLOR_BLUE);
    PS.glyph(resetX, resetY, "R");
    PS.glyphColor(resetX, resetY, PS.COLOR_WHITE);

    // Draw fuse
    for (let i = 0; i < fuse.length; i++) {
        PS.color(fuse[i].x, fuse[i].y, PS.COLOR_GRAY);
    }

    drawFire();

    // Draw Bomb
    PS.color(bombX, bombY, PS.COLOR_RED);
    PS.glyph(bombX, bombY, "B");
    PS.glyphColor(bombX, bombY, PS.COLOR_BLACK)
}

function drawFire() {
    if (burnIndex < 0 || burnIndex >= fuse.length) return;
    let p = fuse[burnIndex];
    PS.color(p.x, p.y, PS.COLOR_ORANGE);
    PS.glyph(p.x, p.y, "F");
}

function burnFuse() {
    if (gameOver)   return;

    // If fire is already at last fuse segment, explode
    if (burnIndex >= fuse.length - 1) {
        explode();
        return;
    }

    burnIndex++;
    drawScene()
}

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

PS.touch = function( x, y, data, options ) {
	// Uncomment the following code line
	// to inspect x/y parameters:

	// PS.debug( "PS.touch() @ " + x + ", " + y + "\n" );

	// Add code here for mouse clicks/touches
	// over a bead.
    if (x ===  resetX && y ===  resetY) {
        resetGame();
        return;
    }
    if (gameOver) return;

    let p = fuse[burnIndex];
    if (x === p.x && y === p.y) {
        attemptDisarm();
    }
};

function attemptDisarm() {
    disarmClicks++;
    PS.audioPlay("fx_click");

    updateStatus(`Cutting fuse... (${disarmClicks}/${requiredClicks})`);

    if (disarmClicks >= requiredClicks) {
        disarm()
    }
}

function disarm() {
    gameOver = true;

    if (timer !== null) {
        PS.timerStop(timer);
        timer = null;
    }

    //if (fuseChannel) PS.audioStop(fuseChannel);
    score++; // increase score
    PS.audioPlay("fx_ding");
    updateStatus(`BOMB DIFFUSED! Score: ${score}`);
    PS.color(bombX, bombY, PS.COLOR_GREEN);
    PS.glyph(bombX, bombY, "✓")
}

function explode() {
    gameOver = true;

    if (timer !== null) {
        PS.timerStop(timer);
        timer = null;
    }

    score = 0; // resets  score if you fail

    //if (fuseChannel) PS.audioStop(fuseChannel);
    PS.audioPlay("fx_blast1");
    PS.audioPlay("fx_wilhelm");
    updateStatus("BOOM! Score reset");

    //Explosion Screen
    PS.color(PS.ALL, PS.ALL, PS.COLOR_RED);
    PS.glyph(PS.ALL, PS.ALL, "");
    PS.glyph(bombX, bombY, "X")

    // Draw Reset button
    PS.color(resetX, resetY, PS.COLOR_BLUE);
    PS.glyph(resetX, resetY, "R");
    PS.glyphColor(resetX, resetY, PS.COLOR_WHITE);

    PS.color(bombX, bombY, PS.COLOR_RED);
}
function updateStatus(message) {
    PS.statusText(`Bomb diffused: ${score} | Click R to keep going!`);
}
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

