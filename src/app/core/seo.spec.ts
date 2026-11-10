import { describe, expect, it } from "vitest";
import { DESCRIPCIONES, esRutaPrivada, RUTAS_INDEXABLES } from "./seo.service";
import { esRutaAbierta } from "./participante.guard";

describe("SEO: rutas (el sitio está cerrado: hay que iniciar sesión)", () => {
  it("el catálogo, la cuenta, la compra, el panel y el ingreso no se indexan (con o sin parámetros ni subrutas)", () => {
    for (const r of ["/", "/canjea", "/canjea/p1", "/beneficios/b1", "/vuelos", "/preguntas-frecuentes", "/admin", "/admin/pedidos", "/login", "/carrito", "/mis-compras/BNB-1", "/perfil", "/buscar?q=sony", "/baja"]) {
      expect(esRutaPrivada(r), r).toBe(true);
    }
  });

  it("solo los textos legales se indexan", () => {
    for (const r of ["/terminos", "/privacidad", "/terminos/", "/privacidad?x=1"]) expect(esRutaPrivada(r), r).toBe(false);
    expect(RUTAS_INDEXABLES).toEqual(["/terminos", "/privacidad"]);
  });

  it("cada página con descripción propia es indexable", () => {
    for (const r of Object.keys(DESCRIPCIONES)) expect(esRutaPrivada(r), r).toBe(false);
  });

  it("las descripciones se mantienen en un largo útil para buscadores", () => {
    for (const d of Object.values(DESCRIPCIONES)) expect(d.length).toBeLessThanOrEqual(200);
  });
});

describe("Sitio cerrado: páginas abiertas sin sesión", () => {
  it("solo textos legales y baja de correos", () => {
    for (const r of ["/terminos", "/privacidad", "/baja", "/baja?t=p1.abc", "/terminos/"]) expect(esRutaAbierta(r), r).toBe(true);
    for (const r of ["/", "/canjea", "/beneficios/b1", "/vuelos", "/preguntas-frecuentes", "/buscar", "/perfil"]) expect(esRutaAbierta(r), r).toBe(false);
  });
});