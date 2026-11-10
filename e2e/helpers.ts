import { expect, type Page } from "@playwright/test";

/** Origen de la app bajo prueba (ver E2E_PORT en playwright.config.ts). */
export const ORIGEN = `http://localhost:${process.env["E2E_PORT"] ?? "4200"}`;

/** Rutas del sitio del participante (las dinámicas usan datos de ejemplo). */
export const PUBLIC_ROUTES = [
  "/", "/canjea", "/canjea/p1", "/beneficios", "/beneficios/b1", "/beneficios/b6", "/buscar?q=sony", "/favoritos", "/carrito", "/gracias",
  "/mi-nivel", "/notificaciones", "/mis-beneficios", "/mis-compras", "/mis-compras/BNB-4F82KDL1",
  "/mis-puntos/historial", "/mis-puntos/compra",
  "/perfil", "/contacto", "/vuelos", "/vuelos/cotizaciones", "/vuelos/destinos/galapagos",
  "/preguntas-frecuentes", "/terminos", "/privacidad",
];

/** Secciones que arrancan ocultas en el menú (el admin las habilita en Contenido → Menú del sitio). */


export const ADMIN_ROUTES = [
  "/admin", "/admin/reportes", "/admin/participantes", "/admin/formulario", "/admin/movimientos", "/admin/reglas", "/admin/niveles",
  "/admin/productos", "/admin/beneficios", "/admin/marcas", "/admin/destinos", "/admin/compras-puntos", "/admin/pedidos", "/admin/cotizaciones", "/admin/atencion",
  "/admin/contenido", "/admin/configuracion", "/admin/usuarios", "/admin/roles", "/admin/auditoria",
];

/** Acumula errores de consola y excepciones no controladas de la página. */
export function vigilarErrores(page: Page) {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(`console: ${m.text()}`);
  });
  return errores;
}

/** Espera a que la app termine de cargar datos de la API simulada. */
export async function esperarCarga(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(350);
}

/** Usuarios iniciales del panel, uno por rol (ver README). */
export const USUARIOS: Record<string, { email: string; clave: string; nombre: string }> = {
  Administrador: { email: "admin@bancosolidario.com", clave: "Admin#2026", nombre: "Mariela Castro" },
  Catálogo: { email: "catalogo@bancosolidario.com", clave: "Catalogo#2026", nombre: "Roberto Peña" },
  Operaciones: { email: "operaciones@bancosolidario.com", clave: "Operaciones#2026", nombre: "Karla Núñez" },
  Atención: { email: "atencion@bancosolidario.com", clave: "Atencion#2026", nombre: "Lucía Torres" },
  "Solo lectura": { email: "lectura@bancosolidario.com", clave: "Lectura#2026", nombre: "Esteban Lara" },
};

export async function entrarAdmin(page: Page, rol = "Administrador") {
  const u = USUARIOS[rol]!;
  await page.goto("/admin");
  await page.getByLabel("Correo").fill(u.email);
  await page.getByLabel("Contraseña").fill(u.clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("button", { name: "Menú de usuario" })).toBeVisible();
}

/** Publica una versión nueva de Términos o de Privacidad desde Admin → Textos legales (hay que haber entrado al panel). */
export async function publicarLegal(
  page: Page,
  documento: "Términos y condiciones" | "Política de privacidad",
  o: { texto: string; intro?: string; notas?: string; exigeAceptacion?: boolean },
) {
  await page.goto("/admin/legales");
  await page.getByRole("tab", { name: documento }).click();
  await page.getByLabel(`Texto de ${documento}`).fill(o.texto);
  if (o.intro !== undefined) await page.getByLabel(/^Subtítulo de la página/).fill(o.intro);
  await page.getByLabel(/^Qué cambió/).fill(o.notas ?? "Cambio de prueba en el texto.");
  const exige = page.getByRole("checkbox", { name: /deben aceptarla de nuevo/ });
  if ((o.exigeAceptacion ?? true) !== (await exige.isChecked())) await exige.click();
  await page.getByRole("button", { name: "Publicar versión" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/** Elementos que desbordan horizontalmente el viewport (para diagnosticar). */
export async function desbordes(page: Page) {
  return page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const out: string[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > ancho + 1 && !el.closest(".no-scrollbar, .overflow-x-auto, [class*='overflow-x'], canvas")) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} (${Math.round(r.right)}>${ancho})`);
      }
    });
    return { scroll: document.documentElement.scrollWidth, ancho, out: out.slice(0, 6) };
  });
}

/**
 * Descargas de listados: el botón abre el diálogo "Descargar" y se elige el formato (Excel o PDF). Devuelve la descarga.
 * Los Excel que arma la plataforma van sin comprimir, así que su contenido se puede leer como texto con `textoDeArchivo`.
 */
export async function descargarListado(page: Page, abrir: () => Promise<unknown>, formato: "Excel" | "PDF" = "Excel") {
  await abrir();
  const d = page.getByRole("dialog", { name: /^Descargar/ });
  const [descarga] = await Promise.all([page.waitForEvent("download"), d.getByRole("button", { name: new RegExp(formato) }).click()]);
  return descarga;
}
export async function textoDeArchivo(d: { path(): Promise<string | null> }) {
  const { readFileSync } = await import("node:fs");
  return readFileSync((await d.path())!, "utf8");
}