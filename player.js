import { CONFIG } from './config.js';
import { checkCollision, applyWind } from './physics.js';
import { Projectile } from './projectile.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER.WIDTH;
        this.height = CONFIG.PLAYER.HEIGHT;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.wallSliding = false;
        this.facingRight = true;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.wallJumpCooldown = 0;
        this.shootCooldown = 0;
        this.isDucking = false;
        this.currentPlatform = null;
        this.invincibilityTimer = 0;
        this.health = 100;
    }

    takeDamage(amount, onDeath) {
        if (this.invincibilityTimer > 0) return;
        this.health -= amount;
        this.invincibilityTimer = CONFIG.PLAYER.INVINCIBILITY_FRAMES;
        
        document.getElementById('health-bar').style.height = this.health + '%';
        if (this.health <= 0 && onDeath) {
            onDeath();
        }
    }

    update(keys, platforms, fans, projectiles) {
        if (this.invincibilityTimer > 0) this.invincibilityTimer--;

        // Duck Logic
        if (keys.ArrowDown && this.grounded && !this.isDucking) {
            this.isDucking = true;
            this.height = CONFIG.PLAYER.DUCK_HEIGHT;
            this.y += (CONFIG.PLAYER.HEIGHT - CONFIG.PLAYER.DUCK_HEIGHT);
        } else if (!keys.ArrowDown && this.isDucking) {
            this.isDucking = false;
            this.height = CONFIG.PLAYER.HEIGHT;
            this.y -= (CONFIG.PLAYER.HEIGHT - CONFIG.PLAYER.DUCK_HEIGHT);
        }

        // Dash Logic
        if (keys.c && this.dashCooldown <= 0 && !this.isDashing && !this.isDucking) {
            this.isDashing = true;
            this.dashTimer = CONFIG.PLAYER.DASH_DURATION;
            this.dashCooldown = CONFIG.PLAYER.DASH_COOLDOWN;
        }

        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.isDashing) {
            this.vy = 0;
            this.vx = this.facingRight ? CONFIG.PLAYER.DASH_SPEED : -CONFIG.PLAYER.DASH_SPEED;
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        } else {
            // Normal Horizontal
            if (this.wallJumpCooldown <= 0) {
                if (keys.ArrowLeft && !this.isDucking) {
                    this.vx = -CONFIG.PLAYER.SPEED;
                    this.facingRight = false;
                } else if (keys.ArrowRight && !this.isDucking) {
                    this.vx = CONFIG.PLAYER.SPEED;
                    this.facingRight = true;
                } else {
                    this.vx = 0;
                }
            } else {
                this.wallJumpCooldown--;
            }

            // Apply Gravity
            this.vy += CONFIG.PHYSICS.GRAVITY;
            if (this.wallSliding && this.vy > 2) {
                this.vy = 2; // Slide down slowly
            } else if (this.vy > CONFIG.PHYSICS.MAX_FALL_SPEED) {
                this.vy = CONFIG.PHYSICS.MAX_FALL_SPEED;
            }
        }

        applyWind(this, fans, CONFIG);

        // Horizontal Collision
        this.x += this.vx;
        this.wallSliding = false;
        let touchingWallDir = 0; // -1 for left, 1 for right

        for (let platform of platforms) {
            if (checkCollision(this, platform)) {
                if (this.vx > 0) {
                    this.x = platform.x - this.width;
                    touchingWallDir = 1;
                } else if (this.vx < 0) {
                    this.x = platform.x + platform.width;
                    touchingWallDir = -1;
                }
                this.vx = 0;
                if (!this.grounded && this.vy > 0 && !this.isDashing) {
                    this.wallSliding = true;
                }
            }
        }

        // Vertical Collision
        this.y += this.vy;
        this.grounded = false;
        this.currentPlatform = null;

        for (let platform of platforms) {
            if (checkCollision(this, platform)) {
                if (this.vy > 0) {
                    this.y = platform.y - this.height;
                    this.grounded = true;
                    this.wallSliding = false;
                    this.currentPlatform = platform;
                } else if (this.vy < 0) {
                    this.y = platform.y + platform.height;
                }
                this.vy = 0;
            }
        }

        // Jump Logic
        if (keys.ArrowUp && !this.isDucking) {
            if (this.grounded) {
                this.vy = CONFIG.PLAYER.JUMP_POWER;
                this.grounded = false;
                keys.ArrowUp = false;
            } else if (this.wallSliding) {
                this.vy = CONFIG.PLAYER.WALL_JUMP_POWER;
                this.vx = touchingWallDir === 1 ? -CONFIG.PLAYER.WALL_JUMP_SPEED : CONFIG.PLAYER.WALL_JUMP_SPEED;
                this.facingRight = touchingWallDir !== 1;
                this.wallSliding = false;
                this.wallJumpCooldown = CONFIG.PLAYER.WALL_JUMP_COOLDOWN;
                keys.ArrowUp = false;
            }
        }

        // Shoot Logic
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        if (keys.x && this.shootCooldown <= 0) {
            projectiles.push(new Projectile(
                this.facingRight ? this.x + this.width : this.x - 8,
                this.y + this.height / 2 - 2,
                this.facingRight ? CONFIG.PROJECTILE.SPEED : -CONFIG.PROJECTILE.SPEED,
                CONFIG
            ));
            this.shootCooldown = CONFIG.PLAYER.SHOOT_COOLDOWN;
        }
    }

    draw(ctx) {
        if (this.invincibilityTimer === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
            const cx = this.x + this.width / 2;
            const py = this.y;
            const color = CONFIG.PLAYER.COLOR;
            const dashColor = CONFIG.PLAYER.DASH_COLOR;
            
            if (this.isDucking) {
                ctx.fillStyle = this.isDashing ? dashColor : color;
                ctx.fillRect(cx - 9, py, 18, 14);
                ctx.fillStyle = '#ffccaa';
                ctx.fillRect(this.facingRight ? cx : cx - 9, py + 4, 9, 8);
                ctx.fillStyle = '#000';
                ctx.fillRect(this.facingRight ? cx + 4 : cx - 7, py + 6, 3, 3);
                ctx.fillStyle = this.isDashing ? dashColor : '#0055aa';
                ctx.fillRect(cx - 10, py + 14, 20, 6);
            } else {
                ctx.fillStyle = this.isDashing ? dashColor : color;
                ctx.fillRect(cx - 9, py, 18, 14);
                ctx.fillStyle = '#ffccaa';
                ctx.fillRect(this.facingRight ? cx : cx - 9, py + 4, 9, 8);
                ctx.fillStyle = '#000';
                ctx.fillRect(this.facingRight ? cx + 4 : cx - 7, py + 6, 3, 3);
                
                ctx.fillStyle = this.isDashing ? dashColor : '#0055aa';
                ctx.fillRect(cx - 7, py + 14, 14, 16);
                
                ctx.fillStyle = this.isDashing ? dashColor : color;
                if (this.vx !== 0 && this.grounded && !this.wallSliding) {
                    const time = Date.now() / 100;
                    const legOffset = Math.sin(time) * 5;
                    ctx.fillRect(cx - 6 + legOffset, py + 30, 5, 10);
                    ctx.fillRect(cx + 1 - legOffset, py + 30, 5, 10);
                } else if (!this.grounded) {
                    ctx.fillRect(cx - 8, py + 28, 6, 8);
                    ctx.fillRect(cx + 2, py + 28, 6, 8);
                } else {
                    ctx.fillRect(cx - 6, py + 30, 5, 10);
                    ctx.fillRect(cx + 1, py + 30, 5, 10);
                }
                
                ctx.fillStyle = this.isDashing ? '#ffffff' : '#00aaaa';
                if (this.facingRight) {
                    ctx.fillRect(cx + 3, py + 18, 12, 6);
                } else {
                    ctx.fillRect(cx - 15, py + 18, 12, 6);
                }
            }
        }
    }
}
