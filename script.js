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

// Mobile Controls
const controlBtns = document.querySelectorAll('.control-btn');
controlBtns.forEach(btn => {
    const key = btn.getAttribute('data-key');
    
    // Touch events
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[key] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[key] = false;
        btn.classList.remove('active');
    });
    
    // Mouse events for testing on desktop
    btn.addEventListener('mousedown', (e) => {
        keys[key] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('mouseup', (e) => {
        keys[key] = false;
        btn.classList.remove('active');
    });
    btn.addEventListener('mouseleave', (e) => {
        keys[key] = false;
        btn.classList.remove('active');
    });
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
    isDucking: false,
    currentPlatform: null,
    invincibilityTimer: 0
};

let platforms = [
    { x: 0, y: 550, width: 1200, height: 50 }, // Floor
    { x: 200, y: 450, width: 100, height: 20 },
    { x: 400, y: 350, width: 150, height: 20 },
    { x: 650, y: 250, width: 100, height: 20 },
    { x: 0, y: 0, width: 20, height: 600 }, // Left wall
    { x: 1180, y: 0, width: 20, height: 600 }, // Right wall
    { x: 300, y: 150, width: 20, height: 200 }, // Wall jump test wall
];

let goal = { x: 700, y: 150, width: 40, height: 100, color: '#00ff00' };
let fans = [];
let enemies = [];

const savedLevel = localStorage.getItem('customLevel');
if (savedLevel) {
    try {
        const levelData = JSON.parse(savedLevel);
        if (levelData.platforms) {
            platforms = levelData.platforms;
            for (let p of platforms) {
                if (p.moving && p.startX === undefined) { p.startX = p.x; p.startY = p.y; }
            }
        }
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
        if (levelData.fans) {
            fans = levelData.fans;
            for (let f of fans) {
                if (f.moving && f.startX === undefined) { f.startX = f.x; f.startY = f.y; }
            }
        }
        if (levelData.enemies) {
            enemies = levelData.enemies;
            for (let en of enemies) {
                en.vy = 0;
                if (!en.vx) en.vx = -2;
            }
        }
    } catch(e) {}
}
let levelComplete = false;
let playerHealth = 100;
let projectiles = [];

document.getElementById('btn-replay').addEventListener('click', () => {
    location.reload();
});

function gameOver(win) {
    levelComplete = true;
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('end-title').innerText = win ? 'You Win!' : 'You Lose!';
    document.getElementById('end-title').style.color = win ? '#00ff00' : '#ff0000';
}

function takeDamage(amount) {
    if (player.invincibilityTimer > 0) return;
    
    playerHealth -= amount;
    player.invincibilityTimer = 30; // Half a second of invincibility
    
    document.getElementById('health-bar').style.height = playerHealth + '%';
    if (playerHealth <= 0) {
        gameOver(false);
    }
}


function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function applyWind(entity) {
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
        
        let inBlock = checkCollision(entity, fan);
        if (checkCollision(entity, windZone) || inBlock) {
            let dist = Math.abs(entity.x - fan.x) + Math.abs(entity.y - fan.y);
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
    
    if (hasWindX) entity.vx = windVx;
    if (hasWindY) entity.vy = windVy;
}

function update() {
    if (levelComplete) return;

    if (player.invincibilityTimer > 0) {
        player.invincibilityTimer--;
    }

    // Moving Objects Logic
    let allSolids = platforms.concat(fans);
    for (let obj of allSolids) {
        if (obj.moving) {
            let dx = 0;
            let dy = 0;
            if (obj.axis === 'x') {
                dx = obj.speed;
                obj.x += dx;
                if (Math.abs(obj.x - obj.startX) > obj.range) obj.speed *= -1;
            } else if (obj.axis === 'y') {
                dy = obj.speed;
                obj.y += dy;
                if (Math.abs(obj.y - obj.startY) > obj.range) obj.speed *= -1;
            }
            
            let isSolid = platforms.includes(obj);
            if (isSolid) {
                let pushedX = false;
                let pushedY = false;

                // Push player if the platform physically moves into them
                if (obj.axis === 'x' && checkCollision(player, obj)) {
                    player.x += dx;
                    pushedX = true;
                    for (let other of platforms) {
                        if (other !== obj && checkCollision(player, other)) {
                            takeDamage(20);
                            player.x -= dx; // Undo push to stay inside moving platform
                            break;
                        }
                    }
                }
                if (obj.axis === 'y' && checkCollision(player, obj)) {
                    player.y += dy;
                    pushedY = true;
                    for (let other of platforms) {
                        if (other !== obj && checkCollision(player, other)) {
                            takeDamage(20);
                            player.y -= dy; // Undo push to stay inside moving platform
                            break;
                        }
                    }
                }
                
                // Carry player if they are standing on it
                if (player.currentPlatform === obj) {
                    if (obj.axis === 'x' && !pushedX) {
                        player.x += dx;
                        for (let other of platforms) {
                            if (other !== obj && checkCollision(player, other)) {
                                player.x -= dx; // Slide off
                                break;
                            }
                        }
                    }
                    if (obj.axis === 'y' && !pushedY) {
                        player.y += dy;
                        for (let other of platforms) {
                            if (other !== obj && checkCollision(player, other)) {
                                if (dy < 0) {
                                    takeDamage(20);
                                    player.y -= dy; // Undo carry into ceiling
                                    break;
                                } else {
                                    player.y -= dy; // Undo carry into floor
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

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
    applyWind(player);

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
    player.currentPlatform = null;

    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            if (player.vy > 0) {
                player.y = platform.y - player.height;
                player.grounded = true;
                player.wallSliding = false;
                player.currentPlatform = platform;
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

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i];
        
        if (en.baseVx === undefined) en.baseVx = en.vx || -2;
        en.vx = en.baseVx;
        
        // Apply gravity
        en.vy = (en.vy || 0) + player.gravity;
        if (en.vy > player.maxFallSpeed) en.vy = player.maxFallSpeed;
        
        // Apply wind
        applyWind(en);
        
        en.y += en.vy;
        
        // Vertical collision for enemies
        for (let platform of platforms) {
            if (checkCollision(en, platform)) {
                if (en.vy > 0) {
                    en.y = platform.y - en.height;
                } else if (en.vy < 0) {
                    en.y = platform.y + platform.height;
                }
                en.vy = 0;
            }
        }

        // Horizontal movement
        en.x += en.vx;
        
        // Horizontal collision for enemies
        let hitWall = false;
        for (let platform of platforms) {
            if (checkCollision(en, platform)) {
                hitWall = true;
                if (en.vx > 0) {
                    en.x = platform.x - en.width;
                } else if (en.vx < 0) {
                    en.x = platform.x + platform.width;
                }
            }
        }
        
        // Edge detection (Goomba style)
        let checkX = en.baseVx > 0 ? en.x + en.width + 5 : en.x - 5;
        let checkY = en.y + en.height + 5;
        let hasFloor = false;
        for (let platform of platforms) {
            if (checkX >= platform.x && checkX <= platform.x + platform.width &&
                checkY >= platform.y && checkY <= platform.y + platform.height) {
                hasFloor = true;
                break;
            }
        }
        
        if (hitWall || (!hasFloor && en.vy === 0)) {
            en.baseVx *= -1; // reverse direction
            en.vx = en.baseVx;
        }
        
        // Check collision with player
        if (checkCollision(player, en) && player.invincibilityTimer === 0) {
            // Did player jump on top?
            if (player.vy > 0 && player.y + player.height < en.y + en.height / 2 + 10) {
                enemies.splice(i, 1);
                player.vy = player.jumpPower * 0.8; // bounce off enemy
                continue;
            } else {
                takeDamage(20);
                if (!player.isDashing) {
                    player.vx = player.x < en.x ? -5 : 5;
                    player.vy = -5; // Knockback
                }
            }
        }
        
        // Check collision with projectiles
        for (let j = projectiles.length - 1; j >= 0; j--) {
            if (checkCollision(projectiles[j], en)) {
                projectiles.splice(j, 1);
                enemies.splice(i, 1);
                break;
            }
        }
    }

    // Check Goal Collision
    if (checkCollision(player, goal)) {
        gameOver(true);
    }
    
    // Check Pit Death
    if (player.y > canvas.height + 50) {
        gameOver(false);
    }
    
    // Check Health Death
    if (playerHealth <= 0) {
        gameOver(false);
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

    // Draw enemies
    for (let en of enemies) {
        ctx.fillStyle = '#cc0000'; // Red body
        ctx.fillRect(en.x, en.y, en.width, en.height);
        
        // Angry eyes
        let dir = en.vx > 0 ? 2 : -2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(en.x + 4 + dir, en.y + 8, 8, 8);
        ctx.fillRect(en.x + 18 + dir, en.y + 8, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(en.x + 6 + dir, en.y + 10, 4, 4);
        ctx.fillRect(en.x + 20 + dir, en.y + 10, 4, 4);
    }

    // Draw player (humanoid robot)
    if (player.invincibilityTimer === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        const cx = player.x + player.width / 2;
        const py = player.y;
        
        ctx.fillStyle = player.isDashing ? '#00ffff' : player.color;
        
        if (player.isDucking) {
            // Helmet
            ctx.fillRect(cx - 9, py, 18, 14);
            // Face
            ctx.fillStyle = '#ffccaa';
            ctx.fillRect(player.facingRight ? cx : cx - 9, py + 4, 9, 8);
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(player.facingRight ? cx + 4 : cx - 7, py + 6, 3, 3);
            // Body (squished)
            ctx.fillStyle = player.isDashing ? '#00ffff' : '#0055aa';
            ctx.fillRect(cx - 10, py + 14, 20, 6);
        } else {
            // Helmet
            ctx.fillRect(cx - 9, py, 18, 14);
            // Face
            ctx.fillStyle = '#ffccaa';
            ctx.fillRect(player.facingRight ? cx : cx - 9, py + 4, 9, 8);
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(player.facingRight ? cx + 4 : cx - 7, py + 6, 3, 3);
            
            // Body
            ctx.fillStyle = player.isDashing ? '#00ffff' : '#0055aa';
            ctx.fillRect(cx - 7, py + 14, 14, 16);
            
            // Legs
            ctx.fillStyle = player.isDashing ? '#00ffff' : player.color;
            if (player.vx !== 0 && player.grounded && !player.wallSliding) {
                // Running
                const time = Date.now() / 100;
                const legOffset = Math.sin(time) * 5;
                ctx.fillRect(cx - 6 + legOffset, py + 30, 5, 10);
                ctx.fillRect(cx + 1 - legOffset, py + 30, 5, 10);
            } else if (!player.grounded) {
                // Jumping
                ctx.fillRect(cx - 8, py + 28, 6, 8);
                ctx.fillRect(cx + 2, py + 28, 6, 8);
            } else {
                // Standing
                ctx.fillRect(cx - 6, py + 30, 5, 10);
                ctx.fillRect(cx + 1, py + 30, 5, 10);
            }
            
            // Arm / Buster
            ctx.fillStyle = player.isDashing ? '#ffffff' : '#00aaaa';
            if (player.facingRight) {
                ctx.fillRect(cx + 3, py + 18, 12, 6);
            } else {
                ctx.fillRect(cx - 15, py + 18, 12, 6);
            }
        }
    }

}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
