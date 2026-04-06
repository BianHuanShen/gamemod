/**
 * SENDA ÉPICA - RPG PRO
 * Código organizado en módulos funcionales
 * Arquitectura: Estado -> Lógica -> Render -> Input
 */

'use strict';

// ==========================================
// CONFIGURACIÓN Y CONSTANTES
// ==========================================
const CONFIG = {
    vidaInicial: 100,
    ataqueInicial: 10,
    defensaInicial: 5,
    chanceCritico: 0.2,
    multiplicadorCritico: 2,
    rangoAtaque: 80,
    velocidadBase: 0.5,
    nivelesPorJefe: 5,
    zonas: [
        'Bosque Oscuro', 'Cavernas Cristalinas', 'Ruinas Antiguas', 
        'Picos Helados', 'Volcán Infernal', 'Castillo Maldito'
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

// ==========================================
// ESTADO DEL JUEGO (Single Source of Truth)
// ==========================================
const EstadoJuego = {
    jugador: {
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
    },
    enemigos: [],
    nivelActual: 1,
    juegoActivo: false,
    animacionId: null
};

// ==========================================
// CLASES
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
        
        // Imagen según tipo
        let imgSrc = RUTAS_IMAGENES.enemigo;
        if (this.datos.jefe) imgSrc = RUTAS_IMAGENES.jefe;
        else if (EstadoJuego.nivelActual >= 2) imgSrc = RUTAS_IMAGENES.mago;
        
        div.style.backgroundImage = `url('${imgSrc}')`;
        
        // Barra de vida
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
        
        // Efecto visual de daño
        this.elemento.style.filter = 'brightness(2)';
        setTimeout(() => {
            this.elemento.style.filter = '';
        }, 100);
        
        return this.datos.vida <= 0;
    }
    
    atacar(jugador) {
        let dano = this.datos.ataque;
        
        // Modificadores por IA
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
    tablaDrop: [
        { item: 'pocion', cantidad: 2, chance: 0.50, rareza: 'comun', icono: '🧪' },
        { item: 'espada', cantidad: 1, chance: 0.70, rareza: 'comun', icono: '⚔️' },
        { item: 'armadura', cantidad: 1, chance: 0.85, rareza: 'comun', icono: '🛡️' },
        { item: 'cristal', cantidad: 1, chance: 0.92, rareza: 'raro', icono: '💎' },
        { item: 'orbe', cantidad: 1, chance: 0.96, rareza: 'raro', icono: '🔮' },
        { item: 'espadaLegendaria', cantidad: 1, chance: 0.98, rareza: 'legendario', icono: '⚔️' },
        { item: 'armaduraEpica', cantidad: 1, chance: 1.00, rareza: 'epico', icono: '🛡️' }
    ],
    
    generar() {
        const roll = Math.random();
        const drop = this.tablaDrop.find(d => roll < d.chance);
        
        EstadoJuego.jugador.inventario[drop.item] += drop.cantidad;
        
        return {
            nombre: this.getNombreItem(drop.item),
            icono: drop.icono,
            rareza: drop.rareza,
            cantidad: drop.cantidad
        };
    },
    
    getNombreItem(key) {
        const nombres = {
            pocion: 'Poción de Vida',
            espada: 'Espada de Hierro',
            armadura: 'Armadura de Cuero',
            cristal: 'Cristal Místico',
            orbe: 'Orbe de Poder',
            espadaLegendaria: 'Espada Legendaria',
            armaduraEpica: 'Armadura Épica'
        };
        return nombres[key] || key;
    }
};

// ==========================================
// SISTEMA DE UI
// ==========================================
const UI = {
    elementos: {},
    
    init() {
        // Cachear elementos DOM
        this.elementos = {
            pantallaInicio: document.getElementById('pantallaInicio'),
            hudPrincipal: document.getElementById('hudPrincipal'),
            modalGameOver: document.getElementById('modalGameOver'),
            ventanaInventario: document.getElementById('ventanaInventario'),
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
            
            // Botones
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
            
            // Contadores
            contadorPociones: document.getElementById('contadorPociones'),
            contadorEspadas: document.getElementById('contadorEspadas'),
            contadorArmaduras: document.getElementById('contadorArmaduras'),
            contadorCristales: document.getElementById('contadorCristales'),
            contadorOrbes: document.getElementById('contadorOrbes'),
            contadorLegendarias: document.getElementById('contadorLegendarias'),
            contadorEpicas: document.getElementById('contadorEpicas'),
            
            // Modal Game Over
            nivelFinal: document.getElementById('nivelFinal'),
            puntajeFinal: document.getElementById('puntajeFinal'),
            btnReiniciar: document.getElementById('btnReiniciar'),
            btnIniciar: document.getElementById('btnIniciar')
        };
        
        this.bindEventos();
    },
    
    bindEventos() {
        const e = this.elementos;
        
        e.btnIniciar.addEventListener('click', () => Juego.iniciar());
        e.btnReiniciar.addEventListener('click', () => Juego.reiniciar());
        
        e.atacar.addEventListener('click', () => Acciones.atacar());
        e.curar.addEventListener('click', () => Acciones.curar());
        e.equiparArma.addEventListener('click', () => Acciones.equiparArma());
        e.equiparArmadura.addEventListener('click', () => Acciones.equiparArmadura());
        e.aprenderMagia.addEventListener('click', () => Acciones.aprenderMagia());
        e.usarCristal.addEventListener('click', () => Acciones.usarCristal());
        e.usarOrbe.addEventListener('click', () => Acciones.usarOrbe());
        e.equiparLegendario.addEventListener('click', () => Acciones.equiparLegendario());
        e.equiparEpico.addEventListener('click', () => Acciones.equiparEpico());
        
        e.inventario.addEventListener('click', () => this.toggleInventario());
        e.cerrarInventario.addEventListener('click', () => this.toggleInventario());
        
        // Teclado
        document.addEventListener('keydown', (ev) => {
            if (!EstadoJuego.juegoActivo) return;
            
            const paso = 20;
            const rect = e.gameArea.getBoundingClientRect();
            let x = parseInt(e.jugador.style.left) || 100;
            let y = parseInt(e.jugador.style.top) || 300;
            
            switch(ev.key) {
                case 'ArrowRight': x = Math.min(x + paso, rect.width - 64); break;
                case 'ArrowLeft': x = Math.max(x - paso, 0); break;
                case 'ArrowUp': y = Math.max(y - paso, 0); break;
                case 'ArrowDown': y = Math.min(y + paso, rect.height - 64); break;
                case ' ': ev.preventDefault(); Acciones.atacar(); break;
                case 'i': case 'I': this.toggleInventario(); break;
            }
            
            e.jugador.style.left = `${x}px`;
            e.jugador.style.top = `${y}px`;
        });
        
        // Drag del jugador
        this.enableDrag(e.jugador);
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
        
        // Barras
        const pctVida = (j.vida / j.vidaMax) * 100;
        e.barraVida.style.width = `${Math.max(0, pctVida)}%`;
        e.textoVida.textContent = `${Math.floor(j.vida)}/${j.vidaMax}`;
        
        // Magia
        const maxMagiaBase = Math.floor(j.nivel / 3) * 2;
        const maxMagiaTotal = maxMagiaBase + (j.orbesUsados * 2);
        const pctMagiaBase = maxMagiaTotal > 0 ? (Math.min(j.magia, maxMagiaBase) / maxMagiaTotal) * 100 : 0;
        const pctMagiaBonus = maxMagiaTotal > 0 ? (Math.max(0, j.magia - maxMagiaBase) / maxMagiaTotal) * 100 : 0;
        
        e.barraMagia.style.width = `${pctMagiaBase}%`;
        e.barraMagiaBonus.style.width = `${pctMagiaBonus}%`;
        e.textoMagia.textContent = `${j.magia}/${maxMagiaTotal}`;
        
        // Números
        e.ataque.textContent = Math.floor(j.ataque);
        e.defensa.textContent = Math.floor(j.defensa);
        e.magia.textContent = j.magia;
        e.nivel.textContent = j.nivel;
        e.puntaje.textContent = j.puntaje;
        
        // Zona
        const zonaIndex = Math.min(Math.floor((j.nivel - 1) / 5), CONFIG.zonas.length - 1);
        e.nombreZona.textContent = CONFIG.zonas[zonaIndex];
        e.numeroNivel.textContent = `Nivel ${EstadoJuego.nivelActual}`;
        
        // Contadores inventario
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
        
        // Botones disabled
        const vivo = j.vida > 0;
        e.atacar.disabled = !vivo;
        e.curar.disabled = !vivo || j.inventario.pocion <= 0;
        e.equiparArma.disabled = !vivo || j.inventario.espada <= 0;
        e.equiparArmadura.disabled = !vivo || j.inventario.armadura <= 0;
        e.aprenderMagia.disabled = !vivo;
    },
    
    mostrarDano(x, y, cantidad, esCritico = false) {
        const div = document.createElement('div');
        div.className = `dano-flotante ${esCritico ? 'critico' : ''}`;
        div.textContent = esCritico ? `¡${Math.floor(cantidad)}!` : Math.floor(cantidad);
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        
        document.getElementById('efectosContainer').appendChild(div);
        setTimeout(() => div.remove(), 1000);
    },
    
    log(mensaje, tipo = 'normal') {
        const div = document.createElement('div');
        div.textContent = mensaje;
        div.className = `${tipo}-msg`;
        this.elementos.mensaje.appendChild(div);
        this.elementos.mensaje.scrollTop = this.elementos.mensaje.scrollHeight;
        
        // Limitar historial
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
        
        const items = [
            { key: 'pocion', nombre: 'Poción', icono: '🧪', rareza: 'comun' },
            { key: 'espada', nombre: 'Espada', icono: '⚔️', rareza: 'comun' },
            { key: 'armadura', nombre: 'Armadura', icono: '🛡️', rareza: 'comun' },
            { key: 'cristal', nombre: 'Cristal', icono: '💎', rareza: 'raro' },
            { key: 'orbe', nombre: 'Orbe', icono: '🔮', rareza: 'raro' },
            { key: 'espadaLegendaria', nombre: 'Espada Legendaria', icono: '⚔️', rareza: 'legendario' },
            { key: 'armaduraEpica', nombre: 'Armadura Épica', icono: '🛡️', rareza: 'epico' }
        ];
        
        items.forEach(item => {
            const cantidad = EstadoJuego.jugador.inventario[item.key];
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
        const enemigoObj = enemigo; // Ya es instancia de Enemigo
        
        // Calcular daño
        let dano = j.ataque + j.magia - enemigoObj.datos.defensa;
        let esCritico = Math.random() < CONFIG.chanceCritico;
        
        if (esCritico) {
            dano *= CONFIG.multiplicadorCritico;
            AudioSys.play('critico');
            UI.log('💥 ¡GOLPE CRÍTICO!', 'critico');
        } else {
            AudioSys.play('golpe');
        }
        
        dano = Math.max(2, Math.floor(dano));
        
        // Animación jugador
        UI.elementos.jugador.classList.add('atacando');
        setTimeout(() => UI.elementos.jugador.classList.remove('atacando'), 300);
        
        // Mostrar daño
        const rect = enemigoObj.elemento.getBoundingClientRect();
        const escenarioRect = UI.elementos.escenario.getBoundingClientRect();
        UI.mostrarDano(
            rect.left - escenarioRect.left + rect.width / 2,
            rect.top - escenarioRect.top,
            dano,
            esCritico
        );
        
        // Aplicar daño
        const muerto = enemigoObj.recibirDano(dano);
        UI.log(`⚔️ Infligiste ${dano} de daño`, 'dano');
        
        if (muerto) {
            this.procesarMuerteEnemigo(enemigoObj);
        }
        
        UI.actualizarStats();
    },
    
    procesarMuerteEnemigo(enemigo) {
        // Loot
        const loot = SistemaLoot.generar();
        AudioSys.play('loot');
        UI.log(`🎁 ¡Obtuviste ${loot.nombre}!`, 'loot');
        
        // Stats
        EstadoJuego.jugador.puntaje += enemigo.datos.jefe ? 50 : 10;
        EstadoJuego.jugador.vida = Math.min(
            EstadoJuego.jugador.vidaMax,
            EstadoJuego.jugador.vida + (enemigo.datos.jefe ? 50 : 15)
        );
        
        // Eliminar
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
// LÓGICA PRINCIPAL DEL JUEGO
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
        EstadoJuego.jugador = {
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
        EstadoJuego.nivelActual = 1;
        EstadoJuego.enemigos = [];
        EstadoJuego.juegoActivo = true;
        
        // Limpiar DOM
        UI.elementos.gameArea.querySelectorAll('.enemigo').forEach(e => e.remove());
        UI.elementos.modalGameOver.classList.add('oculto');
        
        // Reset posición jugador
        UI.elementos.jugador.style.left = '100px';
        UI.elementos.jugador.style.top = '300px';
        
        this.generarNivel();
        UI.actualizarStats();
        UI.log('✨ ¡Nueva vida! El ciclo comienza de nuevo.', 'magia');
    },
    
    generarNivel() {
        // Limpiar enemigos anteriores
        EstadoJuego.enemigos.forEach(e => e.elemento.remove());
        EstadoJuego.enemigos = [];
        
        const esJefe = EstadoJuego.nivelActual % CONFIG.nivelesPorJefe === 0;
        const numEnemigos = esJefe ? 1 : Math.min(3 + Math.floor(EstadoJuego.nivelActual / 2), 6);
        
        for (let i = 0; i < numEnemigos; i++) {
            const datos = this.crearDatosEnemigo(EstadoJuego.nivelActual, esJefe);
            const enemigo = new Enemigo(datos, i);
            EstadoJuego.enemigos.push(enemigo);
            UI.elementos.gameArea.appendChild(enemigo.elemento);
        }
        
        // Cambiar fondo
        const escenarioIndex = (EstadoJuego.nivelActual - 1) % RUTAS_IMAGENES.escenarios.length;
        UI.elementos.escenario.querySelector('.game-area').style.backgroundImage = 
            `url('${RUTAS_IMAGENES.escenarios[escenarioIndex]}')`;
        
        UI.actualizarStats();
    },
    
    crearDatosEnemigo(nivel, esJefe) {
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
    },
    
    siguienteNivel() {
        EstadoJuego.jugador.nivel++;
        EstadoJuego.nivelActual++;
        UI.log(`✨ ¡Subiste al nivel ${EstadoJuego.jugador.nivel}!`, 'magia');
        this.generarNivel();
    },
    
    loop() {
        if (!EstadoJuego.juegoActivo) {
            requestAnimationFrame(() => this.loop());
            return;
        }
        
        const j = EstadoJuego
