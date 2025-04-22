// Impossible Blocks - A unique horizontal block puzzle game
// Copyright (c) 2024 - A distinctive block-stacking game with horizontal movement mechanics

class BlockPuzzle {
    // ... existing code ...

    start() {
        this.reset();
        this.currentPiece = this.generateNewPiece();
        this.nextPiece = this.generateNewPiece();
        this.lastTime = performance.now();
        this.dropCounter = 0;
        if (this.sounds.bgm.paused) {
            this.sounds.bgm.currentTime = 0;
            this.sounds.bgm.play();
        }
        console.log('Game started. Current piece:', this.currentPiece);
        requestAnimationFrame(this.update.bind(this));
    }

    generateNewPiece() {
        if (this.bag.length === 0) {
            this.bag = Object.keys(this.SHAPES);
            // Fisher-Yates shuffle
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        const type = this.bag[0];
        this.bag.shift(); // Remove the type from the bag after getting it
        
        // Deep copy the shape array
        const shapeArray = this.SHAPES[type].map(row => [...row]);
        
        // Calculate initial Y position to ensure piece starts fully within grid
        const pieceHeight = shapeArray.length;
        const initialY = Math.floor((this.ROWS - pieceHeight) / 2);
        
        const piece = {
            shape: shapeArray,
            color: this.COLORS[type],
            type: type,
            x: 0, // Start from the left side
            y: initialY // Center vertically within valid grid space
        };
        return piece;
    }

    moveDown() {
        // This is now moveRight()
        this.currentPiece.x++;
        if (this.collision()) {
            this.currentPiece.x--;
            this.merge();
            this.sounds.lock.currentTime = 0;
            this.sounds.lock.play();
            const prevLevel = this.level;
            this.clearLines();
            if (this.level > prevLevel) {
                this.sounds.levelup.currentTime = 0;
                this.sounds.levelup.play();
            }
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.generateNewPiece();
            if (this.collision()) {
                this.sounds.gameover.currentTime = 0;
                this.sounds.gameover.play();
                this.sounds.bgm.pause();
                this.sounds.bgm.currentTime = 0;
                this.gameOver = true;
                alert('Game Over! Score: ' + this.score);
                return;
            }
            this.canHold = true;
        } else {
            // Play soft drop sound if right arrow is held
            if (window.event && window.event.keyCode === 39) {
                this.sounds.softdrop.currentTime = 0;
                this.sounds.softdrop.play();
            }
        }
    }

    update(time = 0) {
        if (this.gameOver || this.isPaused) {
            return;
        }

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.moveDown();
            this.dropCounter = 0;
        }

        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    holdCurrentPiece() {
        if (!this.canHold) return;

        this.sounds.hold.currentTime = 0;
        this.sounds.hold.play();

        const currentType = this.currentPiece.type;
        const currentShape = this.SHAPES[currentType];
        const currentColor = this.COLORS[currentType];

        if (this.holdPiece === null) {
            this.holdPiece = {
                shape: currentShape,
                color: currentColor,
                type: currentType
            };
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.generateNewPiece();
        } else {
            const tempPiece = this.holdPiece;
            this.holdPiece = {
                shape: currentShape,
                color: currentColor,
                type: currentType
            };
            // Calculate safe Y position for held piece
            const pieceHeight = tempPiece.shape.length;
            const safeY = Math.floor((this.ROWS - pieceHeight) / 2);
            
            this.currentPiece = {
                shape: tempPiece.shape,
                color: tempPiece.color,
                type: tempPiece.type,
                x: 0,
                y: safeY
            };
        }

        this.canHold = false;
    }

    draw() {
        // Fill background for visibility
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.nextCtx.fillStyle = '#111';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.holdCtx.fillStyle = '#111';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        // Debug: log current piece position and shape
        if (this.currentPiece) {
            console.log('Drawing current piece at', this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape);
        }

        // Draw grid lines (crisp, pixel-perfect)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        // Vertical grid lines
        for (let x = 0; x <= this.COLS; x++) {
            const px = Math.round(x * this.BLOCK_SIZE) + 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(px, 0);
            this.ctx.lineTo(px, this.canvas.height);
            this.ctx.stroke();
        }
        // Horizontal grid lines
        for (let y = 0; y <= this.ROWS; y++) {
            const py = Math.round(y * this.BLOCK_SIZE) + 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(0, py);
            this.ctx.lineTo(this.canvas.width, py);
            this.ctx.stroke();
        }

        // Draw board
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = value;
                    this.ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, 
                                    this.BLOCK_SIZE - 1, this.BLOCK_SIZE - 1);
                }
            });
        });

        // Draw current piece
        if (this.currentPiece) {
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.ctx.fillStyle = this.currentPiece.color;
                        this.ctx.fillRect((this.currentPiece.x + x) * this.BLOCK_SIZE,
                                        (this.currentPiece.y + y) * this.BLOCK_SIZE,
                                        this.BLOCK_SIZE - 1, this.BLOCK_SIZE - 1);
                    }
                });
            });
        }

        // Constants for preview windows
        const PREVIEW_BLOCK_SIZE = 20;
        const PREVIEW_PADDING = 1;

        // Draw next piece
        if (this.nextPiece) {
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * PREVIEW_BLOCK_SIZE) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * PREVIEW_BLOCK_SIZE) / 2;
            
            this.nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(
                            offsetX + x * PREVIEW_BLOCK_SIZE,
                            offsetY + y * PREVIEW_BLOCK_SIZE,
                            PREVIEW_BLOCK_SIZE - PREVIEW_PADDING,
                            PREVIEW_BLOCK_SIZE - PREVIEW_PADDING
                        );
                    }
                });
            });
        }

        // Draw hold piece
        if (this.holdPiece) {
            const offsetX = (this.holdCanvas.width - this.holdPiece.shape[0].length * PREVIEW_BLOCK_SIZE) / 2;
            const offsetY = (this.holdCanvas.height - this.holdPiece.shape.length * PREVIEW_BLOCK_SIZE) / 2;
            
            this.holdPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.holdCtx.fillStyle = this.holdPiece.color;
                        this.holdCtx.fillRect(
                            offsetX + x * PREVIEW_BLOCK_SIZE,
                            offsetY + y * PREVIEW_BLOCK_SIZE,
                            PREVIEW_BLOCK_SIZE - PREVIEW_PADDING,
                            PREVIEW_BLOCK_SIZE - PREVIEW_PADDING
                        );
                    }
                });
            });
        }
    }

    initControls() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdPiece');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        // Game board dimensions
        this.COLS = 36;  // Horizontal length
        this.ROWS = 12;  // Vertical height
        this.BLOCK_SIZE = 27;

        // Sound effects
        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            rotate: new Audio('sounds/rotate.mp3'),
            softdrop: new Audio('sounds/softdrop.mp3'),
            harddrop: new Audio('sounds/harddrop.mp3'),
            lock: new Audio('sounds/lock.mp3'),
            clear: new Audio('sounds/clear1.mp3'),  // Reuse existing sound
            perfect: new Audio('sounds/clear3.mp3'), // Reuse existing sound
            levelup: new Audio('sounds/levelup.mp3'),
            gameover: new Audio('sounds/gameover.mp3'),
            pause: new Audio('sounds/pause.mp3'),
            unpause: new Audio('sounds/unpause.mp3'),
            hold: new Audio('sounds/hold.mp3'),
            bgm: new Audio('sounds/bgm.mp3')
        };

        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.7;
        // Lower the volume of all effect sounds
        const effectVolume = 1.0;
        for (const key in this.sounds) {
            if (key !== 'bgm') {
                this.sounds[key].volume = effectVolume;
            }
        }
        
        // Unique pentomino shapes (5 blocks each)
        this.SHAPES = {
            'A': [[1,0,1,0,1],
                  [0,1,0,1,0]], // Alternating pattern
            'B': [[1,1,0],
                  [0,1,0],
                  [0,1,1]], // Zigzag
            'C': [[1,1,1],
                  [1,0,0],
                  [1,0,0]], // Corner block
            'D': [[0,1,0],
                  [1,1,1],
                  [0,1,0]], // Plus shape
            'E': [[1,0,0],
                  [1,1,1],
                  [1,0,0]], // H shape
            'F': [[1,1,1],
                  [0,0,1],
                  [0,0,1]], // Reversed corner
            'G': [[0,1,0],
                  [1,1,0],
                  [0,1,1]]  // Snake shape
        };
        
        this.COLORS = {
            'A': '#FF6B6B', // Coral red
            'B': '#4ECDC4', // Turquoise
            'C': '#45B7D1', // Ocean blue
            'D': '#96CEB4', // Sage green
            'E': '#FFBE0B', // Golden yellow
            'F': '#FF006E', // Hot pink
            'G': '#8338EC'  // Purple
        };

        // Game state
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(''));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        
        // Piece management
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        
        // Speed management
        this.dropCounter = 0;
        this.lastTime = 0;
        this.dropInterval = 1000; // Start with 1 second interval
        
        // Initialize the bag of pieces
        this.bag = [];

        // Initialize controls after setting up everything
        this.initControls();

        // Initialize score display
        this.updateScore();
    }

    handleKeyPress(event) {
        if (this.gameOver) return;

        switch(event.keyCode) {
            case 38: // Up arrow
                this.moveLeft();
                break;
            case 40: // Down arrow
                this.moveRight();
                break;
            case 39: // Right arrow (soft drop)
                this.moveDown();
                break;
            case 90: // Z key - vertical flip
                this.verticalFlip();
                break;
            case 88: // X key - horizontal flip
                this.horizontalFlip();
                break;
            case 32: // Space
                event.preventDefault();
                this.hardDrop();
                break;
            case 67: // C key
                this.holdCurrentPiece();
                break;
            case 80: // P key
                this.togglePause();
                break;
        }
    }

    reset() {
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(''));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.holdPiece = null;
        this.canHold = true;
        if (this.updateScore) this.updateScore();
    }

    collision() {
        return this.currentPiece.shape.some((row, dy) =>
            row.some((value, dx) => {
                if (!value) return false;
                const newX = this.currentPiece.x + dx;
                const newY = this.currentPiece.y + dy;
                return (
                    newX < 0 ||
                    newX >= this.COLS ||
                    newY < 0 || // Add top boundary check
                    newY >= this.ROWS ||
                    (newY >= 0 && this.board[newY][newX])
                );
            })
        );
    }

    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const newY = this.currentPiece.y + y;
                    const newX = this.currentPiece.x + x;
                    if (newY >= 0) {
                        this.board[newY][newX] = this.currentPiece.color;
                    }
                }
            });
        });
    }

    moveLeft() {
        // This becomes move up
        if (this.willCollideWithTop()) return; // Check if move would go above grid
        this.currentPiece.y--;
        if (this.collision()) {
            this.currentPiece.y++;
        } else {
            this.sounds.move.currentTime = 0;
            this.sounds.move.play();
        }
    }

    willCollideWithTop() {
        // Check if any part of the piece would go above the grid
        return this.currentPiece.shape.some((row, dy) =>
            row.some((value, dx) => {
                if (!value) return false;
                const newY = this.currentPiece.y - 1 + dy; // Check next position
                return newY < 0;
            })
        );
    }

    moveRight() {
        // This becomes move down
        this.currentPiece.y++;
        if (this.collision()) {
            this.currentPiece.y--;
        } else {
            this.sounds.move.currentTime = 0;
            this.sounds.move.play();
        }
    }

    rotate() {
        const originalShape = this.currentPiece.shape.map(row => [...row]);
        // Flip the piece vertically instead of rotating
        this.currentPiece.shape.reverse();
        
        if (this.collision()) {
            this.currentPiece.shape = originalShape;
        } else {
            this.sounds.rotate.currentTime = 0;
            this.sounds.rotate.play();
        }
    }

    verticalFlip() {
        const originalShape = this.currentPiece.shape.map(row => [...row]);
        // Flip the piece vertically (up/down)
        this.currentPiece.shape.reverse();
        
        if (this.collision()) {
            this.currentPiece.shape = originalShape;
        } else {
            this.sounds.rotate.currentTime = 0;
            this.sounds.rotate.play();
        }
    }

    horizontalFlip() {
        const originalShape = this.currentPiece.shape.map(row => [...row]);
        // Flip the piece horizontally (left/right)
        this.currentPiece.shape = this.currentPiece.shape.map(row => row.reverse());
        
        if (this.collision()) {
            this.currentPiece.shape = originalShape;
        } else {
            this.sounds.rotate.currentTime = 0;
            this.sounds.rotate.play();
        }
    }

    clearLines() {
        let linesCleared = 0;
        let blocksCleared = 0;
        let perfectClear = true;

        // Check for special patterns (2x2 squares, crosses, etc.)
        let specialPatterns = this.checkSpecialPatterns();
        
        // Check vertical lines for exactly 5 consecutive blocks (any color)
        for (let x = this.COLS - 1; x >= 0; x--) {
            for (let startY = 0; startY <= this.ROWS - 5; startY++) {
                let consecutiveBlocks = 0;
                
                // Check 5 consecutive positions
                for (let y = startY; y < startY + 5; y++) {
                    if (this.board[y][x]) {
                        consecutiveBlocks++;
                    } else {
                        break;
                    }
                }

                // If exactly 5 blocks are found
                if (consecutiveBlocks === 5) {
                    linesCleared++;
                    blocksCleared += 5; // Count the cleared blocks
                    
                    // Clear the 5 blocks
                    for (let y = startY; y < startY + 5; y++) {
                        this.board[y][x] = '';
                    }
                    
                    // Move all blocks above down
                    for (let y = startY - 1; y >= 0; y--) {
                        this.board[y + 5][x] = this.board[y][x];
                        this.board[y][x] = '';
                    }

                    // Shift all blocks from the left to fill the gap
                    for (let shiftX = x; shiftX > 0; shiftX--) {
                        for (let y = 0; y < this.ROWS; y++) {
                            this.board[y][shiftX] = this.board[y][shiftX - 1];
                            this.board[y][shiftX - 1] = '';
                        }
                    }

                    // Since we shifted everything right, we need to check the same position again
                    x++; // Counteract the x-- in the loop
                }
            }
        }

        // Check if any blocks remain (for perfect clear)
        perfectClear = this.board.every(row => row.every(cell => !cell));

        if (linesCleared > 0 || specialPatterns > 0) {
            let baseScore = 0;
            
            // Score for vertical lines (5 blocks)
            baseScore = linesCleared * 1000; // 1000 points per line of 5
            
            // Add score for individual blocks cleared
            baseScore += blocksCleared * 100; // 100 points per block

            // Add score for special patterns
            baseScore += specialPatterns * 500;

            // Apply level multiplier
            baseScore *= (1 + (this.level * 0.5));

            // Apply perfect clear bonus
            if (perfectClear) {
                baseScore *= 3; // Triple score for perfect clear
            }

            this.score += Math.floor(baseScore);
            this.lines += linesCleared;
            this.level = Math.floor(this.lines / 8) + 1; // Level up faster

            // Update the score display
            this.updateScore();

            if (perfectClear) {
                this.sounds.perfect.play();
            } else {
                this.sounds.clear.play();
            }
        }
    }

    checkSpecialPatterns() {
        let patternScore = 0;
        
        // Check for 2x2 squares
        for (let y = 0; y < this.ROWS - 1; y++) {
            for (let x = 0; x < this.COLS - 1; x++) {
                if (this.board[y][x] && 
                    this.board[y][x] === this.board[y][x+1] &&
                    this.board[y][x] === this.board[y+1][x] &&
                    this.board[y][x] === this.board[y+1][x+1]) {
                    patternScore++;
                }
            }
        }

        // Check for cross patterns
        for (let y = 1; y < this.ROWS - 1; y++) {
            for (let x = 1; x < this.COLS - 1; x++) {
                if (this.board[y][x] &&
                    this.board[y][x] === this.board[y-1][x] &&
                    this.board[y][x] === this.board[y+1][x] &&
                    this.board[y][x] === this.board[y][x-1] &&
                    this.board[y][x] === this.board[y][x+1]) {
                    patternScore += 2;
                }
            }
        }

        return patternScore;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.sounds.pause.currentTime = 0;
            this.sounds.pause.play();
            this.sounds.bgm.pause();
        } else {
            this.sounds.unpause.currentTime = 0;
            this.sounds.unpause.play();
            this.sounds.bgm.play();
            this.lastTime = performance.now();
            requestAnimationFrame(this.update.bind(this));
        }
    }

    hardDrop() {
        this.sounds.harddrop.currentTime = 0;
        this.sounds.harddrop.play();
        while (!this.collision()) {
            this.currentPiece.x++;
        }
        this.currentPiece.x--;
        this.merge();
        this.sounds.lock.currentTime = 0;
        this.sounds.lock.play();
        const prevLevel = this.level;
        this.clearLines();
        if (this.level > prevLevel) {
            this.sounds.levelup.currentTime = 0;
            this.sounds.levelup.play();
        }
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.generateNewPiece();
        this.canHold = true;
        if (this.collision()) {
            this.sounds.gameover.currentTime = 0;
            this.sounds.gameover.play();
            this.sounds.bgm.pause();
            this.sounds.bgm.currentTime = 0;
            this.gameOver = true;
            this.draw(); // Draw the final state
            alert('Game Over! Score: ' + this.score);
            return; // Stop further processing
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    calculateScore(linesCleared) {
        const basePoints = {
            1: 100,
            2: 300,
            3: 500,
            4: 800
        };
        return (basePoints[linesCleared] || 0) * this.level;
    }

    // ... existing code ...
}

// Instantiate the game globally
window.game = new BlockPuzzle();