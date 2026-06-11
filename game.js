const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Ajustar tamaño del canvas al de la pantalla de la tablet
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Configuración del jugador
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: "#e0ae62", 
    speed: 5
};

// Configuración del Joystick Virtual
const joystick = {
    startX: 120,       // Posición X en la pantalla
    startY: 0,         // Se calcula dinámicamente abajo
    currentX: 120,
    currentY: 0,
    baseRadius: 50,    // Tamaño del círculo exterior
    stickRadius: 25,   // Tamaño del stick central
    active: false,
    touchId: null,
    vx: 0,             // Velocidad horizontal calculada
    vy: 0              // Velocidad vertical calculada
};
joystick.startY = canvas.height - 120;
joystick.currentY = joystick.startY;

// Controles de teclado (se mantienen)
const keys = {};
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// --- EVENTOS TÁCTILES PARA TABLET ---
canvas.addEventListener("touchstart", (e) => {
    // Detectamos si el toque es en la zona del joystick (lado izquierdo de la pantalla)
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        if (touch.clientX < canvas.width / 2 && !joystick.active) {
            joystick.active = true;
            joystick.touchId = touch.identifier;
            joystick.currentX = touch.clientX;
            joystick.currentY = touch.clientY;
        }
    }
});

canvas.addEventListener("touchmove", (e) => {
    if (!joystick.active) return;
    
    for (let i = 0; i < e.touches.length; i++) {
        let touch = e.touches[i];
        if (touch.identifier === joystick.touchId) {
            // Calcular distancia desde el centro del joystick
            let dx = touch.clientX - joystick.startX;
            let dy = touch.clientY - joystick.startY;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // Limitar el movimiento del stick dentro del radio base
            if (distance < joystick.baseRadius) {
                joystick.currentX = touch.clientX;
                joystick.currentY = touch.clientY;
            } else {
                let angle = Math.atan2(dy, dx);
                joystick.currentX = joystick.startX + Math.cos(angle) * joystick.baseRadius;
                joystick.currentY = joystick.startY + Math.sin(angle) * joystick.baseRadius;
            }

            // Calcular valores de dirección (-1 a 1)
            joystick.vx = (joystick.currentX - joystick.startX) / joystick.baseRadius;
            joystick.vy = (joystick.currentY - joystick.startY) / joystick.baseRadius;
        }
    }
});

canvas.addEventListener("touchend", (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        if (touch.identifier === joystick.touchId) {
            joystick.active = false;
            joystick.touchId = null;
            joystick.currentX = joystick.startX;
            joystick.currentY = joystick.startY;
            joystick.vx = 0;
            joystick.vy = 0;
        }
    }
});

// Actualizar posición del personaje
function update() {
    // Movimiento por Teclado
    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    // Movimiento por Joystick (Tablet)
    if (joystick.active) {
        player.x += joystick.vx * player.speed;
        player.y += joystick.vy * player.speed;
    }

    // Límites de la pantalla
    if (player.x - player.radius < 0) player.x = player.radius;
    if (player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;
    if (player.y - player.radius < 0) player.y = player.radius;
    if (player.y + player.radius > canvas.height) player.y = canvas.height - player.radius;
}

// Dibujar todo
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar jugador
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#4a3b2c"; 
    ctx.stroke();
    ctx.closePath();

    // 2. Dibujar Joystick si estamos en modo táctil / tablet
    // Base del joystick (aro transparente)
    ctx.beginPath();
    ctx.arc(joystick.startX, joystick.startY, joystick.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();

    // Centro del joystick (el stick que se mueve)
    ctx.beginPath();
    ctx.arc(joystick.currentX, joystick.currentY, joystick.stickRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fill();
    ctx.closePath();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
