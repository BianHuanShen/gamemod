/**
 * SENDA ÉPICA - CONFIGURACIÓN
 * Constantes, configuración y datos estáticos del juego
 */

'use strict';

const CONFIG = {
    // Stats iniciales
    vidaInicial: 100,
    ataqueInicial: 10,
    defensaInicial: 5,
    
    // Combate
    chanceCritico: 0.2,
    multiplicadorCritico: 2,
    rangoAtaque: 80,
    velocidadBase: 0.5,
    
    // Progresión
    nivelesPorJefe: 5,
    
    // Zonas del juego
    zonas: [
        'Bosque Oscuro', 
        'Cavernas Cristalinas', 
        'Ruinas Antiguas', 
        'Picos Helados', 
        'Volcán Infernal', 
        'Castillo Maldito'
    ]
};

const TIPOS_IA = ['agresivo', 'defensivo', 'mago'];

const RUTAS_IMAGENES = {
    jugador: 'img/personaje.jpeg',
    enemigo: 'img/enemigo1.jpeg',
    mago: 'img/mago.jpeg',
    jefe: 'img/boss.jpeg',
    escenarios: ['img/escenario1.jpeg']
};

// Tabla de loot con rarezas
const TABLA_LOOT = [
    { item: 'pocion', cantidad: 2, chance: 0.50, rareza: 'comun', icono: '🧪', nombre: 'Poción de Vida' },
    { item: 'espada', cantidad: 1, chance: 0.70, rareza: 'comun', icono: '⚔️', nombre: 'Espada de Hierro' },
    { item: 'armadura', cantidad: 1, chance: 0.85, rareza: 'comun', icono: '🛡️', nombre: 'Armadura de Cuero' },
    { item: 'cristal', cantidad: 1, chance: 0.92, rareza: 'raro', icono: '💎', nombre: 'Cristal Místico' },
    { item: 'orbe', cantidad: 1, chance: 0.96, rareza: 'raro', icono: '🔮', nombre: 'Orbe de Poder' },
    { item: 'espadaLegendaria', cantidad: 1, chance: 0.98, rareza: 'legendario', icono: '⚔️', nombre: 'Espada Legendaria' },
    { item: 'armaduraEpica', cantidad: 1, chance: 1.00, rareza: 'epico', icono: '🛡️', nombre: 'Armadura Épica' }
];

// Estado inicial del jugador
const ESTADO_INICIAL = {
    vida: CONFIG.vidaInicial,
    vidaMax: CONFIG.vidaInicial,
    ataque: CONFIG.ataqueInicial,
    defensa: CONFIG.defensaInicial,
    magia: 0,
    nivel: 1,
    puntaje: 0,
    orbesUsados: 0,
    inventario: {
        pocion: 30,
        espada: 1,
        armadura: 1,
        magia: 0,
        cristal: 0,
        orbe: 0,
        espadaLegendaria: 0,
        armaduraEpica: 0
    }
};
/**
 * SENDA ÉPICA - CLASES Y SISTEMAS
 * Entidades, mecánicas de juego y lógica de negocio
 */

'use strict';

// ==========================================
// CLASE BASE ENTIDAD
// ==========================================
class Entidad {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.elemento = null;
    }
    
    actualizarPosicion() {
        if (this.elemento) {
            this.elemento.style.left = `${this.x}px`;
            this.elemento.style.top = `${this.y}px`;
        }
    }
}

// ==========================================
// CLASE ENEMIGO
// ==========================================
class Enemigo extends Entidad {
    constructor(datos, index) {
        super(200 + index * 80, 300 + Math.random() * 100);
        this.datos = datos;
        this.index = index;
        this.crearElemento();
    }
    
    crearElemento() {
        const div = document.createElement('div');
        div.className = `enemigo ${this.datos.ia}`;
        if (this.datos.jefe) div.classList.add('jefe');
        div.dataset.index = this.index;
        
        // Seleccionar imagen según tipo
        let imgSrc = RUTAS_IMAGENES.enemigo;
        if (this.datos.jefe) imgSrc = RUTAS_IMAGENES.jefe;
        else if (window.EstadoJuego?.nivelActual >= 2) imgSrc = RUTAS_IMAGENES.mago;
        
        div.style.backgroundImage = `url('${imgSrc}')`;
        
        // Crear barra de vida
        const barra = document.createElement('div');
        barra.className = 'barra-vida-enemigo';
        const fill = document.createElement('div');
        fill.className = 'fill-vida-enemigo';
        fill.style.width = '100%';
        barra.appendChild(fill);
        div.appendChild(barra);
        
        this.elemento = div;
        this.barraVida = fill;
        this.actualizarPosicion();
    }
    
    recibirDano(cantidad) {
        this.datos.vida = Math.max(0, this.datos.vida - cantidad);
        const porcentaje = (this.datos.vida / this.datos.vidaMax) * 100;
        this.barraVida.style.width = `${porcentaje}%`;
        
        // Efecto flash de daño
        this.elemento.style.filter = 'brightness(2)';
        setTimeout(() => {
            this.elemento.style.filter = '';
        }, 100);
        
        return this.datos.vida <= 0;
    }
    
    calcularDano(jugador) {
        let dano = this.datos.ataque;
        
        const modificadores = {
            agresivo: 1.2,
            defensivo: 0.7,
            mago: 1.0
        };
        dano *= modificadores[this.datos.ia];
        
        if (this.datos.ia === 'mago') dano += 3;
        
        dano -= jugador.defensa;
        return Math.max(1, Math.floor(dano));
    }
    
    moverHacia(objetivoX, objetivoY) {
        const dx = objetivoX - this.x;
        const dy = objetivoY - this.y;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        if (distancia > CONFIG.rangoAtaque) {
            let velocidad = CONFIG.velocidadBase;
            if (this.datos.ia === 'agresivo') velocidad *= 1.3;
            if (this.datos.ia === 'defensivo') velocidad *= 0.7;
            if (this.datos.ia === 'mago') velocidad *= 0.5;
            
            this.x += (dx / distancia) * velocidad;
            this.y += (dy / distancia) * velocidad + Math.sin(Date.now() / 300 + this.index) * 0.3;
            this.actualizarPosicion();
        }
        
        return distancia;
    }
}

// ==========================================
// SISTEMA DE AUDIO
// ==========================================
const AudioSys = {
    sonidos: {},
    
    init() {
        this.sonidos.golpe = document.getElementById('sonidoGolpe');
        this.sonidos.critico = document.getElementById('sonidoCritico');
        this.sonidos.loot = document.getElementById('sonidoLoot');
    },
    
    play(tipo) {
        if (this.sonidos[tipo]) {
            this.sonidos[tipo].currentTime = 0;
            this.sonidos[tipo].play().catch(() => {});
        }
    }
};

// ==========================================
// SISTEMA DE LOOT
// ==========================================
const SistemaLoot = {
    generar() {
        const roll = Math.random();
        const drop = TABLA_LOOT.find(d => roll < d.chance);
        
        // Asegurar que el inventario existe
        if (!window.EstadoJuego?.jugador?.inventario) return null;
        
        window.EstadoJuego.jugador.inventario[drop.item] += drop.cantidad;
        
        return {
            nombre: drop.nombre,
            icono: drop.icono,
            rareza: drop.rareza,
            cantidad: drop.cantidad
        };
    }
};

// ==========================================
// GENERADOR DE ENEMIGOS
// ==========================================
const GeneradorEnemigos = {
    crear(nivel, esJefe) {
        const factor = 1 + (nivel * 0.15);
        let vida = 30 + (nivel * 6 * factor);
        let ataque = 5 + (nivel * 1.2 * factor);
        let defensa = 2 + (nivel * 0.7 * factor);
        
        if (esJefe) {
            const bossFactor = 2.5 + (nivel * 0.1);
            vida *= bossFactor;
            ataque *= 1.5;
            defensa *= 1.3;
        }
        
        return {
            vida: Math.floor(vida),
            vidaMax: Math.floor(vida),
            ataque: Math.floor(ataque),
            defensa: Math.floor(defensa),
            jefe: esJefe,
            ia: TIPOS_IA[Math.floor(Math.random() * TIPOS_IA.length)]
        };
    }
};
/**
 * SENDA ÉPICA - MAIN
 * Estado global, interfaz de usuario y control del juego
 */

'use strict';

// ==========================================
// ESTADO GLOBAL DEL JUEGO
// ==========================================
window.EstadoJuego = {
    jugador: JSON.parse(JSON.stringify(ESTADO_INICIAL)),
    enemigos: [],
    nivelActual: 1,
    juegoActivo: false
};

// ==========================================
// SISTEMA DE UI
// ==========================================
const UI = {
    elementos: {},
    
    init() {
        // Cachear todos los elementos DOM
        this.elementos = {
            // Pantallas
            pantallaInicio: document.getElementById('pantallaInicio'),
            hudPrincipal: document.getElementById('hudPrincipal'),
            modalGameOver: document.getElementById('modalGameOver'),
            ventanaInventario: document.getElementById('ventanaInventario'),
            
            // Área de juego
            gameArea: document.getElementById('gameArea'),
            jugador: document.getElementById('jugador'),
            escenario: document.getElementById('escenario'),
            mensaje: document.getElementById('mensaje'),
            
            // Stats
            barraVida: document.getElementById('barraVida'),
            barraMagia: document.getElementById('barraMagia'),
            barraMagiaBonus: document.getElementById('barraMagiaBonus'),
            textoVida: document.getElementById('textoVida'),
            textoMagia: document.getElementById('textoMagia'),
            ataque: document.getElementById('ataqueJugador'),
            defensa: document.getElementById('defensaJugador'),
            magia: document.getElementById('magiaJugador'),
            nivel: document.getElementById('nivelJugador'),
            puntaje: document.getElementById('puntaje'),
            nombreZona: document.getElementById('nombreZona'),
            numeroNivel: document.getElementById('numeroNivel'),
            
            // Botones acciones
            atacar: document.getElementById('atacarBtn'),
            curar: document.getElementById('curarBtn'),
            equiparArma: document.getElementById('equiparArmaBtn'),
            equiparArmadura: document.getElementById('equiparArmaduraBtn'),
            aprenderMagia: document.getElementById('aprenderMagiaBtn'),
            usarCristal: document.getElementById('usarCristalBtn'),
            usarOrbe: document.getElementById('usarOrbeBtn'),
            equiparLegendario: document.getElementById('equiparEspadaLegendariaBtn'),
            equiparEpico: document.getElementById('equiparArmaduraEpicaBtn'),
            inventario: document.getElementById('abrirInventarioBtn'),
            cerrarInventario: document.getElementById('cerrarInventario'),
            btnIniciar: document.getElementById('btnIniciar'),
            btnReiniciar: document.getElementById('btnReiniciar'),
            
            // Contadores
            contadorPociones: document.getElementById('contadorPociones'),
            contadorEspadas: document.getElementById('contadorEspadas'),
            contadorArmaduras: document.getElementById('contadorArmaduras'),
            contadorCristales: document.getElementById('contadorCristales'),
            contadorOrbes: document.getElementById('contadorOrbes'),
            contadorLegendarias: document.getElementById('contadorLegendarias'),
            contadorEpicas: document.getElementById('contadorEpicas'),
            
            // Game Over
            nivelFinal: document.getElementById('nivelFinal'),
            puntajeFinal: document.getElementById('puntajeFinal')
        };
        
        this.bindEventos();
    },
    
    bindEventos() {
        const e = this.elementos;
        
        // Navegación
        e.btnIniciar.addEventListener('click', () => Juego.iniciar());
        e.btnReiniciar.addEventListener('click', () => Juego.reiniciar());
        
        // Acciones de combate
        e.atacar.addEventListener('click', () => Acciones.atacar());
        e.curar.addEventListener('click', () => Acciones.curar());
        
        // Equipamiento
        e.equiparArma.addEventListener('click', () => Acciones.equiparArma());
        e.equiparArmadura.addEventListener('click', () => Acciones.equiparArmadura());
        
        // Magia
        e.aprenderMagia.addEventListener('click', () => Acciones.aprenderMagia());
        
        // Items especiales
        e.usarCristal.addEventListener('click', () => Acciones.usarCristal());
        e.usarOrbe.addEventListener('click', () => Acciones.usarOrbe());
        e.equiparLegendario.addEventListener('click', () => Acciones.equiparLegendario());
        e.equiparEpico.addEventListener('click', () => Acciones.equiparEpico());
        
        // Inventario
        e.inventario.addEventListener('click', () => this.toggleInventario());
        e.cerrarInventario.addEventListener('click', () => this.toggleInventario());
        
        // Teclado
        document.addEventListener('keydown', (ev) => this.manejarTeclado(ev));
        
        // Drag del jugador
        this.enableDrag(e.jugador);
    },
    
    manejarTeclado(ev) {
        if (!EstadoJuego.juegoActivo) return;
        
        const e = this.elementos;
        const paso = 20;
        const rect = e.gameArea.getBoundingClientRect();
        let x = parseInt(e.jugador.style.left) || 100;
        let y = parseInt(e.jugador.style.top) || 300;
        
        switch(ev.key) {
            case 'ArrowRight': 
                x = Math.min(x + paso, rect.width - 64); 
                break;
            case 'ArrowLeft': 
                x = Math.max(x - paso, 0); 
                break;
            case 'ArrowUp': 
                y = Math.max(y - paso, 0); 
                break;
            case 'ArrowDown': 
                y = Math.min(y + paso, rect.height - 64); 
                break;
            case ' ': 
                ev.preventDefault(); 
                Acciones.atacar(); 
                break;
            case 'i': 
            case 'I': 
                this.toggleInventario(); 
                break;
        }
        
        e.jugador.style.left = `${x}px`;
        e.jugador.style.top = `${y}px`;
    },
    
    enableDrag(elemento) {
        let arrastrando = false;
        let offsetX, offsetY;
        
        const start = (e) => {
            arrastrando = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = elemento.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            e.preventDefault();
        };
        
        const move = (e) => {
            if (!arrastrando) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = this.elementos.gameArea.getBoundingClientRect();
            
            let x = clientX - rect.left - offsetX;
            let y = clientY - rect.top - offsetY;
            
            x = Math.max(0, Math.min(x, rect.width - 64));
            y = Math.max(0, Math.min(y, rect.height - 64));
            
            elemento.style.left = `${x}px`;
            elemento.style.top = `${y}px`;
        };
        
        const end = () => arrastrando = false;
        
        elemento.addEventListener('mousedown', start);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        elemento.addEventListener('touchstart', start);
        document.addEventListener('touchmove', move);
        document.addEventListener('touchend', end);
    },
    
    actualizarStats() {
        const j = EstadoJuego.jugador;
        const e = this.elementos;
        
        // Barra de vida
        const pctVida = (j.vida / j.vidaMax) * 100;
        e.barraVida.style.width = `${Math.max(0, pctVida)}%`;
        e.textoVida.textContent = `${Math.floor(j.vida)}/${j.vidaMax}`;
        
        // Barras de magia (base + bonus)
        const maxMagiaBase = Math.floor(j.nivel / 3) * 2;
        const maxMagiaTotal = maxMagiaBase + (j.orbesUsados * 2);
        const pctMagiaBase = maxMagiaTotal > 0 ? (Math.min(j.magia, maxMagiaBase) / maxMagiaTotal) * 100 : 0;
        const pctMagiaBonus = maxMagiaTotal > 0 ? (Math.max(0, j.magia - maxMagiaBase) / maxMagiaTotal) * 100 : 0;
        
        e.barraMagia.style.width = `${pctMagiaBase}%`;
        e.barraMagiaBonus.style.width = `${pctMagiaBonus}%`;
        e.textoMagia.textContent = `${j.magia}/${maxMagiaTotal}`;
        
        // Stats numéricos
        e.ataque.textContent = Math.floor(j.ataque);
        e.defensa.textContent = Math.floor(j.defensa);
        e.magia.textContent = j.magia;
        e.nivel.textContent = j.nivel;
        e.puntaje.textContent = j.puntaje;
        
        // Zona actual
        const zonaIndex = Math.min(Math.floor((j.nivel - 1) / 5), CONFIG.zonas.length - 1);
        e.nombreZona.textContent = CONFIG.zonas[zonaIndex];
        e.numeroNivel.textContent = `Nivel ${EstadoJuego.nivelActual}`;
        
        // Contadores de inventario
        e.contadorPociones.textContent = j.inventario.pocion;
        e.contadorEspadas.textContent = j.inventario.espada;
        e.contadorArmaduras.textContent = j.inventario.armadura;
        e.contadorCristales.textContent = j.inventario.cristal;
        e.contadorOrbes.textContent = j.inventario.orbe;
        e.contadorLegendarias.textContent = j.inventario.espadaLegendaria;
        e.contadorEpicas.textContent = j.inventario.armaduraEpica;
        
        // Visibilidad botones especiales
        e.usarCristal.classList.toggle('oculto', j.inventario.cristal <= 0);
        e.usarOrbe.classList.toggle('oculto', j.inventario.orbe <= 0);
        e.equiparLegendario.classList.toggle('oculto', j.inventario.espadaLegendaria <= 0);
        e.equiparEpico.classList.toggle('oculto', j.inventario.armaduraEpica <= 0);
        
        // Estados disabled
        const vivo = j.vida > 0;
        e.atacar.disabled = !vivo;
        e.curar.disabled = !vivo || j.inventario.pocion <= 0;
        e.equiparArma.disabled = !vivo || j.inventario.espada <= 0;
        e.equiparArmadura.disabled = !vivo || j.inventario.armadura <= 0;
        e.aprenderMagia.disabled = !vivo;
    },
    
    mostrarDano(x, y, cantidad, esCritico = false) {
        const container = document.getElementById('efectosContainer');
        const div = document.createElement('div');
        div.className = `dano-flotante ${esCritico ? 'critico' : ''}`;
        div.textContent = esCritico ? `¡${Math.floor(cantidad)}!` : Math.floor(cantidad);
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        
        container.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    },
    
    log(mensaje, tipo = 'normal') {
        const div = document.createElement('div');
        div.textContent = mensaje;
        div.className = `${tipo}-msg`;
        this.elementos.mensaje.appendChild(div);
        this.elementos.mensaje.scrollTop = this.elementos.mensaje.scrollHeight;
        
        // Limitar historial a 20 mensajes
        while (this.elementos.mensaje.children.length > 20) {
            this.elementos.mensaje.removeChild(this.elementos.mensaje.firstChild);
        }
    },
    
    toggleInventario() {
        const inv = this.elementos.ventanaInventario;
        const estaVisible = !inv.classList.contains('oculto');
        
        if (estaVisible) {
            inv.classList.add('oculto');
        } else {
            this.renderizarInventario();
            inv.classList.remove('oculto');
        }
    },
    
    renderizarInventario() {
        const contenedor = document.getElementById('listaInventario');
        contenedor.innerHTML = '';
        
        TABLA_LOOT.forEach(item => {
            const cantidad = EstadoJuego.jugador.inventario[item.item];
            if (cantidad > 0) {
                const div = document.createElement('div');
                div.className = `item-inventario ${item.rareza}`;
                div.innerHTML = `
                    <span class="icono">${item.icono}</span>
                    <span class="cantidad">${cantidad}</span>
                    <span class="nombre">${item.nombre}</span>
                `;
                contenedor.appendChild(div);
            }
        });
    },
    
    mostrarGameOver() {
        this.elementos.nivelFinal.textContent = EstadoJuego.jugador.nivel;
        this.elementos.puntajeFinal.textContent = EstadoJuego.jugador.puntaje;
        this.elementos.modalGameOver.classList.remove('oculto');
    }
};

// ==========================================
// ACCIONES DEL JUGADOR
// ==========================================
const Acciones = {
    atacar() {
        const j = EstadoJuego.jugador;
        if (j.vida <= 0 || EstadoJuego.enemigos.length === 0) return;
        
        const enemigo = EstadoJuego.enemigos[0];
        
        // Calcular daño
        let dano = j.ataque + j.magia - enemigo.datos.defensa;
        let esCritico = Math.random() < CONFIG.chanceCritico;
        
        if (esCritico) {
            dano *= CONFIG.multiplicadorCritico;
            AudioSys.play('critico');
            UI.log('💥 ¡GOLPE CRÍTICO!', 'critico');
        } else {
            AudioSys.play('golpe');
        }
        
        dano = Math.max(2, Math.floor(dano));
        
        // Animación
        UI.elementos.jugador.classList.add('atacando');
        setTimeout(() => UI.elementos.jugador.classList.remove('atacando'), 300);
        
        // Mostrar daño flotante
        const rect = enemigo.elemento.getBoundingClientRect();
        const escenarioRect = UI.elementos.escenario.getBoundingClientRect();
        UI.mostrarDano(
            rect.left - escenarioRect.left + rect.width / 2,
            rect.top - escenarioRect.top,
            dano,
            esCritico
        );
        
        // Aplicar daño
        const muerto = enemigo.recibirDano(dano);
        UI.log(`⚔️ Infligiste ${dano} de daño`, 'dano');
        
        if (muerto) {
            this.procesarMuerteEnemigo(enemigo);
        }
        
        UI.actualizarStats();
    },
    
    procesarMuerteEnemigo(enemigo) {
        // Generar loot
        const loot = SistemaLoot.generar();
        if (loot) {
            AudioSys.play('loot');
            UI.log(`🎁 ¡Obtuviste ${loot.nombre}!`, 'loot');
        }
        
        // Actualizar stats
        const j = EstadoJuego.jugador;
        j.puntaje += enemigo.datos.jefe ? 50 : 10;
        j.vida = Math.min(j.vidaMax, j.vida + (enemigo.datos.jefe ? 50 : 15));
        
        // Eliminar enemigo
        enemigo.elemento.remove();
        EstadoJuego.enemigos.shift();
        
        // Reindexar
        EstadoJuego.enemigos.forEach((e, i) => {
            e.index = i;
            e.elemento.dataset.index = i;
        });
        
        // Siguiente nivel
        if (EstadoJuego.enemigos.length === 0) {
            setTimeout(() => Juego.siguienteNivel(), 500);
        }
    },
    
    curar() {
        const j = EstadoJuego.jugador;
        if (j.vida <= 0 || j.inventario.pocion <= 0) return;
        
        j.vida = Math.min(j.vidaMax, j.vida + 25);
        j.inventario.pocion--;
        UI.log('🧪 Recuperaste 25 HP', 'cura');
        UI.actualizarStats();
    },
    
    equiparArma() {
        const j = EstadoJuego.jugador;
        if (j.vida <= 0 || j.inventario.espada <= 0) return;
        
        j.ataque += 5;
        j.inventario.espada--;
        UI.log('⚔️ +5 Ataque equipado', 'magia');
        UI.actualizarStats();
    },
    
    equiparArmadura() {
        const j = EstadoJuego.jugador;
        if (j.vida <= 0 || j.inventario.armadura <= 0) return;
        
        j.defensa += 3;
        j.inventario.armadura--;
        UI.log('🛡️ +3 Defensa equipada', 'magia');
        UI.actualizarStats();
    },
    
    aprenderMagia() {
        const j = EstadoJuego.jugador;
        if (j.vida <= 0) return;
        
        const maxBase = Math.floor(j.nivel / 3) * 2;
        const maxTotal = maxBase + (j.orbesUsados * 2);
        
        if (j.magia < maxTotal) {
            j.magia++;
            j.inventario.magia++;
            UI.log(`✨ Magia aumentada (${j.magia}/${maxTotal})`, 'magia');
        } else {
            UI.log('⚠️ Has alcanzado tu límite mágico actual', 'normal');
        }
        UI.actualizarStats();
    },
    
    usarCristal() {
        const j = EstadoJuego.jugador;
        if (j.inventario.cristal <= 0) return;
        
        j.ataque += 15;
        j.inventario.cristal--;
        UI.log('💎 +15 Ataque (Cristal Místico)', 'magia');
        UI.actualizarStats();
    },
    
    usarOrbe() {
        const j = EstadoJuego.jugador;
        if (j.inventario.orbe <= 0) return;
        
        j.inventario.orbe--;
        j.orbesUsados++;
        
        const maxBase = Math.floor(j.nivel / 3) * 2;
        const maxTotal = maxBase + (j.orbesUsados * 2);
        
        j.magia = Math.min(j.magia + 2, maxTotal);
        UI.log('🔮 +2 Magia (Orbe de Poder)', 'magia');
        UI.actualizarStats();
    },
    
    equiparLegendario() {
        const j = EstadoJuego.jugador;
        if (j.inventario.espadaLegendaria <= 0) return;
        
        j.ataque += 25;
        j.inventario.espadaLegendaria--;
        UI.log('⚔️ +25 Ataque (¡LEGENDARIO!)', 'loot');
        UI.actualizarStats();
    },
    
    equiparEpico() {
        const j = EstadoJuego.jugador;
        if (j.inventario.armaduraEpica <= 0) return;
        
        j.defensa += 15;
        j.inventario.armaduraEpica--;
        UI.log('🛡️ +15 Defensa (¡ÉPICO!)', 'loot');
        UI.actualizarStats();
    }
};

// ==========================================
// CONTROL PRINCIPAL DEL JUEGO
// ==========================================
const Juego = {
    init() {
        AudioSys.init();
        UI.init();
        this.generarNivel();
        this.loop();
    },
    
    iniciar() {
        UI.elementos.pantallaInicio.classList.add('oculto');
        UI.elementos.hudPrincipal.classList.remove('oculto');
        EstadoJuego.juegoActivo = true;
        UI.log('¡Tu aventura comienza! Elimina a todos los enemigos.', 'magia');
    },
    
    reiniciar() {
        // Reset estado
        EstadoJuego.jugador = JSON.parse(JSON.stringify(ESTADO_INICIAL));
        EstadoJuego.nivelActual = 1;
        EstadoJuego.enemigos = [];
        EstadoJuego.juegoActivo = true;
        
        // Limpiar DOM
        UI.elementos.gameArea.querySelectorAll('.enemigo').forEach(e => e.remove());
        UI.elementos.modalGameOver.classList.add('oculto');
        
        // Reset posición
        UI.elementos.jugador.style.left = '100px';
        UI.elementos.jugador.style.top = '300px';
        
        this.generarNivel();
        UI.actualizarStats();
        UI.log('✨ ¡Nueva vida! El ciclo comienza de nuevo.', 'magia');
    },
    
    generarNivel() {
        // Limpiar enemigos
        EstadoJuego.enemigos.forEach(e => e.elemento.remove());
        EstadoJuego.enemigos = [];
        
        const esJefe = EstadoJuego.nivelActual % CONFIG.nivelesPorJefe === 0;
        const numEnemigos = esJefe ? 1 : Math.min(3 + Math.floor(EstadoJuego.nivelActual / 2), 6);
        
        // Crear nuevos enemigos
        for (let i = 0; i < numEnemigos; i++) {
            const datos = GeneradorEnemigos.crear(EstadoJuego.nivelActual, esJefe);
            const enemigo = new Enemigo(datos, i);
            EstadoJuego.enemigos.push(enemigo);
            UI.elementos.gameArea.appendChild(enemigo.elemento);
        }
        
        // Actualizar fondo
        const escenarioIndex = (EstadoJuego.nivelActual - 1) % RUTAS_IMAGENES.escenarios.length;
        UI.elementos.gameArea.style.backgroundImage = `url('${RUTAS_IMAGENES.escenarios[escenarioIndex]}')`;
        
        UI.actualizarStats();
    },
    
    siguienteNivel() {
        EstadoJuego.jugador.nivel++;
        EstadoJuego.nivelActual++;
        UI.log(`✨ ¡Subiste al nivel ${EstadoJuego.jugador.nivel}!`, 'magia');
        this.generarNivel();
    },
    
    loop() {
        if (EstadoJuego.juegoActivo && EstadoJuego.jugador.vida > 0) {
            this.actualizarIA();
        }
        
        // Verificar muerte
        if (EstadoJuego.jugador.vida <= 0 && EstadoJuego.juegoActivo) {
            EstadoJuego.juegoActivo = false;
            EstadoJuego.jugador.vida = 0;
            UI.mostrarGameOver();
        }
        
        requestAnimationFrame(() => this.loop());
    },
    
    actualizarIA() {
        const jugadorX = parseInt(UI.elementos.jugador.style.left) || 100;
        const jugadorY = parseInt(UI.elementos.jugador.style.top) || 300;
        const centroJX = jugadorX + 32;
        const centroJY = jugadorY + 32;
        
        EstadoJuego.enemigos.forEach(enemigo => {
            // Mover hacia jugador
            const distancia = enemigo.moverHacia(centroJX, centroJY);
            
            // Atacar si está en rango
            if (distancia <= CONFIG.rangoAtaque) {
                const dano = enemigo.calcularDano(EstadoJuego.jugador);
                EstadoJuego.jugador.vida -= dano;
                EstadoJuego.jugador.vida = Math.max(0, EstadoJuego.jugador.vida);
                
                // Animación de ataque enemigo
                enemigo.elemento.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    enemigo.elemento.style.transform = 'scale(1)';
                }, 100);
                
                UI.actualizarStats();
            }
        });
    }
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    Juego.init();
});
