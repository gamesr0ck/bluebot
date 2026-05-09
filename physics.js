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

export function handlePortals(entity, portals) {
    let touchingAnyPortal = false;
    for (let portal of portals) {
        if (checkCollision(entity, portal)) {
            touchingAnyPortal = true;
            if (entity.lastPortal !== portal) {
                let portalB = portal.pair;
                if (!portalB) continue;

                let v_x = entity.vx;
                let v_y = entity.vy;
                let dirA = portal.dir;
                let dirB = portalB.dir;

                const getVectors = (dir) => {
                    switch(dir) {
                        case 'up': return { N: {x: 0, y: -1}, T: {x: 1, y: 0} };
                        case 'right': return { N: {x: 1, y: 0}, T: {x: 0, y: 1} };
                        case 'down': return { N: {x: 0, y: 1}, T: {x: -1, y: 0} };
                        case 'left': return { N: {x: -1, y: 0}, T: {x: 0, y: -1} };
                    }
                };

                let vecA = getVectors(dirA);
                let vecB = getVectors(dirB);

                let v_n = -(v_x * vecA.N.x + v_y * vecA.N.y);
                let v_t = (v_x * vecA.T.x + v_y * vecA.T.y);

                if (v_n <= 0) continue; 

                entity.vx = v_n * vecB.N.x + v_t * vecB.T.x;
                entity.vy = v_n * vecB.N.y + v_t * vecB.T.y;

                if (dirB === 'up') {
                    entity.x = portalB.x + portalB.width / 2 - entity.width / 2;
                    entity.y = portalB.y - entity.height;
                } else if (dirB === 'down') {
                    entity.x = portalB.x + portalB.width / 2 - entity.width / 2;
                    entity.y = portalB.y + portalB.height;
                } else if (dirB === 'left') {
                    entity.x = portalB.x - entity.width;
                    entity.y = portalB.y + portalB.height / 2 - entity.height / 2;
                } else if (dirB === 'right') {
                    entity.x = portalB.x + portalB.width;
                    entity.y = portalB.y + portalB.height / 2 - entity.height / 2;
                }

                entity.lastPortal = portalB;
                
                if (entity.portalMomentumTimer !== undefined) {
                    entity.portalMomentumTimer = 15;
                }
                
                break;
            }
        }
    }

    if (!touchingAnyPortal) {
        entity.lastPortal = null;
    }
}
