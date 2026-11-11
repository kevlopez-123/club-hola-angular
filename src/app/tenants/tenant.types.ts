/**
 * Configuración de marca ("tenant") de la plataforma. Es lo único que hay que cambiar para
 * reutilizar el producto en otro cliente o país: colores, logos, imágenes, moneda, documentos, provincias…
 * Se edita desde Admin → Configuración → Marca y localización, o copiando un preset de `tenants/presets.ts`.
 * La plataforma está en español únicamente.
 */
export type DocumentoIdentidad = { value: string; label: string; digitos: number; numerico: boolean };

/** División administrativa (provincia, departamento, región…) y si se hacen envíos a ella. */
export type Provincia = { nombre: string; envio: boolean };

export type TenantConfig = {
  /** Identificador interno (se usa para exportar/importar y nombrar archivos). */
  id: string;
  marca: {
    /** Nombre de la empresa (ej. "Banco Solidario"). */
    nombre: string;
    /** Nombre del programa (ej. "Banco Solidario Puntos"); aparece en títulos y cabeceras. */
    programa: string;
    /** Palabra con la que se nombra la moneda del programa (ej. "puntos", "millas"). */
    unidadPuntos: string;
    /** Logo para fondos claros/blancos (URL o data URL). */
    logoClaro: string;
    /** Logo para fondos de color/oscuros (URL o data URL). */
    logoOscuro: string;
    /** Ícono de la pestaña del navegador. */
    favicon: string;
    /** Texto legal del pie de página. */
    derechos: string;
  };
  tema: {
    /** Color principal de la marca (botones, cabecera, acentos). */
    primario: string;
    /** Color de la letra sobre el color principal (botones primarios, cabecera). Por defecto blanco. */
    textoPrimario: string;
    /** Color del texto. */
    texto: string;
    /** Fondo de la página. */
    fondo: string;
    /** Fondo de secciones y tarjetas secundarias. */
    superficie: string;
    /** Radio base de las esquinas, en rem. */
    radio: number;
    /** Acento secundario (etiquetas, descuentos). Por defecto, el color principal. */
    acento?: string;
    /** Acento terciario (nivel Oro, detalles). Por defecto, el color principal. */
    acento2?: string;
    /** Fondo de la cabecera: color o gradiente CSS. Por defecto, el color principal. */
    gradiente?: string;
    /** Fondo de los chips y tarjetas suaves. Por defecto, una mezcla clara del principal. */
    secundario?: string;
    /** Texto sobre el fondo suave. Por defecto, el color del texto. */
    secundarioTexto?: string;
    /** Color de los fondos oscuros (pie de página, menú móvil). Por defecto, el color del texto. */
    oscuro?: string;
    /** Familia tipográfica (Google Fonts u otra). */
    fuente: string;
    /** URL de la hoja de estilos de la fuente (opcional). */
    fuenteUrl: string;
  };
  pais: {
    /** Código ISO 3166-1 alfa-2 (EC, PE, CO…). También nombra la bandera (`public/flags/ec.svg`). */
    codigo: string;
    nombre: string;
    /** Formato regional de números y fechas (es-EC, es-PE…). Se deriva del país. */
    locale: string;
    telefonoPrefijo: string;
    /** Dígitos del teléfono móvil sin prefijo. */
    telefonoDigitos: number;
    moneda: { codigo: string; simbolo: string };
    /** Centro y zoom inicial del mapa de direcciones. */
    centro: { lat: number; lng: number; zoom: number };
    documentos: DocumentoIdentidad[];
    /** Provincias/departamentos y cuáles tienen envío. Editable desde el panel. */
    provincias: Provincia[];
  };
  imagenes: {
    login: string;
    contacto: string;
    ctaCatalogo: string;
    ctaContacto: string;
  };
};
