/**
 * Provincias → ciudades (cantones) como valores fijos: la ciudad depende de la provincia y no se escribe a mano.
 * Hoy está cargado Ecuador; para otro país no hay lista y el formulario pide la ciudad como texto validado.
 */
const lista = (s: string) => s.split("|").map((x) => x.trim());

const ECUADOR: Record<string, string[]> = {
  Azuay: lista("Cuenca|Camilo Ponce Enríquez|Chordeleg|El Pan|Girón|Guachapala|Gualaceo|Nabón|Oña|Paute|Pucará|San Fernando|Santa Isabel|Sevilla de Oro|Sigsig"),
  Bolívar: lista("Guaranda|Caluma|Chillanes|Chimbo|Echeandía|Las Naves|San Miguel"),
  Cañar: lista("Azogues|Biblián|Cañar|Déleg|El Tambo|La Troncal|Suscal"),
  Carchi: lista("Tulcán|Bolívar|Espejo|Mira|Montúfar|San Pedro de Huaca"),
  Chimborazo: lista("Riobamba|Alausí|Chambo|Chunchi|Colta|Cumandá|Guamote|Guano|Pallatanga|Penipe"),
  Cotopaxi: lista("Latacunga|La Maná|Pangua|Pujilí|Salcedo|Saquisilí|Sigchos"),
  "El Oro": lista("Machala|Arenillas|Atahualpa|Balsas|Chilla|El Guabo|Huaquillas|Las Lajas|Marcabelí|Pasaje|Piñas|Portovelo|Santa Rosa|Zaruma"),
  Esmeraldas: lista("Esmeraldas|Atacames|Eloy Alfaro|Muisne|Quinindé|Río Verde|San Lorenzo"),
  Galápagos: lista("Puerto Baquerizo Moreno|Puerto Ayora|Puerto Villamil"),
  Guayas: lista("Guayaquil|Balao|Balzar|Colimes|Coronel Marcelino Maridueña|Daule|Durán|El Empalme|El Triunfo|General Antonio Elizalde|Isidro Ayora|Lomas de Sargentillo|Milagro|Naranjal|Naranjito|Nobol|Palestina|Pedro Carbo|Playas|Salitre|Samborondón|Santa Lucía|Simón Bolívar|Yaguachi"),
  Imbabura: lista("Ibarra|Antonio Ante|Cotacachi|Otavalo|Pimampiro|San Miguel de Urcuquí"),
  Loja: lista("Loja|Calvas|Catamayo|Celica|Chaguarpamba|Espíndola|Gonzanamá|Macará|Olmedo|Paltas|Pindal|Puyango|Quilanga|Saraguro|Sozoranga|Zapotillo"),
  "Los Ríos": lista("Babahoyo|Baba|Buena Fe|Mocache|Montalvo|Palenque|Puebloviejo|Quevedo|Quinsaloma|Urdaneta|Valencia|Ventanas|Vinces"),
  Manabí: lista("Portoviejo|Manta|Bolívar|Chone|El Carmen|Flavio Alfaro|Jama|Jaramijó|Jipijapa|Junín|Montecristi|Olmedo|Paján|Pedernales|Pichincha|Rocafuerte|San Vicente|Santa Ana|Sucre|Tosagua|24 de Mayo"),
  "Morona Santiago": lista("Macas|Gualaquiza|Huamboya|Limón Indanza|Logroño|Pablo Sexto|Palora|San Juan Bosco|Santiago de Méndez|Sucúa|Taisha|Tiwintza"),
  Napo: lista("Tena|Archidona|Carlos Julio Arosemena Tola|El Chaco|Quijos"),
  Orellana: lista("Francisco de Orellana (Coca)|Aguarico|La Joya de los Sachas|Loreto"),
  Pastaza: lista("Puyo|Arajuno|Mera|Santa Clara"),
  Pichincha: lista("Quito|Cayambe|Machachi|Pedro Moncayo|Pedro Vicente Maldonado|Puerto Quito|San Miguel de los Bancos|Sangolquí"),
  "Santa Elena": lista("Santa Elena|La Libertad|Salinas"),
  "Santo Domingo de los Tsáchilas": lista("Santo Domingo|La Concordia"),
  Sucumbíos: lista("Nueva Loja (Lago Agrio)|Cascales|Cuyabeno|Gonzalo Pizarro|Putumayo|Shushufindi|Sucumbíos"),
  Tungurahua: lista("Ambato|Baños de Agua Santa|Cevallos|Mocha|Patate|Quero|San Pedro de Pelileo|Santiago de Píllaro|Tisaleo"),
  "Zamora Chinchipe": lista("Zamora|Centinela del Cóndor|Chinchipe|El Pangui|Nangaritza|Palanda|Paquisha|Yacuambi|Yantzaza"),
};

const POR_PAIS: Record<string, Record<string, string[]>> = { EC: ECUADOR };

/**
 * Perú: Departamento → Provincia → Distrito. El formulario pide solo departamento y distrito (el envío y los locales se ordenan así).
 * Para Lima y Callao se sugieren los distritos; el resto del país (y Lima fuera de la capital) se escribe a mano.
 */
const DISTRITOS_PE: Record<string, string[]> = {
  Lima: lista("Ancón|Ate|Barranco|Breña|Carabayllo|Cercado de Lima|Chaclacayo|Chorrillos|Cieneguilla|Comas|El Agustino|Independencia|Jesús María|La Molina|La Victoria|Lince|Los Olivos|Lurigancho-Chosica|Lurín|Magdalena del Mar|Miraflores|Pachacámac|Pucusana|Pueblo Libre|Puente Piedra|Punta Hermosa|Punta Negra|Rímac|San Bartolo|San Borja|San Isidro|San Juan de Lurigancho|San Juan de Miraflores|San Luis|San Martín de Porres|San Miguel|Santa Anita|Santa María del Mar|Santa Rosa|Santiago de Surco|Surquillo|Villa El Salvador|Villa María del Triunfo"),
  Callao: lista("Bellavista|Callao|Carmen de la Legua Reynoso|La Perla|La Punta|Mi Perú|Ventanilla"),
};
const SUGERENCIAS: Record<string, Record<string, string[]>> = { PE: DISTRITOS_PE };

/** Distritos que se sugieren (sin obligar) al escribir el distrito de un departamento; vacío si no hay lista. */
export const sugerenciasDe = (pais: string, departamento: string): string[] => SUGERENCIAS[pais]?.[departamento] ?? [];

/** Nombre de los dos niveles de ubicación según el país (en Perú son departamento y distrito). */
export const nivelesDe = (pais: string) =>
  pais === "PE"
    ? { region: "Departamento", elRegion: "el departamento", local: "Distrito", elLocal: "el distrito", ElLocal: "El distrito" }
    : { region: "Provincia", elRegion: "la provincia", local: "Ciudad", elLocal: "la ciudad", ElLocal: "La ciudad" };

/** Ciudades de una provincia; vacío si no hay lista cargada para ese país o provincia. */
export const ciudadesDe = (pais: string, provincia: string): string[] => POR_PAIS[pais]?.[provincia] ?? [];
/** ¿Hay ciudades como lista fija para este país? (si no, la ciudad se escribe). */
export const hayCiudadesFijas = (pais: string) => !!POR_PAIS[pais];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Busca en la lista de la provincia la ciudad que corresponde a un texto libre (p. ej. "Quito, Pichincha" del mapa). */
export function ciudadCoincidente(pais: string, provincia: string, texto: string): string {
  const t = sinTildes(texto);
  if (!t) return "";
  return ciudadesDe(pais, provincia).find((c) => {
    const n = sinTildes(c.replace(/\s*\(.*\)/, ""));
    return t === sinTildes(c) || t.split(/[,/-]/).some((p) => p.trim() === n);
  }) ?? "";
}
