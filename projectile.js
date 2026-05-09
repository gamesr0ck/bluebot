export class Projectile {
    constructor(x, y, vx, config) {
        this.x = x;
        this.y = y;
        this.width = config.PROJECTILE.WIDTH;
        this.height = config.PROJECTILE.HEIGHT;
        this.vx = vx;
        this.color = config.PROJECTILE.COLOR;
    }

    update(dt) {
        this.x += this.vx * dt;
    }

    isOffScreen(canvasWidth) {
        return this.x < 0 || this.x > canvasWidth;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
