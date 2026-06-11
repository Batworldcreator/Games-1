// Configuración de Phaser 3 adaptada para PC y Tablets
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Estado Global del Jugador (Progreso, Niveles y Recursos)
let player;
let cursors;
let joystick; // Para controles de Tablet
let resources;

let playerStats = {
    level: 1,
    xp: 0,
    xpNeeded: 100,
    magicBranch: null,
    inventory: { manos: 1, madera: 0, piedra: 0, oro: 0 },
    equippedTool: 'manos',
    equippedArmor: 'ninguna'
};

function preload() {
    // Aquí cargarás tus sprites estilo Survev/Taming (círculos para personajes)
    // Usaremos gráficos temporales por código para que funcione ya mismo
}

function create() {
    // 1. Límites del mapa (Mundo infinito/grande por biomas)
    this.physics.world.setBounds(0, 0, 3200, 3200);

    // 2. Crear Jugador (Estilo Survev: un círculo con manos)
    player = this.add.circle(400, 300, 20, 0x3498db);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // 3. Generación básica de recursos (Árboles)
    resources = this.physics.add.staticGroup();
    for (let i = 0; i < 20; i++) {
        let x = Phaser.Math.Between(100, 3100);
        let y = Phaser.Math.Between(100, 3100);
        let tree = this.add.circle(x, y, 30, 0x2ecc71); // Verde = Árbol
        tree.setData('type', 'tree');
        tree.setData('hp', 3); // Golpes necesarios
        resources.add(tree);
    }

    // 4. Cámara que sigue al jugador
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(0, 0, 3200, 3200);

    // 5. Controles para PC
    cursors = this.input.keyboard.createCursorKeys();

    // 6. Controles para Tablet (Joystick Virtual básico si es táctil)
    if (this.sys.game.device.input.touch) {
        setupTabletControls(this);
    }

    // 7. Interacción: Al hacer clic/tocar, golpear recurso
    this.input.on('pointerdown', (pointer) => {
        hitResource(this, pointer);
    });

    // Texto de interfaz (HUD)
    this.uiText = this.add.text(20, 20, '', { font: '18px Arial', fill: '#ffffff' }).setScrollFactor(0);
    updateUI();
}

function update() {
    // Movimiento del jugador (PC y soporte básico)
    player.body.setVelocity(0);

    let speed = 200;

    if (cursors.left.isDown) player.body.setVelocityX(-speed);
    else if (cursors.right.isDown) player.body.setVelocityX(speed);

    if (cursors.up.isDown) player.body.setVelocityY(-speed);
    else if (cursors.down.isDown) player.body.setVelocityY(speed);

    // Rotación del jugador hacia el ratón/toque (Estilo Survev.io)
    let pointer = this.input.activePointer;
    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.rotation = angle;
}

// --- MECÁNICAS DEL JUEGO ---

function hitResource(scene, pointer) {
    // Buscar si el click fue cerca de un árbol
    let worldX = pointer.worldX;
    let worldY = pointer.worldY;

    resources.children.iterate((resource) => {
        if (resource) {
            let distance = Phaser.Math.Distance.Between(player.x, player.y, resource.x, resource.y);
            let clickDistance = Phaser.Math.Distance.Between(worldX, worldY, resource.x, resource.y);

            // Si está cerca del jugador y clickeó el árbol
            if (distance < 80 && clickDistance < 40) {
                let hp = resource.getData('hp') - 1;
                resource.setData('hp', hp);

                // Feedback visual de golpe
                scene.tweens.add({ targets: resource, scale: 1.2, duration: 50, yoyo: true });

                if (hp <= 0) {
                    gainResource(resource.getData('type'));
                    resource.destroy();
                }
            }
        }
    });
}

function gainResource(type) {
    if (type === 'tree') {
        playerStats.inventory.madera += 5;
        gainXP(15); // Da experiencia al recolectar
    }
    
    // Sistema de Crafteo Automático básico para la demo (Mano -> Hacha)
    if (playerStats.inventory.madera >= 10 && playerStats.equippedTool === 'manos') {
        playerStats.equippedTool = 'hacha_madera';
        alert("¡Has fabricado un Hacha de Madera! Ahora puedes picar piedra (Próximamente).");
    }
    updateUI();
}

function gainXP(amount) {
    playerStats.xp += amount;
    if (playerStats.xp >= playerStats.xpNeeded) {
        playerStats.level++;
        playerStats.xp = playerStats.xp - playerStats.xpNeeded;
        // Escala de experiencia (Cada vez cuesta más subir)
        playerStats.xpNeeded = Math.floor(playerStats.xpNeeded * 1.5); 
        
        // Alerta de nivel 5 (Elegir Magia)
        if (playerStats.level === 5) {
            playerStats.magicBranch = prompt("¡Nivel 5! Elige tu poder: (Fuego / Tierra / Agua)");
        } else {
            alert(`¡Subiste al nivel ${playerStats.level}!`);
        }
    }
    updateUI();
}

function updateUI() {
    // Esto actualiza lo que ves en pantalla
    let text = `Nivel: ${playerStats.level} (XP: ${playerStats.xp}/${playerStats.xpNeeded})\n` +
               `Herramienta: ${playerStats.equippedTool}\n` +
               `Madera: ${playerStats.inventory.madera} | Piedra: ${playerStats.inventory.piedra}\n` +
               `Magia: ${playerStats.magicBranch || 'Ninguna (Lvl 5)'}`;
    
    // Nota: En un código completo, aquí se actualizaría la UI de la tablet.
}

function setupTabletControls(scene) {
    // Aquí se dibuja un joystick virtual en la esquina inferior izquierda
    // Usando los eventos 'pointermove' de Phaser para simular el movimiento en Tablet
}
