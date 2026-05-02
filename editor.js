const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

let tools = ['platform', 'start', 'goal', 'delete'];
let currentTool = 'platform';

let levelData = {
    platforms: [
        { x: 0, y: 550, width: 800, height: 50 }, // Default floor
        { x: 0, y: 0, width: 20, height: 600 }, // Left wall
        { x: 780, y: 0, width: 20, height: 600 } // Right wall
    ],
    start: { x: 50, y: 50 },
    goal: { x: 700, y: 150, width: 40, height: 100 },
    fans: []
};

// Load existing if available
const saved = localStorage.getItem('customLevel');
if (saved) {
    try {
        levelData = JSON.parse(saved);
        if (!levelData.fans) levelData.fans = [];
    } catch(e) {}
}

let isDrawing = false;
let startX = 0;
let startY = 0;
let currentRect = null;

// UI Setup
document.getElementById('tool-platform').addEventListener('click', (e) => setTool('platform', e.target));
document.getElementById('tool-start').addEventListener('click', (e) => setTool('start', e.target));
document.getElementById('tool-goal').addEventListener('click', (e) => setTool('goal', e.target));
document.getElementById('tool-fan').addEventListener('click', (e) => setTool('fan', e.target));
document.getElementById('tool-delete').addEventListener('click', (e) => setTool('delete', e.target));

document.getElementById('btn-clear').addEventListener('click', () => {
    levelData.platforms = [];
    levelData.fans = [];
    draw();
});

document.getElementById('btn-save').addEventListener('click', () => {
    localStorage.setItem('customLevel', JSON.stringify(levelData));
    window.location.href = 'index.html'; // Go back to game
});

function setTool(tool, element) {
    currentTool = tool;
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

let isMovingEnabled = false;
document.getElementById('toggle-moving').addEventListener('click', (e) => {
    isMovingEnabled = !isMovingEnabled;
    e.target.innerText = isMovingEnabled ? 'Moving: ON' : 'Moving: OFF';
    e.target.style.backgroundColor = isMovingEnabled ? '#2a2' : '#555';
});

function getMovingProps() {
    if (!isMovingEnabled) return null;
    return {
        axis: document.getElementById('obj-axis').value,
        speed: parseFloat(document.getElementById('obj-speed').value) || 2,
        range: parseFloat(document.getElementById('obj-range').value) || 100
    };
}

// Canvas events
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'platform') {
        isDrawing = true;
        startX = mouseX;
        startY = mouseY;
        currentRect = { x: startX, y: startY, width: 0, height: 0 };
    } else if (currentTool === 'start') {
        levelData.start = { x: mouseX, y: mouseY };
        draw();
    } else if (currentTool === 'goal') {
        levelData.goal = { x: mouseX, y: mouseY - 100, width: 40, height: 100 }; // Place goal standing on clicked point
        draw();
    } else if (currentTool === 'fan') {
        const dir = document.getElementById('fan-direction').value;
        let f = { x: mouseX, y: mouseY, width: 40, height: 40, dir: dir };
        let m = getMovingProps();
        if (m) {
            f.moving = true;
            f.axis = m.axis;
            f.speed = m.speed;
            f.range = m.range;
            f.startX = f.x;
            f.startY = f.y;
        }
        levelData.fans.push(f);
        draw();
    } else if (currentTool === 'delete') {
        // Find clicked object
        let deleted = false;
        
        // Check start
        if (levelData.start && checkPointInRect(mouseX, mouseY, { x: levelData.start.x, y: levelData.start.y, width: 30, height: 40 })) {
            levelData.start = null;
            deleted = true;
        }
        
        // Check goal
        if (!deleted && levelData.goal && checkPointInRect(mouseX, mouseY, levelData.goal)) {
            levelData.goal = null;
            deleted = true;
        } 
        
        // Check fans
        if (!deleted) {
            for (let i = levelData.fans.length - 1; i >= 0; i--) {
                if (checkPointInRect(mouseX, mouseY, levelData.fans[i])) {
                    levelData.fans.splice(i, 1);
                    deleted = true;
                    break;
                }
            }
        }
        
        // Check platforms
        if (!deleted) {
            for (let i = levelData.platforms.length - 1; i >= 0; i--) {
                if (checkPointInRect(mouseX, mouseY, levelData.platforms[i])) {
                    levelData.platforms.splice(i, 1);
                    break;
                }
            }
        }
        
        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || currentTool !== 'platform') return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    currentRect.x = Math.min(startX, mouseX);
    currentRect.y = Math.min(startY, mouseY);
    currentRect.width = Math.abs(mouseX - startX);
    currentRect.height = Math.abs(mouseY - startY);
    draw();
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && currentTool === 'platform' && currentRect.width > 5 && currentRect.height > 5) {
        let p = { ...currentRect };
        let m = getMovingProps();
        if (m) {
            p.moving = true;
            p.axis = m.axis;
            p.speed = m.speed;
            p.range = m.range;
            p.startX = p.x;
            p.startY = p.y;
        }
        levelData.platforms.push(p);
    }
    isDrawing = false;
    currentRect = null;
    draw();
});

function checkPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#444';
    ctx.strokeStyle = '#222';
    for (let platform of levelData.platforms) {
        ctx.fillStyle = platform.moving ? '#664' : '#444';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        if (platform.moving) {
            ctx.fillStyle = '#ff0';
            ctx.font = '10px Arial';
            ctx.fillText(platform.axis === 'x' ? '↔' : '↕', platform.x + 2, platform.y + 10);
        }
    }

    // Draw current drawing rect
    if (isDrawing && currentRect) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }

    // Draw goal
    if (levelData.goal) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(levelData.goal.x, levelData.goal.y, levelData.goal.width, levelData.goal.height);
    }

    // Draw fans
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#fff';
    for (let fan of levelData.fans) {
        ctx.fillStyle = fan.moving ? '#aa8' : '#888';
        ctx.fillRect(fan.x, fan.y, fan.width, fan.height);
        ctx.strokeRect(fan.x, fan.y, fan.width, fan.height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(fan.dir, fan.x + 5, fan.y + 25);
        if (fan.moving) {
            ctx.fillStyle = '#ff0';
            ctx.font = '10px Arial';
            ctx.fillText(fan.axis === 'x' ? '↔' : '↕', fan.x + 2, fan.y + 10);
        }
        ctx.fillStyle = '#888';
    }

    // Draw start position (player preview)
    if (levelData.start) {
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(levelData.start.x, levelData.start.y, 30, 40); // Standard player size
        ctx.fillStyle = '#fff';
        ctx.fillRect(levelData.start.x + 20, levelData.start.y + 10, 5, 5); // Eyes
    }
}

draw();
