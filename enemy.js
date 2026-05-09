import { CONFIG } from './config.js';
import { checkCollision, applyWind } from './physics.js';

export class Enemy {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.ENEMY.WIDTH;
        this.height = CONFIG.ENEMY.HEIGHT;
        this.baseVx = vx || CONFIG.ENEMY.BASE_SPEED;
        this.vx = this.baseVx;
        this.vy = 0;
    }

    update(dt, platforms, fans) {
        this.vx = this.baseVx;
        this.vy += CONFIG.PHYSICS.GRAVITY * dt;
        if (this.vy > CONFIG.PHYSICS.MAX_FALL_SPEED) this.vy = CONFIG.PHYSICS.MAX_FALL_SPEED;

        applyWind(this, fans, CONFIG);

        let dx = this.vx * dt;
        let dy = this.vy * dt;

        this.y += dy;
        
        // Vertical collision
        for (let platform of platforms) {
            if (checkCollision(this, platform)) {
                if (dy > 0) this.y = platform.y - this.height;
                else if (dy < 0) this.y = platform.y + platform.height;
                this.vy = 0;
                dy = 0;
            }
        }

        this.x += dx;
        
        let hitWall = false;
        for (let platform of platforms) {
            if (checkCollision(this, platform)) {
                hitWall = true;
                if (dx > 0) this.x = platform.x - this.width;
                else if (dx < 0) this.x = platform.x + platform.width;
            }
        }
        
        // Edge detection
        let checkX = this.baseVx > 0 ? this.x + this.width + 5 : this.x - 5;
        let checkY = this.y + this.height + 5;
        let hasFloor = false;
        for (let platform of platforms) {
            if (checkX >= platform.x && checkX <= platform.x + platform.width &&
                checkY >= platform.y && checkY <= platform.y + platform.height) {
                hasFloor = true;
                break;
            }
        }
        
        if (hitWall || (!hasFloor && this.vy === 0)) {
            this.baseVx *= -1;
            this.vx = this.baseVx;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        let dir = this.vx > 0 ? 2 : -2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 4 + dir, this.y + 8, 8, 8);
        ctx.fillRect(this.x + 18 + dir, this.y + 8, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 6 + dir, this.y + 10, 4, 4);
        ctx.fillRect(this.x + 20 + dir, this.y + 10, 4, 4);
    }
}
