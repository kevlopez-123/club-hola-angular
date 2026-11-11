// Eventos de ejemplo de Club Hola (tomados del proyecto de referencia en React). Fechas en ISO; las etiquetas se calculan al mostrarlas.
import type { Evento, Preinscripcion } from "../../eventos";

export const eventosIniciales: Evento[] = [
  {
    "id": "ev1",
    "nombre": "Cena maridaje en Central",
    "marca": "Central Restaurante",
    "tipo": "cenas",
    "imagen": "img/e-cena.jpg",
    "galeria": [
      "img/e-cena.jpg",
      "img/e-gastro.jpg",
      "img/e-cata.jpg"
    ],
    "fechaISO": "2026-12-12",
    "hora": "8:00 p. m.",
    "lugar": "Central Restaurante",
    "distrito": "Barranco, Lima",
    "cupos": 24,
    "cuposRestantes": 6,
    "nivelMinimo": "Diamante",
    "costo": "Tarifa por confirmar",
    "resumen": "Menú degustación de 9 tiempos con maridaje, presentado por el equipo de cocina.",
    "descripcion": "Una noche íntima para 24 tarjetahabientes BanBif en una de las mejores mesas de Latinoamérica. El recorrido por ecosistemas del Perú incluye maridaje de autor y una charla con el equipo de cocina al cierre.",
    "incluye": [
      "Menú degustación de 9 tiempos",
      "Maridaje completo",
      "Charla con el chef",
      "Valet parking"
    ],
    "condiciones": [
      "Cupo personal e intransferible.",
      "Preinscripción sujeta a confirmación por correo.",
      "Exclusivo para clientes con Nivel Diamante vigente."
    ],
    "activo": true
  },
  {
    "id": "ev2",
    "nombre": "Taller de cocina nikkei",
    "marca": "Maido Lab",
    "tipo": "gastronomicas",
    "imagen": "img/e-gastro.jpg",
    "galeria": [
      "img/e-gastro.jpg",
      "img/e-cena.jpg"
    ],
    "fechaISO": "2026-12-20",
    "hora": "11:00 a. m.",
    "lugar": "Maido Lab",
    "distrito": "Miraflores, Lima",
    "cupos": 30,
    "cuposRestantes": 14,
    "nivelMinimo": "Oro",
    "precio": 260,
    "costo": "S/ 260 · Pago con tarjeta BanBif",
    "resumen": "Clase práctica de cocina nikkei con degustación y recetario digital.",
    "descripcion": "Tres horas de cocina en vivo con chefs del laboratorio creativo de Maido. Prepararás tres platos icónicos y te llevarás el recetario digital y un delantal de regalo.",
    "incluye": [
      "Estación de trabajo individual",
      "Insumos y delantal",
      "Degustación final",
      "Recetario digital"
    ],
    "condiciones": [
      "Cupo limitado a 30 personas.",
      "Puedes ceder tu cupo hasta 48 horas antes."
    ],
    "activo": true
  },
  {
    "id": "ev3",
    "nombre": "Cata de vinos de altura",
    "marca": "Tabernero Selección",
    "tipo": "catas",
    "imagen": "img/e-cata.jpg",
    "galeria": [
      "img/e-cata.jpg",
      "img/e-cena.jpg"
    ],
    "fechaISO": "2026-12-03",
    "hora": "7:30 p. m.",
    "lugar": "Casa Prado",
    "distrito": "San Isidro, Lima",
    "cupos": 40,
    "cuposRestantes": 22,
    "nivelMinimo": "Plata",
    "precio": 130,
    "costo": "S/ 130 · Pago con tarjeta BanBif",
    "resumen": "Seis etiquetas guiadas por un sommelier certificado, con tabla de quesos.",
    "descripcion": "Recorrido sensorial por seis etiquetas de valles peruanos y argentinos, con explicación de terroir, técnica de cata y maridaje con tabla de quesos artesanales.",
    "incluye": [
      "6 etiquetas de cata",
      "Tabla de quesos",
      "Guía de cata impresa"
    ],
    "condiciones": [
      "Solo mayores de 18 años.",
      "Tomar bebidas alcohólicas en exceso es dañino."
    ],
    "activo": true
  },
  {
    "id": "ev4",
    "nombre": "Lanzamiento colección primavera",
    "marca": "Kunan Studio",
    "tipo": "lanzamientos",
    "imagen": "img/e-lanzamiento.jpg",
    "galeria": [
      "img/e-lanzamiento.jpg"
    ],
    "fechaISO": "2026-12-05",
    "hora": "6:00 p. m.",
    "lugar": "Rooftop Larcomar",
    "distrito": "Miraflores, Lima",
    "cupos": 80,
    "cuposRestantes": 41,
    "nivelMinimo": "Clásico",
    "costo": "Sin costo",
    "resumen": "Presentación de la nueva colección con cóctel de bienvenida y gift bag.",
    "descripcion": "Sé de los primeros en conocer la colección primavera-verano con pasarela, música en vivo y descuento exclusivo del 25% durante la noche del evento.",
    "incluye": [
      "Cóctel de bienvenida",
      "Gift bag",
      "25% de descuento esa noche"
    ],
    "condiciones": [
      "Ingreso con DNI y tarjeta BanBif.",
      "Aforo sujeto a disponibilidad."
    ],
    "activo": true
  },
  {
    "id": "ev5",
    "nombre": "Avant premiere privada",
    "marca": "Cineplanet Prime",
    "tipo": "funciones",
    "imagen": "img/e-funcion.jpg",
    "galeria": [
      "img/e-funcion.jpg"
    ],
    "fechaISO": "2026-12-10",
    "hora": "8:30 p. m.",
    "lugar": "Cineplanet Prime Salaverry",
    "distrito": "Jesús María, Lima",
    "cupos": 60,
    "cuposRestantes": 0,
    "nivelMinimo": "Plata",
    "costo": "Tarifa por confirmar",
    "resumen": "Función exclusiva antes del estreno nacional, con combo doble incluido.",
    "descripcion": "Sala completa reservada para tarjetahabientes BanBif. Incluye dos entradas en butaca Prime y combo doble de canchita y bebidas.",
    "incluye": [
      "2 entradas Prime",
      "Combo doble",
      "Ingreso preferente"
    ],
    "condiciones": [
      "Llegar 30 minutos antes.",
      "No se permite reventa de entradas."
    ],
    "activo": true
  },
  {
    "id": "ev6",
    "nombre": "Clásico en palco BanBif",
    "marca": "Estadio Nacional",
    "tipo": "deportivos",
    "imagen": "img/e-deportivo.jpg",
    "galeria": [
      "img/e-deportivo.jpg"
    ],
    "fechaISO": "2026-12-08",
    "hora": "3:30 p. m.",
    "lugar": "Estadio Nacional",
    "distrito": "Cercado de Lima",
    "cupos": 20,
    "cuposRestantes": 4,
    "nivelMinimo": "Oro",
    "precio": 450,
    "costo": "S/ 450 · Pago con tarjeta BanBif",
    "resumen": "Palco corporativo con catering, vista central y acceso preferente.",
    "descripcion": "Vive el clásico desde el palco BanBif: acceso preferente por puerta VIP, catering continuo durante todo el partido y merchandising oficial.",
    "incluye": [
      "Entrada a palco",
      "Catering y bebidas",
      "Merchandising oficial"
    ],
    "condiciones": [
      "Cupo para 1 persona por preinscripción.",
      "Sujeto a reprogramación del partido."
    ],
    "activo": true
  },
  {
    "id": "ev7",
    "nombre": "Noche sinfónica",
    "marca": "Gran Teatro Nacional",
    "tipo": "culturales",
    "imagen": "img/e-cultural.jpg",
    "galeria": [
      "img/e-cultural.jpg"
    ],
    "fechaISO": "2026-12-24",
    "hora": "7:00 p. m.",
    "lugar": "Gran Teatro Nacional",
    "distrito": "San Borja, Lima",
    "cupos": 50,
    "cuposRestantes": 27,
    "nivelMinimo": "Clásico",
    "precio": 95,
    "costo": "S/ 95 · Pago con tarjeta BanBif",
    "resumen": "Concierto de la Orquesta Sinfónica Nacional en platea preferencial.",
    "descripcion": "Un repertorio de clásicos latinoamericanos interpretado por la Orquesta Sinfónica Nacional, con ubicaciones en platea preferencial reservadas para clientes BanBif.",
    "incluye": [
      "Ubicación en platea",
      "Programa de mano",
      "Copa de bienvenida"
    ],
    "condiciones": [
      "Ingreso hasta 15 minutos antes de la función.",
      "Vestimenta formal sugerida."
    ],
    "activo": true
  },
  {
    "id": "ev8",
    "nombre": "Ruta de picanterías arequipeñas",
    "marca": "Perú Sabor",
    "tipo": "gastronomicas",
    "imagen": "img/e-gastro.jpg",
    "galeria": [
      "img/e-gastro.jpg"
    ],
    "fechaISO": "2026-12-21",
    "hora": "12:00 m.",
    "lugar": "Circuito de picanterías",
    "distrito": "Arequipa",
    "cupos": 25,
    "cuposRestantes": 18,
    "nivelMinimo": "Plata",
    "precio": 300,
    "costo": "S/ 300 · Pago con tarjeta BanBif",
    "resumen": "Recorrido guiado por tres picanterías tradicionales con degustación.",
    "descripcion": "Un día completo por las picanterías con reconocimiento patrimonial, acompañado por un guía gastronómico y degustación en cada parada.",
    "incluye": [
      "Transporte local",
      "3 degustaciones",
      "Guía gastronómico"
    ],
    "condiciones": [
      "No incluye traslado aéreo.",
      "Punto de encuentro en Plaza de Armas de Arequipa."
    ],
    "activo": true
  },
  {
    "id": "ev9",
    "nombre": "Cena de aniversario en Kjolle",
    "marca": "Kjolle",
    "tipo": "cenas",
    "imagen": "img/e-cena.jpg",
    "galeria": [
      "img/e-cena.jpg"
    ],
    "fotos": [
      "img/e-cena.jpg",
      "img/e-gastro.jpg",
      "img/e-cata.jpg",
      "img/e-cultural.jpg"
    ],
    "asistentes": 28,
    "fechaISO": "2026-10-18",
    "hora": "8:00 p. m.",
    "lugar": "Kjolle",
    "distrito": "Barranco, Lima",
    "cupos": 28,
    "cuposRestantes": 0,
    "nivelMinimo": "Oro",
    "costo": "Tarifa por confirmar",
    "resumen": "Cena de aniversario BanBif con menú de autor y música en vivo.",
    "descripcion": "Celebramos el aniversario del programa con una cena de autor para 28 tarjetahabientes, acompañada de música en vivo y sorteo de experiencias.",
    "incluye": [
      "Menú de 6 tiempos",
      "Maridaje",
      "Música en vivo"
    ],
    "condiciones": [
      "Evento realizado.",
      "Galería disponible para los asistentes."
    ],
    "activo": true
  },
  {
    "id": "ev10",
    "nombre": "Cata de piscos premiados",
    "marca": "Ruta del Pisco",
    "tipo": "catas",
    "imagen": "img/e-cata.jpg",
    "galeria": [
      "img/e-cata.jpg"
    ],
    "fotos": [
      "img/e-cata.jpg",
      "img/e-gastro.jpg",
      "img/e-cena.jpg"
    ],
    "asistentes": 44,
    "fechaISO": "2026-10-10",
    "hora": "7:00 p. m.",
    "lugar": "Hacienda La Caravedo",
    "distrito": "Ica",
    "cupos": 45,
    "cuposRestantes": 0,
    "nivelMinimo": "Plata",
    "precio": 170,
    "costo": "S/ 170 · Pago con tarjeta BanBif",
    "resumen": "Cata guiada de cinco piscos premiados con maridaje criollo.",
    "descripcion": "Una tarde en la hacienda con cata guiada de cinco piscos premiados, recorrido por la bodega y maridaje con piqueos criollos.",
    "incluye": [
      "5 piscos de cata",
      "Tour de bodega",
      "Piqueos criollos"
    ],
    "condiciones": [
      "Evento realizado.",
      "Solo mayores de 18 años."
    ],
    "activo": true
  },
  {
    "id": "ev11",
    "nombre": "Final de la Liga en palco BanBif",
    "marca": "Estadio Nacional",
    "tipo": "deportivos",
    "imagen": "img/e-deportivo.jpg",
    "galeria": [
      "img/e-deportivo.jpg"
    ],
    "fotos": [
      "img/e-deportivo.jpg",
      "img/e-cultural.jpg",
      "img/e-lanzamiento.jpg"
    ],
    "asistentes": 20,
    "fechaISO": "2026-09-26",
    "hora": "4:00 p. m.",
    "lugar": "Estadio Nacional",
    "distrito": "Cercado de Lima",
    "cupos": 20,
    "cuposRestantes": 0,
    "nivelMinimo": "Oro",
    "costo": "Tarifa por confirmar",
    "resumen": "Palco corporativo con catering para vivir la final de la Liga 1.",
    "descripcion": "Veinte tarjetahabientes vivieron la final desde el palco BanBif, con acceso VIP, catering continuo y kit oficial del partido.",
    "incluye": [
      "Palco VIP",
      "Catering",
      "Kit oficial"
    ],
    "condiciones": [
      "Evento realizado."
    ],
    "activo": true
  },
  {
    "id": "ev12",
    "nombre": "Temporada de ballet: El lago de los cisnes",
    "marca": "Gran Teatro Nacional",
    "tipo": "culturales",
    "imagen": "img/e-cultural.jpg",
    "galeria": [
      "img/e-cultural.jpg"
    ],
    "fotos": [
      "img/e-cultural.jpg",
      "img/e-funcion.jpg",
      "img/e-lanzamiento.jpg",
      "img/e-cena.jpg"
    ],
    "asistentes": 52,
    "fechaISO": "2026-09-19",
    "hora": "7:00 p. m.",
    "lugar": "Gran Teatro Nacional",
    "distrito": "San Borja, Lima",
    "cupos": 55,
    "cuposRestantes": 0,
    "nivelMinimo": "Clásico",
    "precio": 110,
    "costo": "S/ 110 · Pago con tarjeta BanBif",
    "resumen": "Función de ballet clásico en platea preferencial para clientes BanBif.",
    "descripcion": "El Ballet Nacional presentó El lago de los cisnes con ubicaciones preferenciales reservadas y copa de bienvenida para los invitados BanBif.",
    "incluye": [
      "Platea preferencial",
      "Copa de bienvenida",
      "Programa de mano"
    ],
    "condiciones": [
      "Evento realizado."
    ],
    "activo": true
  }
] as Evento[];

export const preinscripcionesIniciales: Preinscripcion[] = [
  {
    "id": "pr1",
    "eventoId": "ev3",
    "evento": "Cata de vinos de altura",
    "codigo": "EVT-8H2K4L9A",
    "participanteId": "p1",
    "participante": "Ana Torres",
    "email": "ana.torres@dominio.com",
    "telefono": "987 654 321",
    "documento": "41234567",
    "fecha": "02/08/2026",
    "fechaISO": "2026-08-02",
    "acompanantes": 1,
    "restricciones": "",
    "comentario": "",
    "estado": "confirmado"
  },
  {
    "id": "pr2",
    "eventoId": "ev5",
    "evento": "Avant premiere privada",
    "codigo": "EVT-3PQ7M1XZ",
    "participanteId": "p1",
    "participante": "Ana Torres",
    "email": "ana.torres@dominio.com",
    "telefono": "987 654 321",
    "documento": "41234567",
    "fecha": "24/07/2026",
    "fechaISO": "2026-07-24",
    "acompanantes": 1,
    "restricciones": "",
    "comentario": "",
    "estado": "en-lista"
  },
  {
    "id": "pr3",
    "eventoId": "ev10",
    "evento": "Cata de piscos premiados",
    "codigo": "EVT-6DW2R8TC",
    "participanteId": "p1",
    "participante": "Ana Torres",
    "email": "ana.torres@dominio.com",
    "telefono": "987 654 321",
    "documento": "41234567",
    "fecha": "18/06/2026",
    "fechaISO": "2026-06-18",
    "acompanantes": 0,
    "restricciones": "",
    "comentario": "",
    "estado": "asistido"
  },
  {
    "id": "pr4",
    "eventoId": "ev9",
    "evento": "Cena de aniversario en Kjolle",
    "codigo": "EVT-1KJ9S4VB",
    "participanteId": "p1",
    "participante": "Ana Torres",
    "email": "ana.torres@dominio.com",
    "telefono": "987 654 321",
    "documento": "41234567",
    "fecha": "30/05/2026",
    "fechaISO": "2026-05-30",
    "acompanantes": 0,
    "restricciones": "",
    "comentario": "",
    "estado": "cancelado"
  }
] as Preinscripcion[];
