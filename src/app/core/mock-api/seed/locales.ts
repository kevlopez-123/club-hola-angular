/**
 * Locales (establecimientos) de las marcas aliadas: dónde se puede canjear cada beneficio.
 * Son datos de ejemplo para la demo: direcciones y coordenadas aproximadas, no de locales reales.
 * En producción se cargan desde el panel (Marcas → Locales) o con la carga masiva.
 */
export interface Local {
  id: string;
  /** Nombre de la marca (igual que en Marcas aliadas y en los beneficios). */
  marca: string;
  /** Nombre del local, p. ej. «Bembos Miraflores». */
  nombre: string;
  direccion: string;
  distrito: string;
  /** Departamento o provincia. */
  provincia: string;
  lat: number;
  lng: number;
  horario: string;
  telefono: string;
  activo: boolean;
}

type Punto = { distrito: string; provincia: string; calle: string; lat: number; lng: number };
const LIMA = "Lima";
const PUNTOS: Punto[] = [
  { distrito: "Miraflores", provincia: LIMA, calle: "Av. Larco", lat: -12.1219, lng: -77.0297 },
  { distrito: "San Isidro", provincia: LIMA, calle: "Av. Javier Prado Este", lat: -12.0977, lng: -77.0365 },
  { distrito: "Santiago de Surco", provincia: LIMA, calle: "Av. Primavera", lat: -12.1305, lng: -76.9918 },
  { distrito: "La Molina", provincia: LIMA, calle: "Av. La Molina", lat: -12.0867, lng: -76.9055 },
  { distrito: "San Borja", provincia: LIMA, calle: "Av. San Luis", lat: -12.1076, lng: -76.9990 },
  { distrito: "Jesús María", provincia: LIMA, calle: "Av. Salaverry", lat: -12.0710, lng: -77.0510 },
  { distrito: "San Miguel", provincia: LIMA, calle: "Av. La Marina", lat: -12.0770, lng: -77.0830 },
  { distrito: "Barranco", provincia: LIMA, calle: "Av. Grau", lat: -12.1498, lng: -77.0210 },
  { distrito: "Lince", provincia: LIMA, calle: "Av. Arequipa", lat: -12.0870, lng: -77.0340 },
  { distrito: "Los Olivos", provincia: LIMA, calle: "Av. Alfredo Mendiola", lat: -11.9930, lng: -77.0720 },
  { distrito: "Cercado de Lima", provincia: LIMA, calle: "Jr. de la Unión", lat: -12.0464, lng: -77.0302 },
  { distrito: "Arequipa", provincia: "Arequipa", calle: "Av. Ejército", lat: -16.3989, lng: -71.5350 },
  { distrito: "Cusco", provincia: "Cusco", calle: "Av. El Sol", lat: -13.5180, lng: -71.9785 },
  { distrito: "Trujillo", provincia: "La Libertad", calle: "Av. España", lat: -8.1116, lng: -79.0288 },
];

/** Cuántos locales tiene cada marca y desde qué punto de la lista se reparten. */
const MARCAS: Record<string, { n: number; desde: number; horario: string; delivery?: boolean }> = {
  "Pardos Chicken": { n: 4, desde: 0, horario: "Lun a Dom 11:00 a 23:00" },
  "Starbucks": { n: 4, desde: 1, horario: "Lun a Dom 07:00 a 22:00" },
  "Smart Fit": { n: 3, desde: 3, horario: "Lun a Vie 05:30 a 23:00 · Sáb y Dom 08:00 a 20:00" },
  "Inkafarma": { n: 4, desde: 2, horario: "Todos los días 24 horas" },
  "Saga Falabella": { n: 3, desde: 4, horario: "Lun a Dom 10:00 a 22:00" },
  "Casa Andina": { n: 3, desde: 0, horario: "Recepción 24 horas" },
  "Cineplanet": { n: 4, desde: 5, horario: "Lun a Dom 12:00 a 00:00" },
  "Plaza Vea": { n: 3, desde: 6, horario: "Lun a Dom 08:00 a 22:00" },
  "Edo Sushi Bar": { n: 2, desde: 0, horario: "Lun a Sáb 12:30 a 23:00" },
  "Auto Spa": { n: 2, desde: 8, horario: "Lun a Sáb 08:00 a 19:00" },
  "PF Changs": { n: 2, desde: 1, horario: "Lun a Dom 12:00 a 23:00" },
  "Coolbox": { n: 3, desde: 4, horario: "Lun a Dom 10:00 a 21:00" },
  "Montalvo Spa": { n: 2, desde: 0, horario: "Lun a Dom 10:00 a 21:00" },
  "Idiomas Católica": { n: 2, desde: 4, horario: "Lun a Vie 08:00 a 21:00" },
  "Superpet": { n: 3, desde: 3, horario: "Lun a Sáb 09:00 a 20:00" },
  "Sodimac": { n: 3, desde: 9, horario: "Lun a Dom 08:00 a 21:00" },
  "Pacífico Seguros": { n: 2, desde: 1, horario: "Lun a Vie 09:00 a 18:00" },
  "Costamar Travel": { n: 2, desde: 2, horario: "Lun a Vie 09:00 a 18:00 · Sáb 09:00 a 13:00" },
  "Cirque du Soleil": { n: 1, desde: 10, horario: "Según función" },
  "Platanitos": { n: 2, desde: 7, horario: "Lun a Dom 12:00 a 23:00" },
  "Bembos": { n: 4, desde: 0, horario: "Lun a Dom 11:00 a 23:30" },
  "Chili's": { n: 3, desde: 1, horario: "Lun a Dom 12:00 a 23:00" },
  "Tottus": { n: 3, desde: 9, horario: "Lun a Dom 08:00 a 22:00" },
  "Adidas": { n: 3, desde: 2, horario: "Lun a Dom 10:00 a 22:00" },
};

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function localesIniciales(): Local[] {
  const salida: Local[] = [];
  let semilla = 7;
  for (const [marca, c] of Object.entries(MARCAS)) {
    for (let i = 0; i < c.n; i++) {
      const p = PUNTOS[(c.desde + i * 3) % PUNTOS.length]!;
      // Un pequeño desplazamiento para que dos marcas en el mismo distrito no se pisen en el mapa.
      semilla = (semilla * 31 + 17) % 97;
      const dLat = ((semilla % 11) - 5) * 0.0006;
      const dLng = (((semilla >> 1) % 11) - 5) * 0.0006;
      const numero = 100 + ((semilla * 13) % 900);
      salida.push({
        id: `${slug(marca)}-${String(i + 1).padStart(2, "0")}`,
        marca,
        nombre: `${marca} ${p.distrito}`,
        direccion: `${p.calle} ${numero}`,
        distrito: p.distrito,
        provincia: p.provincia,
        lat: +(p.lat + dLat).toFixed(5),
        lng: +(p.lng + dLng).toFixed(5),
        horario: c.horario,
        telefono: `01 ${4000000 + ((semilla * 7919) % 5000000)}`,
        activo: true,
      });
    }
  }
  return salida;
}
