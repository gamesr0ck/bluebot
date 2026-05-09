export const CONFIG = {
    PHYSICS: {
        GRAVITY: 0.6,
        MAX_FALL_SPEED: 12,
        WIND_FORCE_X: 10,
        WIND_FORCE_Y_UP: -8,
        WIND_FORCE_Y_DOWN: 10,
    },
    PLAYER: {
        START_X: 50,
        START_Y: 50,
        WIDTH: 30,
        HEIGHT: 40,
        DUCK_HEIGHT: 20,
        SPEED: 5,
        DASH_SPEED: 10,
        JUMP_POWER: -12,
        WALL_JUMP_POWER: -10.8, // -12 * 0.9
        WALL_JUMP_SPEED: 7.5,   // 5 * 1.5
        DASH_DURATION: 15,
        DASH_COOLDOWN: 30,
        WALL_JUMP_COOLDOWN: 15,
        SHOOT_COOLDOWN: 10,
        INVINCIBILITY_FRAMES: 30,
        DAMAGE_TAKEN: 20,
        COLOR: '#00aaff',
        DASH_COLOR: '#00ffff'
    },
    ENEMY: {
        WIDTH: 30,
        HEIGHT: 30,
        BASE_SPEED: -2,
        DAMAGE: 20
    },
    PROJECTILE: {
        WIDTH: 8,
        HEIGHT: 4,
        SPEED: 15,
        COLOR: '#ffff00'
    }
};
