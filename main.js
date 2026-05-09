import { CONFIG } from './config.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { InputManager } from './input.js';
import { checkCollision } from './physics.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const inputManager = new InputManager();

let player;
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
let projectiles = [];
let levelComplete = false;

// Initialize Level
function initLevel() {
    player = new Player(CONFIG.PLAYER.START_X, CONFIG.PLAYER.START_Y);
    
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
                enemies = levelData.enemies.map(en => new Enemy(en.x, en.y, en.vx));
            }
        } catch(e) {}
    }
}

document.getElementById('btn-replay').addEventListener('click', () => {
    location.reload();
});

function gameOver(win) {
    levelComplete = true;
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('end-title').innerText = win ? 'You Win!' : 'You Lose!';
    document.getElementById('end-title').style.color = win ? '#00ff00' : '#ff0000';
}

function updateMovingObjects() {
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
                            player.takeDamage(CONFIG.PLAYER.DAMAGE_TAKEN, () => gameOver(false));
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
                            player.takeDamage(CONFIG.PLAYER.DAMAGE_TAKEN, () => gameOver(false));
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
                                    player.takeDamage(CONFIG.PLAYER.DAMAGE_TAKEN, () => gameOver(false));
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
}

function update() {
    if (levelComplete) return;

    updateMovingObjects();

    player.update(inputManager.getKeys(), platforms, fans, projectiles);

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.update();
        if (p.isOffScreen(canvas.width)) {
            projectiles.splice(i, 1);
        }
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i];
        en.update(platforms, fans);
        
        // Check collision with player
        if (checkCollision(player, en) && player.invincibilityTimer === 0) {
            if (player.vy > 0 && player.y + player.height < en.y + en.height / 2 + 10) {
                enemies.splice(i, 1);
                player.vy = CONFIG.PLAYER.JUMP_POWER * 0.8; // bounce off enemy
                continue;
            } else {
                player.takeDamage(CONFIG.ENEMY.DAMAGE, () => gameOver(false));
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
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#444';
    for (let platform of platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    ctx.fillStyle = goal.color;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#fff';
    for (let fan of fans) {
        ctx.fillRect(fan.x, fan.y, fan.width, fan.height);
        ctx.strokeRect(fan.x, fan.y, fan.width, fan.height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(fan.dir, fan.x + 5, fan.y + 25);
        ctx.fillStyle = '#888';
        
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        if (fan.dir === 'right') ctx.fillRect(fan.x + fan.width, fan.y + 10, canvas.width, 20);
        if (fan.dir === 'left') ctx.fillRect(0, fan.y + 10, fan.x, 20);
        if (fan.dir === 'up') ctx.fillRect(fan.x + 10, 0, 20, fan.y);
        if (fan.dir === 'down') ctx.fillRect(fan.x + 10, fan.y + fan.height, 20, canvas.height);
    }

    for (let p of projectiles) p.draw(ctx);
    for (let en of enemies) en.draw(ctx);
    
    player.draw(ctx);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

initLevel();
gameLoop();
