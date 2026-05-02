const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    z: false,
    x: false,
    c: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        const key = e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'c' ? e.key.toLowerCase() : e.key;
        if(keys.hasOwnProperty(key)) keys[key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        const key = e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'c' ? e.key.toLowerCase() : e.key;
        if(keys.hasOwnProperty(key)) keys[key] = false;
    }
});

const player = {
    x: 50,
    y: 50,
    width: 30,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 5,
    dashSpeed: 10,
    jumpPower: -12,
    gravity: 0.6,
    maxFallSpeed: 12,
    color: '#00aaff',
    grounded: false,
    wallSliding: false,
    facingRight: true,
    isDashing: false,
    dashTimer: 0,
    dashDuration: 15,
    dashCooldown: 0,
    wallJumpCooldown: 0,
    shootCooldown: 0,
    isDucking: false
};

let platforms = [
    { x: 0, y: 550, width: 800, height: 50 }, // Floor
    { x: 200, y: 450, width: 100, height: 20 },
    { x: 400, y: 350, width: 150, height: 20 },
    { x: 650, y: 250, width: 100, height: 20 },
    { x: 0, y: 0, width: 20, height: 600 }, // Left wall
    { x: 780, y: 0, width: 20, height: 600 }, // Right wall
    { x: 300, y: 150, width: 20, height: 200 }, // Wall jump test wall
];

let goal = { x: 700, y: 150, width: 40, height: 100, color: '#00ff00' };
let fans = [];

const savedLevel = localStorage.getItem('customLevel');
if (savedLevel) {
    try {
        const levelData = JSON.parse(savedLevel);
        if (levelData.platforms) platforms = levelData.platforms;
        if (levelData.start) {
            player.x = levelData.start.x;
            player.y = levelData.start.y;
        }
        if (levelData.goal) {
            goal = levelData.goal;
            goal.color = '#00ff00';
        } else {
            goal = { x: -1000, y: -1000, width: 0, height: 0, color: '#00ff00' };
        }
        if (levelData.fans) fans = levelData.fans;
    } catch(e) {}
}
let levelComplete = false;

let projectiles = [];


function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function update() {
    if (levelComplete) return;

    // Duck Logic
    if (keys.ArrowDown && player.grounded && !player.isDucking) {
        player.isDucking = true;
        player.height = 20;
        player.y += 20;
    } else if (!keys.ArrowDown && player.isDucking) {
        player.isDucking = false;
        player.height = 40;
        player.y -= 20;
    }

    // Dash Logic
    if (keys.c && player.dashCooldown <= 0 && !player.isDashing && !player.isDucking) {
        player.isDashing = true;
        player.dashTimer = player.dashDuration;
        player.dashCooldown = 30; // Frames until next dash allowed
    }

    if (player.dashCooldown > 0) player.dashCooldown--;

    if (player.isDashing) {
        player.vy = 0; // Suspend gravity while dashing
        player.vx = player.facingRight ? player.dashSpeed : -player.dashSpeed;
        player.dashTimer--;
        if (player.dashTimer <= 0) {
            player.isDashing = false;
        }
    } else {
        // Normal Horizontal Movement
        if (player.wallJumpCooldown <= 0) {
            if (keys.ArrowLeft && !player.isDucking) {
                player.vx = -player.speed;
                player.facingRight = false;
            } else if (keys.ArrowRight && !player.isDucking) {
                player.vx = player.speed;
                player.facingRight = true;
            } else {
                player.vx = 0;
            }
        } else {
            player.wallJumpCooldown--;
        }

        // Apply Gravity
        player.vy += player.gravity;
        if (player.wallSliding && player.vy > 2) {
            player.vy = 2; // Slide down slowly
        } else if (player.vy > player.maxFallSpeed) {
            player.vy = player.maxFallSpeed;
        }
    }

    // Wind Logic
    let hasWindX = false;
    let hasWindY = false;
    let windVx = 0;
    let windVy = 0;
    let closestDist = Infinity;
    
    for (let fan of fans) {
        let windZone;
        if (fan.dir === 'right') windZone = {x: fan.x, y: fan.y, width: 2000, height: fan.height};
        if (fan.dir === 'left') windZone = {x: fan.x - 2000, y: fan.y, width: 2000 + fan.width, height: fan.height};
        if (fan.dir === 'up') windZone = {x: fan.x, y: fan.y - 2000, width: fan.width, height: 2000 + fan.height};
        if (fan.dir === 'down') windZone = {x: fan.x, y: fan.y, width: fan.width, height: 2000};
        
        let inBlock = checkCollision(player, fan);
        if (checkCollision(player, windZone) || inBlock) {
            let dist = Math.abs(player.x - fan.x) + Math.abs(player.y - fan.y);
            if (inBlock) dist = -1; // Highest priority if touching the fan block itself
            
            if (dist < closestDist) {
                closestDist = dist;
                windVx = 0; windVy = 0;
                hasWindX = false; hasWindY = false;
                
                if (fan.dir === 'right') { windVx = 10; hasWindX = true; }
                if (fan.dir === 'left') { windVx = -10; hasWindX = true; }
                if (fan.dir === 'up') { windVy = -8; hasWindY = true; }
                if (fan.dir === 'down') { windVy = 10; hasWindY = true; }
            }
        }
    }
    
    if (hasWindX) player.vx = windVx;
    if (hasWindY) player.vy = windVy;

    // Horizontal Collision
    player.x += player.vx;
    player.wallSliding = false;
    let touchingWallDir = 0; // -1 for left, 1 for right

    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            if (player.vx > 0) {
                player.x = platform.x - player.width;
                touchingWallDir = 1;
            } else if (player.vx < 0) {
                player.x = platform.x + platform.width;
                touchingWallDir = -1;
            }
            player.vx = 0;
            if (!player.grounded && player.vy > 0 && !player.isDashing) {
                player.wallSliding = true;
            }
        }
    }

    // Vertical Collision
    player.y += player.vy;
    player.grounded = false;

    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            if (player.vy > 0) {
                player.y = platform.y - player.height;
                player.grounded = true;
                player.wallSliding = false;
            } else if (player.vy < 0) {
                player.y = platform.y + platform.height;
            }
            player.vy = 0;
        }
    }

    // Jump Logic
    if (keys.ArrowUp && !player.isDucking) {
        if (player.grounded) {
            player.vy = player.jumpPower;
            player.grounded = false;
            keys.ArrowUp = false; // Require release to jump again
        } else if (player.wallSliding) {
            // Wall Jump
            player.vy = player.jumpPower * 0.9;
            player.vx = touchingWallDir === 1 ? -player.speed * 1.5 : player.speed * 1.5;
            player.facingRight = touchingWallDir !== 1;
            player.wallSliding = false;
            player.wallJumpCooldown = 15; // Lock horizontal control briefly
            keys.ArrowUp = false;
        }
    }

    // Shoot Logic
    if (player.shootCooldown > 0) player.shootCooldown--;
    
    if (keys.x && player.shootCooldown <= 0) {
        projectiles.push({
            x: player.facingRight ? player.x + player.width : player.x - 8,
            y: player.y + player.height / 2 - 2,
            width: 8,
            height: 4,
            vx: player.facingRight ? 15 : -15,
            color: '#ffff00'
        });
        player.shootCooldown = 10; // Frames until next shot
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        // Remove if off screen
        if (p.x < 0 || p.x > canvas.width) {
            projectiles.splice(i, 1);
        }
    }

    // Check Goal Collision
    if (checkCollision(player, goal)) {
        levelComplete = true;
    }
}

function draw() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#444';
    for (let platform of platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw goal
    ctx.fillStyle = goal.color;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    // Draw fans
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#fff';
    for (let fan of fans) {
        ctx.fillRect(fan.x, fan.y, fan.width, fan.height);
        ctx.strokeRect(fan.x, fan.y, fan.width, fan.height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(fan.dir, fan.x + 5, fan.y + 25);
        ctx.fillStyle = '#888';
        
        // Draw wind particles/lines (full beam indication)
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        if (fan.dir === 'right') ctx.fillRect(fan.x + fan.width, fan.y + 10, canvas.width, 20);
        if (fan.dir === 'left') ctx.fillRect(0, fan.y + 10, fan.x, 20);
        if (fan.dir === 'up') ctx.fillRect(fan.x + 10, 0, 20, fan.y);
        if (fan.dir === 'down') ctx.fillRect(fan.x + 10, fan.y + fan.height, 20, canvas.height);
    }

    // Draw projectiles
    for (let p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }

    // Draw player
    ctx.fillStyle = player.isDashing ? '#00ffff' : player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player eyes/direction indicator
    ctx.fillStyle = '#fff';
    const eyeX = player.facingRight ? player.x + 20 : player.x + 5;
    ctx.fillRect(eyeX, player.y + 10, 5, 5);

    if (levelComplete) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '40px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '20px "Courier New"';
        ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
