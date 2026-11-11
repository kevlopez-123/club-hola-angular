// Datos de ejemplo de Club Hola · BanBif (Perú), tomados del proyecto de referencia en React. Precios en soles.
import type { Beneficio, Slide } from "./mock";

export const slidesClubHola: Slide[] = [
  {
    "id": "edo",
    "imagen": "img/hero-sushi.jpg",
    "alt": "EDO SUSHI BAR · EDO SUSHI BAR",
    "to": "/beneficios",
    "marca": "EDO SUSHI BAR",
    "titulo": "EDO SUSHI BAR",
    "descuento": "25%",
    "cta": "Conoce más"
  },
  {
    "id": "cineplanet",
    "imagen": "img/hero-cine.jpg",
    "alt": "CINEPLANET · 2x1 EN ENTRADAS",
    "to": "/beneficios",
    "marca": "CINEPLANET",
    "titulo": "2x1 EN ENTRADAS",
    "descuento": "50%",
    "cta": "Conoce más"
  },
  {
    "id": "giftcards",
    "imagen": "img/hero-giftcard.jpg",
    "alt": "GIFT CARDS · GIFT CARDS CON DESCUENTO",
    "to": "/beneficios",
    "marca": "GIFT CARDS",
    "titulo": "GIFT CARDS CON DESCUENTO",
    "descuento": "2x1",
    "cta": "Ver beneficio"
  },
  {
    "id": "cineplanet-home",
    "imagen": "img/b-cine.jpg",
    "alt": "CINEPLANET · COMBO CANCHITA + GASEOSA",
    "to": "/beneficios",
    "marca": "CINEPLANET",
    "titulo": "COMBO CANCHITA + GASEOSA",
    "descuento": "2x1",
    "cta": "Ver beneficio"
  }
];

export const slidesBeneficiosClubHola: Slide[] = [
  {
    "id": "pardos",
    "imagen": "img/b-polleria.jpg",
    "alt": "PARDOS CHICKEN · SABOR EN FAMILIA",
    "to": "/beneficios",
    "marca": "PARDOS CHICKEN",
    "titulo": "SABOR EN FAMILIA",
    "descuento": "30%",
    "cta": "Ver beneficio"
  },
  {
    "id": "giftcards-ben",
    "imagen": "img/hero-giftcard.jpg",
    "alt": "GIFT CARDS · BENEFICIOS EXCLUSIVOS EN GIFT CARDS",
    "to": "/beneficios",
    "marca": "GIFT CARDS",
    "titulo": "BENEFICIOS EXCLUSIVOS EN GIFT CARDS",
    "descuento": "2x1",
    "cta": "Ver beneficio"
  },
  {
    "id": "cineplanet-ben",
    "imagen": "img/b-cine.jpg",
    "alt": "CINEPLANET · 2X1 EN ENTRADAS 2D",
    "to": "/beneficios",
    "marca": "CINEPLANET",
    "titulo": "2X1 EN ENTRADAS 2D",
    "descuento": "2x1",
    "cta": "Ver beneficio"
  },
  {
    "id": "casaandina",
    "imagen": "img/b-hotel.jpg",
    "alt": "CASA ANDINA · ESCÁPATE A PARACAS",
    "to": "/beneficios",
    "marca": "CASA ANDINA",
    "titulo": "ESCÁPATE A PARACAS",
    "descuento": "15%",
    "cta": "Ver beneficio"
  }
];

export const categoriasBeneficioClubHola = [
  {
    "slug": "restaurantes",
    "label": "Restaurantes",
    "icon": "UtensilsCrossed"
  },
  {
    "slug": "cafeterias",
    "label": "Cafeterías",
    "icon": "Coffee"
  },
  {
    "slug": "entretenimiento",
    "label": "Entretenimiento",
    "icon": "Clapperboard"
  },
  {
    "slug": "fitness",
    "label": "Fitness",
    "icon": "Dumbbell"
  },
  {
    "slug": "salud",
    "label": "Salud",
    "icon": "HeartPulse"
  },
  {
    "slug": "moda",
    "label": "Moda",
    "icon": "Shirt"
  },
  {
    "slug": "viajes",
    "label": "Viajes",
    "icon": "Plane"
  },
  {
    "slug": "supermercado",
    "label": "Supermercado",
    "icon": "ShoppingBasket"
  },
  {
    "slug": "automotriz",
    "label": "Automotriz",
    "icon": "Car"
  },
  {
    "slug": "tecnologia",
    "label": "Tecnología",
    "icon": "Laptop"
  },
  {
    "slug": "belleza",
    "label": "Belleza y spa",
    "icon": "Sparkles"
  },
  {
    "slug": "educacion",
    "label": "Educación",
    "icon": "GraduationCap"
  },
  {
    "slug": "mascotas",
    "label": "Mascotas",
    "icon": "PawPrint"
  },
  {
    "slug": "hogar",
    "label": "Hogar",
    "icon": "Sofa"
  },
  {
    "slug": "delivery",
    "label": "Delivery",
    "icon": "Bike"
  },
  {
    "slug": "seguros",
    "label": "Seguros",
    "icon": "ShieldCheck"
  },
  {
    "slug": "movilidad",
    "label": "Movilidad",
    "icon": "Car"
  },
  {
    "slug": "gift-cards",
    "label": "Gift Cards",
    "icon": "Gift"
  }
] as const;

export const beneficiosClubHola: Beneficio[] = [
  {
    "id": "b1",
    "marca": "Pardos Chicken",
    "marcaUrl": "https://www.pardoschicken.com.pe",
    "nombre": "30% dscto. en pollo a la brasa familiar",
    "descuento": "30%",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-polleria.jpg",
    "galeria": [
      "img/b-polleria.jpg",
      "img/hero-sushi.jpg"
    ],
    "descripcion": "Disfruta de un pollo entero con papas fritas y ensalada para compartir en familia.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b2",
    "marca": "Starbucks",
    "marcaUrl": "https://www.starbucks.com.pe",
    "nombre": "2x1 en bebidas grandes de lunes a jueves",
    "descuento": "2x1",
    "categoria": "Cafetería",
    "categoriaSlug": "cafeterias",
    "imagen": "img/b-cafe.jpg",
    "galeria": [
      "img/b-cafe.jpg"
    ],
    "descripcion": "Lleva dos bebidas grandes de la carta pagando solo una, de lunes a jueves.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b3",
    "marca": "Smart Fit",
    "marcaUrl": "https://www.smartfit.com.pe",
    "nombre": "50% dscto. en la primera mensualidad",
    "descuento": "50%",
    "categoria": "Fitness",
    "categoriaSlug": "fitness",
    "imagen": "img/b-gym.jpg",
    "galeria": [
      "img/b-gym.jpg"
    ],
    "descripcion": "Inicia tu plan Black con la mitad de descuento en tu primer mes.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "nivelMinimo": "Plata"
  },
  {
    "id": "b4",
    "marca": "Inkafarma",
    "marcaUrl": "https://www.inkafarma.com.pe",
    "nombre": "25% dscto. en cuidado personal",
    "descuento": "25%",
    "categoria": "Salud",
    "categoriaSlug": "salud",
    "imagen": "img/b-farmacia.jpg",
    "galeria": [
      "img/b-farmacia.jpg"
    ],
    "descripcion": "Descuento en toda la línea de cuidado personal y dermocosmética.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b5",
    "marca": "Saga Falabella",
    "marcaUrl": "https://www.sagafalabella.com.pe",
    "nombre": "20% dscto. en moda de temporada",
    "descuento": "20%",
    "categoria": "Moda",
    "categoriaSlug": "moda",
    "imagen": "img/b-moda.jpg",
    "galeria": [
      "img/b-moda.jpg"
    ],
    "descripcion": "Renueva tu clóset con descuento en las marcas de la nueva colección.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b6",
    "marca": "Casa Andina",
    "marcaUrl": "https://www.casaandina.com.pe",
    "nombre": "15% dscto. en estadías en Paracas",
    "descuento": "15%",
    "categoria": "Viajes",
    "categoriaSlug": "viajes",
    "imagen": "img/b-hotel.jpg",
    "galeria": [
      "img/b-hotel.jpg",
      "img/hero-viajes.jpg"
    ],
    "descripcion": "Escápate un fin de semana con tarifa preferencial y desayuno incluido.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 620
  },
  {
    "id": "b7",
    "marca": "Cineplanet",
    "marcaUrl": "https://www.cineplanet.com.pe",
    "nombre": "2x1 en entradas 2D de lunes a miércoles",
    "descuento": "2x1",
    "categoria": "Entretenimiento",
    "categoriaSlug": "entretenimiento",
    "imagen": "img/b-cine.jpg",
    "galeria": [
      "img/b-cine.jpg",
      "img/hero-cine.jpg"
    ],
    "descripcion": "Dos entradas al precio de una en funciones 2D de inicio de semana.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 99,
    "nivelMinimo": "Plata"
  },
  {
    "id": "b8",
    "marca": "Plaza Vea",
    "marcaUrl": "https://www.plazavea.com.pe",
    "nombre": "15% dscto. en frutas y verduras los viernes",
    "descuento": "15%",
    "categoria": "Supermercado",
    "categoriaSlug": "supermercado",
    "imagen": "img/b-super.jpg",
    "galeria": [
      "img/b-super.jpg"
    ],
    "descripcion": "Ahorra en tu compra semanal de productos frescos todos los viernes.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b9",
    "marca": "Edo Sushi Bar",
    "marcaUrl": "https://www.edosushibar.com.pe",
    "nombre": "35% dscto. en tablas para compartir",
    "descuento": "35%",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-sushi.jpg",
    "galeria": [
      "img/b-sushi.jpg",
      "img/hero-sushi.jpg"
    ],
    "descripcion": "Descuento en las tablas de makis y nigiris para dos o más personas.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b10",
    "marca": "Auto Spa",
    "marcaUrl": "https://www.autospa.com.pe",
    "nombre": "40% dscto. en lavado premium de tu auto",
    "descuento": "40%",
    "categoria": "Automotriz",
    "categoriaSlug": "automotriz",
    "imagen": "img/b-auto.jpg",
    "galeria": [
      "img/b-auto.jpg"
    ],
    "descripcion": "Lavado completo con encerado y aspirado profundo para tu vehículo.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "nivelMinimo": "Oro"
  },
  {
    "id": "b11",
    "marca": "PF Changs",
    "marcaUrl": "https://www.pfchangs.com.pe",
    "nombre": "15% descuento en cena gourmet para 2",
    "descuento": "15%",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-sushi.jpg",
    "galeria": [
      "img/b-sushi.jpg",
      "img/b-polleria.jpg"
    ],
    "descripcion": "Disfruta de una cena de 5 tiempos en un restaurante exclusivo con maridaje, con cupos limitados.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b13",
    "marca": "Coolbox",
    "marcaUrl": "https://www.coolbox.com.pe",
    "nombre": "20% dscto. en accesorios tecnológicos",
    "descuento": "20%",
    "categoria": "Tecnología",
    "categoriaSlug": "tecnologia",
    "imagen": "img/p-audifonos.jpg",
    "galeria": [
      "img/p-audifonos.jpg"
    ],
    "descripcion": "Descuento en audífonos, teclados y accesorios seleccionados de la tienda.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b14",
    "marca": "Montalvo Spa",
    "marcaUrl": "https://www.montalvospa.com.pe",
    "nombre": "30% dscto. en spa y masajes",
    "descuento": "30%",
    "categoria": "Belleza y spa",
    "categoriaSlug": "belleza",
    "imagen": "img/b-moda.jpg",
    "galeria": [
      "img/b-moda.jpg"
    ],
    "descripcion": "Relájate con masajes descontracturantes y rituales de spa en sedes seleccionadas.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "nivelMinimo": "Oro"
  },
  {
    "id": "b15",
    "marca": "Idiomas Católica",
    "marcaUrl": "https://www.idiomascatlica.com.pe",
    "nombre": "25% dscto. en cursos de inglés",
    "descuento": "25%",
    "categoria": "Educación",
    "categoriaSlug": "educacion",
    "imagen": "img/b-cafe.jpg",
    "galeria": [
      "img/b-cafe.jpg"
    ],
    "descripcion": "Descuento en la matrícula de programas de idiomas presenciales y virtuales.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b16",
    "marca": "Superpet",
    "marcaUrl": "https://www.superpet.com.pe",
    "nombre": "15% dscto. en alimento para mascotas",
    "descuento": "15%",
    "categoria": "Mascotas",
    "categoriaSlug": "mascotas",
    "imagen": "img/b-super.jpg",
    "galeria": [
      "img/b-super.jpg"
    ],
    "descripcion": "Ahorra en alimento premium y accesorios para perros y gatos.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b17",
    "marca": "Sodimac",
    "marcaUrl": "https://www.sodimac.com.pe",
    "nombre": "10% dscto. en decoración del hogar",
    "descuento": "10%",
    "categoria": "Hogar",
    "categoriaSlug": "hogar",
    "imagen": "img/b-moda.jpg",
    "galeria": [
      "img/b-moda.jpg"
    ],
    "descripcion": "Renueva tus ambientes con descuento en muebles y decoración seleccionada.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b18",
    "marca": "Rappi",
    "marcaUrl": "https://www.rappi.com.pe",
    "nombre": "S/ 15 de dscto. en tu primer pedido",
    "descuento": "S/ 15",
    "categoria": "Delivery",
    "categoriaSlug": "delivery",
    "imagen": "img/b-polleria.jpg",
    "galeria": [
      "img/b-polleria.jpg"
    ],
    "descripcion": "Cupón de descuento en restaurantes afiliados pagando con tu tarjeta BanBif.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b19",
    "marca": "Pacífico Seguros",
    "marcaUrl": "https://www.pacficoseguros.com.pe",
    "nombre": "20% dscto. en seguro vehicular",
    "descuento": "20%",
    "categoria": "Seguros",
    "categoriaSlug": "seguros",
    "imagen": "img/b-auto.jpg",
    "galeria": [
      "img/b-auto.jpg"
    ],
    "descripcion": "Descuento en la primera cuota de tu SOAT o seguro vehicular full.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon"
  },
  {
    "id": "b20",
    "marca": "Cineplanet",
    "marcaUrl": "https://www.cineplanet.com.pe",
    "nombre": "Gift Card canchita + gaseosa",
    "descuento": "2x1",
    "categoria": "Gift Cards",
    "categoriaSlug": "gift-cards",
    "imagen": "img/b-cine.jpg",
    "galeria": [
      "img/b-cine.jpg",
      "img/hero-cine.jpg"
    ],
    "descripcion": "Combo dulce para dos personas al canjear tu gift card digital.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 72,
    "nivelMinimo": "Plata"
  },
  {
    "id": "b12",
    "marca": "Costamar Travel",
    "marcaUrl": "https://www.costamartravel.com.pe",
    "nombre": "20% dscto. en paquetes nacionales",
    "descuento": "20%",
    "categoria": "Viajes",
    "categoriaSlug": "viajes",
    "imagen": "img/b-hotel.jpg",
    "galeria": [
      "img/b-hotel.jpg",
      "img/b-hotel.jpg"
    ],
    "descripcion": "Paquetes turísticos a Cusco, Arequipa y el norte peruano con descuento.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 500
  },
  {
    "id": "b21",
    "marca": "Cirque du Soleil",
    "marcaUrl": "https://www.cirquedusoleil.com.pe",
    "nombre": "Entrada VIP show en Lima",
    "descuento": "VIP",
    "categoria": "Entretenimiento",
    "categoriaSlug": "entretenimiento",
    "imagen": "img/b-cine.jpg",
    "galeria": [
      "img/b-cine.jpg",
      "img/hero-cine.jpg"
    ],
    "descripcion": "Entrada preferencial al show internacional en Lima. Beneficio exclusivo de pago con tarjeta BanBif.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 480,
    "nivelMinimo": "Oro"
  },
  {
    "id": "b22",
    "marca": "Casa Andina",
    "marcaUrl": "https://www.casaandina.com.pe",
    "nombre": "Cena maridaje para 2 en Miraflores",
    "descuento": "Exclusivo",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-sushi.jpg",
    "galeria": [
      "img/b-sushi.jpg",
      "img/hero-sushi.jpg"
    ],
    "descripcion": "Cena de 5 tiempos con maridaje para dos personas. Solo disponible con pago íntegro con tu tarjeta BanBif.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 350,
    "nivelMinimo": "Diamante"
  },
  {
    "id": "b24",
    "marca": "Rappi",
    "marcaUrl": "https://www.rappi.com.pe",
    "nombre": "S/ 20 de dscto. en tu pedido con código",
    "descuento": "S/ 20",
    "categoria": "Delivery",
    "categoriaSlug": "delivery",
    "imagen": "img/b-polleria.jpg",
    "galeria": [
      "img/b-polleria.jpg"
    ],
    "descripcion": "Aplica el código en tu carrito de Rappi y obtén S/ 20 de descuento pagando con tu tarjeta BanBif.",
    "pasos": [
      "Copia el código de descuento que aparece en esta página.",
      "Ingresa a la app o web de Rappi e inicia sesión.",
      "Arma tu pedido en un restaurante afiliado.",
      "Pega el código en la sección \"Cupones\" antes de pagar.",
      "Paga con tu tarjeta BanBif y listo."
    ],
    "especificaciones": [
      "Válido solo pagando con tarjeta BanBif.",
      "Código de un solo uso por cliente.",
      "No acumulable con otras promociones.",
      "Válido hasta el 31/12/2026."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "informativo",
    "codigoDescuento": "BANBIF20",
    "nivelMinimo": "Diamante"
  },
  {
    "id": "b25",
    "marca": "Platanitos",
    "marcaUrl": "https://www.platanitos.com",
    "nombre": "30% dscto. online en calzado seleccionado",
    "descuento": "30%",
    "categoria": "Moda",
    "categoriaSlug": "moda",
    "imagen": "img/b-moda.jpg",
    "galeria": [
      "img/b-moda.jpg"
    ],
    "descripcion": "Descuento exclusivo en la tienda online de Platanitos usando tu código BanBif.",
    "pasos": [
      "Copia el código de descuento.",
      "Ingresa a platanitos.com y elige tus productos.",
      "En el checkout, pega el código en \"Cupón de descuento\".",
      "Completa la compra con tu tarjeta BanBif."
    ],
    "especificaciones": [
      "Válido solo pagando con tarjeta BanBif.",
      "Código de un solo uso por cliente.",
      "No acumulable con otras promociones.",
      "Válido hasta el 31/12/2026."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "informativo",
    "codigoDescuento": "HOLABIF30",
    "nivelMinimo": "Diamante"
  },
  {
    "id": "b26",
    "marca": "Cabify",
    "marcaUrl": "https://cabify.com/pe",
    "nombre": "40% dscto. en tus 3 primeros viajes",
    "descuento": "40%",
    "categoria": "Movilidad",
    "categoriaSlug": "movilidad",
    "imagen": "img/b-auto.jpg",
    "galeria": [
      "img/b-auto.jpg"
    ],
    "descripcion": "Registra el código promocional en la app de Cabify y viaja con descuento en Lima.",
    "pasos": [
      "Copia el código promocional.",
      "Abre la app de Cabify y ve a \"Promociones\".",
      "Ingresa el código y guárdalo.",
      "Solicita tu viaje pagando con tu tarjeta BanBif."
    ],
    "especificaciones": [
      "Válido solo pagando con tarjeta BanBif.",
      "Código de un solo uso por cliente.",
      "No acumulable con otras promociones.",
      "Válido hasta el 31/12/2026."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "informativo",
    "codigoDescuento": "BIFRIDE40",
    "nivelMinimo": "Diamante"
  },
  {
    "id": "b23",
    "marca": "Costamar Travel",
    "marcaUrl": "https://www.costamartravel.com.pe",
    "nombre": "Escapada a Cusco 3D/2N",
    "descuento": "Exclusivo",
    "categoria": "Viajes",
    "categoriaSlug": "viajes",
    "imagen": "img/b-hotel.jpg",
    "galeria": [
      "img/b-hotel.jpg",
      "img/hero-viajes.jpg"
    ],
    "descripcion": "Paquete con vuelos y hotel para dos personas. Beneficio exclusivo pagando solo con tarjeta BanBif.",
    "pasos": [
      "Genera el cupón para reservar",
      "Acércate al local con tu DNI en físico.",
      "Presenta el cupón",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 1290
  },
  {
    "id": "bq1",
    "marca": "Bembos",
    "marcaUrl": "https://www.bembos.com.pe",
    "nombre": "Hamburguesa clásica gratis por tu cumpleaños",
    "descuento": "Gratis",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-polleria.jpg",
    "galeria": [
      "img/b-polleria.jpg"
    ],
    "descripcion": "Genera tu código y díctalo en caja para recibir una hamburguesa clásica sin costo.",
    "pasos": [
      "Presiona Generar código",
      "Acércate a caja",
      "Dicta o muestra el código",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "cuponSinQr": true
  },
  {
    "id": "bq2",
    "marca": "Cineplanet",
    "marcaUrl": "https://www.cineplanet.com.pe",
    "nombre": "Canchita mediana gratis",
    "descuento": "Gratis",
    "categoria": "Entretenimiento",
    "categoriaSlug": "entretenimiento",
    "imagen": "img/b-cine.jpg",
    "galeria": [
      "img/b-cine.jpg"
    ],
    "descripcion": "Genera tu código y canjea una canchita mediana en la dulcería de cualquier sede.",
    "pasos": [
      "Presiona Generar código",
      "Ve a la dulcería",
      "Indica el código al cajero",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "cuponSinQr": true
  },
  {
    "id": "bq3",
    "marca": "Edo Sushi Bar",
    "marcaUrl": "https://www.edosushibar.com.pe",
    "nombre": "Postre de cortesía en tu visita",
    "descuento": "Gratis",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-sushi.jpg",
    "galeria": [
      "img/b-sushi.jpg"
    ],
    "descripcion": "Pide tu postre de cortesía indicando el código generado al mozo antes de pagar.",
    "pasos": [
      "Presiona Generar código",
      "Indica el código al mozo",
      "Paga con tu tarjeta BanBif",
      "¡Disfruta!"
    ],
    "especificaciones": [
      "No acumulable con otras promociones.",
      "Local: Av. Manuel Villarán Nro. 702 (Alt. cdra. 20 de Av. Tomás Marsano).",
      "Válido hasta el 31/12/2026.",
      "Aplica solo con tarjeta BanBif.",
      "Válido para consumo en local y para llevar."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "cupon",
    "cuponSinQr": true
  },
  {
    "id": "bc1",
    "marca": "Chili's",
    "marcaUrl": "https://www.chilis.com.pe",
    "nombre": "Vale S/100 de consumo por S/60",
    "descuento": "40%",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-polleria.jpg",
    "galeria": [
      "img/b-polleria.jpg"
    ],
    "descripcion": "Compra un vale de consumo con 40% de descuento y úsalo en cualquier local Chili's de Lima.",
    "pasos": [
      "Compra el cupón pagando con tu tarjeta BanBif",
      "Recibe el PDF con tu QR y código en tu correo",
      "Preséntalo en el local físico antes de pagar",
      "¡Disfruta tu descuento!"
    ],
    "especificaciones": [
      "Pago 100% con tarjeta de débito o crédito BanBif.",
      "El cupón se envía en PDF al correo registrado inmediatamente después de la compra.",
      "Vigencia de 60 días desde la fecha de compra.",
      "Un solo uso por cupón. No acumulable con otras promociones."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 60,
    "cuponPdf": "local"
  },
  {
    "id": "bc2",
    "marca": "Tottus",
    "marcaUrl": "https://www.tottus.com.pe",
    "nombre": "Vale de S/200 por S/160 en compras",
    "descuento": "20%",
    "categoria": "Supermercado",
    "categoriaSlug": "supermercado",
    "imagen": "img/b-super.jpg",
    "galeria": [
      "img/b-super.jpg"
    ],
    "descripcion": "Paga S/160 y recibe un cupón de S/200 para tus compras en tiendas Tottus o tottus.com.pe.",
    "pasos": [
      "Compra el cupón pagando con tu tarjeta BanBif",
      "Recibe el PDF con tu QR y código en tu correo",
      "Úsalo en tienda física o en la web antes de pagar",
      "¡Disfruta tu descuento!"
    ],
    "especificaciones": [
      "Pago 100% con tarjeta de débito o crédito BanBif.",
      "El cupón se envía en PDF al correo registrado inmediatamente después de la compra.",
      "Vigencia de 60 días desde la fecha de compra.",
      "Un solo uso por cupón. No acumulable con otras promociones."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 160,
    "cuponPdf": "ambos",
    "nivelMinimo": "Plata"
  },
  {
    "id": "bc3",
    "marca": "Edo Sushi Bar",
    "marcaUrl": "https://www.edosushibar.com.pe",
    "nombre": "Cupón 35% dscto. en menú degustación",
    "descuento": "35%",
    "categoria": "Restaurante",
    "categoriaSlug": "restaurantes",
    "imagen": "img/b-sushi.jpg",
    "galeria": [
      "img/b-sushi.jpg"
    ],
    "descripcion": "Menú degustación para dos personas con 35% de descuento pagando con tu tarjeta BanBif.",
    "pasos": [
      "Compra el cupón pagando con tu tarjeta BanBif",
      "Recibe el PDF con tu QR y código en tu correo",
      "Preséntalo en el local físico antes de pagar",
      "¡Disfruta tu descuento!"
    ],
    "especificaciones": [
      "Pago 100% con tarjeta de débito o crédito BanBif.",
      "El cupón se envía en PDF al correo registrado inmediatamente después de la compra.",
      "Vigencia de 60 días desde la fecha de compra.",
      "Un solo uso por cupón. No acumulable con otras promociones."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 129,
    "cuponPdf": "local",
    "nivelMinimo": "Oro"
  },
  {
    "id": "bc4",
    "marca": "Adidas",
    "marcaUrl": "https://www.adidas.com.pe",
    "nombre": "Cupón S/150 dscto. en adidas.pe",
    "descuento": "S/150",
    "categoria": "Moda",
    "categoriaSlug": "moda",
    "imagen": "img/b-moda.jpg",
    "galeria": [
      "img/b-moda.jpg"
    ],
    "descripcion": "Compra este cupón y obtén S/150 de descuento en compras desde S/400 en la tienda online de Adidas.",
    "pasos": [
      "Compra el cupón pagando con tu tarjeta BanBif",
      "Recibe el PDF con tu QR y código en tu correo",
      "Ingresa el código en la web de la marca antes de pagar",
      "¡Disfruta tu descuento!"
    ],
    "especificaciones": [
      "Pago 100% con tarjeta de débito o crédito BanBif.",
      "El cupón se envía en PDF al correo registrado inmediatamente después de la compra.",
      "Vigencia de 60 días desde la fecha de compra.",
      "Un solo uso por cupón. No acumulable con otras promociones."
    ],
    "terminos": "Promoción válida del 01/01/2026 al 31/12/2026 en todos los locales participantes en Perú. El descuento aplica sobre el precio regular y no es acumulable con otras promociones, descuentos o cupones vigentes. El cliente deberá presentar el cupón digital generado a través de la plataforma Club Hola antes de efectuar el pago. Cada cupón tiene una validez de 3 horas desde su generación y puede utilizarse una sola vez. El cupón debe presentarse junto con un documento de identidad vigente. Limitado a un cupón por persona por día. El comercio se reserva el derecho de modificar o cancelar la promoción sin previo aviso. Esta promoción es operada por Motiva Soluciones, quien actúa únicamente como plataforma de beneficios y medio de validación.",
    "tipo": "compra",
    "precio": 49,
    "cuponPdf": "web"
  }
] as Beneficio[];
