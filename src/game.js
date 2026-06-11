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

let player;
let cursors;
let resources;
let animals;

let playerStats = {
    level: 1,
    xp: 0,
    xpNeeded: 100,
    magicBranch: null,
    inventory: { manos: 1, madera: 0, piedra: 0, oro: 0, baya: 5, coco: 3 },
    equippedTool: 'manos',
    pets: [] // Aquí se guardarán los animales domesticados
};

function preload() {}

function create() {
    // Mapa grande (3200x3200) dividido en 2 Biomas (Pradera arriba, Desierto abajo)
    this.physics.world.setBounds(0, 0, 3200, 3200);

    // Dibujar fondo de Biomas (Ficticio por código)
    let praderaBg = this.add.rectangle(1600, 800, 3200, 1600, 0x567d46); // Verde
    let desiertoBg = this.add.rectangle(1600, 2400, 3200, 1600, 0xe4a853); // Amarillo/Arena

    // Jugador (Estilo Survev.io)
    player = this.add.circle(400, 400, 20, 0x3498db);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    resources = this.physics.add.staticGroup();
    animals = this.physics.add.group();

    // Generar Recursos y Criaturas según el Bioma
    generateMapObjects(this);

    // Cámara
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(0, 0, 3200, 3200);

    // Controles
    cursors = this.input.keyboard.createCursorKeys();

    // Interacción al hacer Clic o Tocar en Tablet
    this.input.on('pointerdown', (pointer) => {
        handleInteraction(this, pointer);
    });

    // Sin fuego amigo entre jugador y mascotas
    this.physics.add.collider(player, animals, handleAnimalCollision, null, this);

    this.uiText = this.add.text(20, 20, '', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);
    updateUI();
}

function update() {
    player.body.setVelocity(0);
    let speed = 200;

    if (cursors.left.isDown) player.body.setVelocityX(-speed);
    else if (cursors.right.isDown) player.body.setVelocityX(speed);
    if (cursors.up.isDown) player.body.setVelocityY(-speed);
    else if (cursors.down.isDown) player.body.setVelocityY(speed);

    // Rotación hacia el toque/mouse
    let pointer = this.input.activePointer;
    player.rotation = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);

    // IA Básica de los animales (Siguen a sus dueños si están domesticados)
    animals.children.iterate((animal) => {
        if (animal && animal.getData('isTamed')) {
            this.physics.moveToObject(animal, player, animal.getData('speed'));
        }
    });
}

// --- GENERACIÓN POR BIOMAS ---
function generateMapObjects(scene) {
    for (let i = 0; i < 30; i++) {
        let x = Phaser.Math.Between(100, 3100);
        let y = Phaser.Math.Between(100, 3100);

        if (y < 1600) { // --- BIOMA PRADERA ---
            // Recurso: Árbol común
            let tree = scene.add.circle(x, y, 25, 0x2ecc71);
            tree.setData({ type: 'tree', hp: 3, res: 'madera' });
            resources.add(tree);

            // Criatura: Conejo (Hervíboro, pacífico, habilidad: Correr)
            if (i % 3 === 0) {
                let bunny = scene.add.circle(x + 30, y + 30, 15, 0xffffff);
                scene.physics.add.existing(bunny);
                bunny.setData({ type: 'Conejo', diet: 'herbivore', favFood: 'baya', hp: 20, maxHp: 20, speed: 150, isTamed: false, ability: 'Súper Velocidad' });
                animals.add(bunny);
            }
        } else { // --- BIOMA DESIERTO ---
            // Recurso único: Cactus (Piedra/Agua)
            let cactus = scene.add.circle(x, y, 20, 0x1abc9c);
            cactus.setData({ type: 'cactus', hp: 4, res: 'piedra' });
            resources.add(cactus);

            // Criatura: Lobo del desierto (Carnívoro, agresivo, habilidad: Atacar)
            if (i % 3 === 0) {
                let wolf = scene.add.circle(x + 30, y + 30, 18, 0x7f8c8d);
                scene.physics.add.existing(wolf);
                wolf.setData({ type: 'Lobo', diet: 'carnivore', hp: 50, maxHp: 50, speed: 120, isTamed: false, ability: 'Mordisco' });
                animals.add(wolf);
            }
        }
    }
}

// --- INTERACCIONES: COMBATE, RECOLECCIÓN Y DOMESTICACIÓN ---
function handleInteraction(scene, pointer) {
    let worldX = pointer.worldX;
    let worldY = pointer.worldY;

    // Verificar si golpeamos un recurso
    resources.children.iterate((res) => {
        if (res && Phaser.Math.Distance.Between(worldX, worldY, res.x, res.y) < 40) {
            if (Phaser.Math.Distance.Between(player.x, player.y, res.x, res.y) < 90) {
                let hp = res.getData('hp') - 1;
                res.setData('hp', hp);
                if (hp <= 0) {
                    let rType = res.getData('res');
                    playerStats.inventory[rType] += 5;
                    gainXP(20);
                    res.destroy();
                }
            }
        }
    });

    // Verificar si interactuamos con un animal
    animals.children.iterate((animal) => {
        if (animal && Phaser.Math.Distance.Between(worldX, worldY, animal.x, animal.y) < 40) {
            let dist = Phaser.Math.Distance.Between(player.x, player.y, animal.x, animal.y);
            if (dist < 90) {
                let isTamed = animal.getData('isTamed');
                
                if (!isTamed) {
                    if (animal.getData('diet') === 'herbivore') {
                        // Domesticar Herbívoro con Frutas (Baya)
                        let food = animal.getData('favFood');
                        if (playerStats.inventory[food] > 0) {
                            playerStats.inventory[food]--;
                            tameAnimal(animal);
                        } else {
                            alert(`Necesitas ${food} para domesticar a este animal pacífico.`);
                        }
                    } else if (animal.getData('diet') === 'carnivore') {
                        // Domesticar Carnívoro bajándole la vida
                        let currentHp = animal.getData('hp') - 10;
                        animal.setData('hp', currentHp);
                        
                        if (currentHp <= 10 && currentHp > 0) {
                            let opcion = confirm("¡El carnívoro está débil! ¿Quieres domesticarlo? (Aceptar) o ¿Matarlo para XP? (Cancelar)");
                            if (opcion) {
                                tameAnimal(animal);
                            } else {
                                gainXP(50);
                                animal.destroy();
                            }
                        }
                    }
                } else {
                    // Si ya está domesticado, activa su habilidad básica
                    alert(`¡Tu mascota ${animal.getData('type')} usó: ${animal.getData('ability')}!`);
                }
            }
        }
    });
}

function tameAnimal(animal) {
    animal.setData('isTamed', true);
    animal.setFillStyle(0xe74c3c); // Cambia de color para saber que es tuyo
    playerStats.pets.push(animal.getData('type'));
    alert(`¡Has domesticado un ${animal.getData('type')}! Ahora te seguirá.`);
    updateUI();
}

function handleAnimalCollision(player, animal) {
    // NO HAY FUEGO AMIGO si está domesticado
    if (animal.getData('isTamed')) {
        animal.body.setVelocity(0);
    }
}

function gainXP(amount) {
    playerStats.xp += amount;
    if (playerStats.xp >= playerStats.xpNeeded) {
        playerStats.level++;
        playerStats.xp -= playerStats.xpNeeded;
        playerStats.xpNeeded = Math.floor(playerStats.xpNeeded * 1.5);
        if (playerStats.level === 5) {
            playerStats.magicBranch = prompt("¡Nivel 5 alcanzado! Elige tu poder: Fuego | Tierra | Aire");
        }
    }
    updateUI();
}

function updateUI() {
    let petList = playerStats.pets.length > 0 ? playerStats.pets.join(', ') : 'Ninguna';
    this.uiText.setText(
        `Nivel: ${playerStats.level} (XP: ${playerStats.xp}/${playerStats.xpNeeded})\n` +
        `Madera: ${playerStats.inventory.madera} | Piedra: ${playerStats.inventory.piedra}\n` +
        `Bayas: ${playerStats.inventory.baya}\n` +
        `Mascotas: ${petList}\n` +
        `Poder Mágico: ${playerStats.magicBranch || 'Bloqueado (Lvl 5)'}`
    );
}
