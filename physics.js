export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function applyWind(entity, fans, config) {
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
                
                if (fan.dir === 'right') { windVx = config.PHYSICS.WIND_FORCE_X; hasWindX = true; }
                if (fan.dir === 'left') { windVx = -config.PHYSICS.WIND_FORCE_X; hasWindX = true; }
                if (fan.dir === 'up') { windVy = config.PHYSICS.WIND_FORCE_Y_UP; hasWindY = true; }
                if (fan.dir === 'down') { windVy = config.PHYSICS.WIND_FORCE_Y_DOWN; hasWindY = true; }
            }
        }
    }
    
    if (hasWindX) entity.vx = windVx;
    if (hasWindY) entity.vy = windVy;
}
