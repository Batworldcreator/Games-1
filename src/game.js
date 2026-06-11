// Configuración de Phaser 3 optimizada para PC y Tablets
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

let player;
let cursors;
let resources;
let animals;
let joystickBase;
let joystickThumb;
let isDragging = false;

let playerStats = {
    level: 1,
    xp: 0,
    xpNeeded: 100,
    magicBranch: null,
    inventory: { manos: 1, madera: 0, piedra: 0, oro: 0, baya: 5, coco: 3 },
    equippedTool: 'manos',
    pets: []
};

function preload() {}

function create() {
    // Mapa grande dividido en 2 Biomas (Pradera arriba, Desierto abajo)
    this.physics.world.setBounds(0, 0, 3200, 3200);

    // Dibujar fondos con profundidad (Depth -1 para que queden AL FONDO)
    let praderaBg = this.add.rectangle(1600, 800, 3200, 1600, 0x567d46).setDepth(-1); 
    let desiertoBg = this.add.rectangle(1600, 2400, 3200, 1600, 0xe4a853).setDepth(-1); 

    // Crear al jugador justo en el centro del mapa para que no aparezca en el vacío
    player = this.add.circle(1600, 800, 20, 0x3498db);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    resources = this.physics.add.staticGroup();
    animals = this.physics.add.group();

    // Generar Recursos y Criaturas
    generateMapObjects(this);

    // Cámara configurada para seguir al jugador en el centro
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 3200, 3200);

    // Controles de PC
    cursors = this.input.keyboard.createCursorKeys();

    // --- CONTROLES PARA TABLET (Joystick Virtual en pantalla) ---
    // Círculo grande de fondo del joystick (abajo a la izquierda)
    joystickBase = this.add.circle(120, window.innerHeight - 120, 60, 0xffffff, 0.2).setScrollFactor(0).setDepth(10);
    // Círculo pequeño central que se mueve con el dedo
    joystickThumb = this.add.circle(120, window.innerHeight - 120, 25, 0xffffff, 0.5).setScrollFactor(0).setDepth(11);

    // Eventos táctiles para mover el Joystick
    this.input.on('pointerdown', (pointer) => {
        // Si toca cerca del joystick, se activa el arrastre
        let dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, joystickBase.x, joystickBase.y);
        if (dist < 80) {
            isDragging = true;
        } else {
            // Si toca en otra parte de la pantalla, es para interactuar/atacar
            handleInteraction(this, pointer);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isDragging) {
            let angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
            let dist = Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
            
            // Limitar el movimiento del botón pequeño dentro del círculo grande
            dist = Math.min(dist, 50);
            
            joystickThumb.x = joystickBase.x + Math.cos(angle) * dist;
            joystickThumb.y = joystickBase.y + Math.sin(angle) * dist;

            // Mover al jugador en la dirección del joystick
            player.body.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
            player.rotation = angle; // El personaje mira hacia donde camina
        }
    });

    this.input.on('pointerup', () => {
        isDragging = false;
        // Resetear la posición del joystick central
        joystickThumb.x = joystickBase.x;
        joystickThumb.y = joystickBase.y;
        player.body.setVelocity(0, 0);
    });

    // Texto de Interfaz (HUD) fijo en pantalla
    this.uiText = this.add.text(20, 20, '', { font: '18px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(10);
    updateUI();
}

function update() {
    // Si no se está usando el joystick táctil, permitir controles de teclado de PC
    if (!isDragging) {
        player.body.setVelocity(0);
        let speed = 200;

        if (cursors.left.isDown) player.body.setVelocityX(-speed);
        else if (cursors.right.isDown) player.body.setVelocityX(speed);
        if (cursors.up.isDown) player.body.setVelocityY(-speed);
        else if (cursors.down.isDown) player.body.setVelocityY(speed);

        // En PC rota hacia el puntero del mouse
        let pointer = this.input.activePointer;
        if (!this.sys.game.device.input.touch) {
            player.rotation = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        }
    }

    // IA de las Mascotas para que sigan a su dueño
    animals.children.iterate((animal) => {
        if (animal && animal.getData('isTamed')) {
            let dist = Phaser.Math.Distance.Between(animal.x, animal.y, player.x, player.y);
            if (dist > 60) {
                this.physics.moveToObject(animal, player, animal.getData('speed'));
            } else {
                animal.body.setVelocity(0);
            }
        }
    });
}

function generateMapObjects(scene) {
    for (let i = 0; i < 40; i++) {
        let x = Phaser.Math.Between(200, 3000);
        let y = Phaser.Math.Between(200, 3000);

        if (y < 1600) { // Pradera
            let tree = scene.add.circle(x, y, 30, 0x2ecc71);
            tree.setData({ type: 'tree', hp: 3, res: 'madera' });
            resources.add(tree);

            if (i % 4 === 0) {
                let bunny = scene.add.circle(x + 40, y + 40, 15, 0xffffff);
                scene.physics.add.existing(bunny);
                bunny.setData({ type: 'Conejo', diet: 'herbivore', favFood: 'baya', hp: 20, speed: 140, isTamed: false });
                animals.add(bunny);
            }
        } else { // Desierto
            let cactus = scene.add.circle(x, y, 25, 0x1abc9c);
            cactus.setData({ type: 'cactus', hp: 4, res: 'piedra' });
            resources.add(cactus);

            if (i % 4 === 0) {
                let wolf = scene.add.circle(x + 40, y + 40, 18, 0x7f8c8d);
                scene.physics.add.existing(wolf);
                wolf.setData({ type: 'Lobo', diet: 'carnivore', hp: 50, speed: 110, isTamed: false });
                animals.add(wolf);
            }
        }
    }
}

function handleInteraction(scene, pointer) {
    let worldX = pointer.worldX;
    let worldY = pointer.worldY;

    resources.children.iterate((res) => {
        if (res && Phaser.Math.Distance.Between(worldX, worldY, res.x, res.y) < 50) {
            if (Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y) < 100) {
                let hp = res.getData('hp') - 1;
                res.setData('hp', hp);
                scene.tweens.add({ targets: res, scale: 1.2, duration: 50, yoyo: true });
                if (hp <= 0) {
                    let rType = res.getData('res');
                    playerStats.inventory[rType] += 5;
                    gainXP(25);
                    res.destroy();
                }
            }
        }
    });

    animals.children.iterate((animal) => {
        if (animal && Phaser.Math.Distance.Between(worldX, worldY, animal.x, animal.y) < 50) {
            if (Phaser.Math.Distance.Between(player.x, player.y, animal.x, animal.y) < 100) {
                if (!animal.getData('isTamed')) {
                    if (animal.getData('diet') === 'herbivore') {
                        if (playerStats.inventory.baya > 0) {
                            playerStats.inventory.baya--;
                            tameAnimal(animal);
                        }
                    } else {
                        let currentHp = animal.getData('hp') - 10;
                        animal.setData('hp', currentHp);
                        if (currentHp <= 10) {
                            tameAnimal(animal);
                        }
                    }
                }
            }
        }
    });
}

function tameAnimal(animal) {
    animal.setData('isTamed', true);
    animal.setFillStyle(0xe74c3c); // Cambia a rojo (mascota aliada)
    playerStats.pets.push(animal.getData('type'));
    updateUI();
}

function gainXP(amount) {
    playerStats.xp += amount;
    if (playerStats.xp >= playerStats.xpNeeded) {
        playerStats.level++;
        playerStats.xp -= playerStats.xpNeeded;
        playerStats.xpNeeded = Math.floor(playerStats.xpNeeded * 1.6);
    }
    updateUI();
}

function updateUI() {
    let petList = playerStats.pets.length > 0 ? playerStats.pets.join(', ') : 'Ninguna';
    game.scene.scenes[0].uiText.setText(
        `Nivel: ${playerStats.level} (XP: ${playerStats.xp}/${playerStats.xpNeeded})\n` +
        `Madera: ${playerStats.inventory.madera} | Piedra: ${playerStats.inventory.piedra}\n` +
        `Bayas: ${playerStats.inventory.baya}\n` +
        `Mascotas: ${petList}`
    );
}
