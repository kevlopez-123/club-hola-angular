import { describe, expect, it } from "vitest";
import { bloquesDe, DISENO_BASE, PLANTILLAS_BASE, renderCorreoHtml, renderPlantilla, textoPlano, type EntornoCorreo } from "./correos";

const env: EntornoCorreo = { logoClaro: "", logoOscuro: "https://x.test/logo.svg", primario: "#00bdd2", textoPrimario: "#ffffff", programa: "Mi Programa", banco: "Mi Banco", redes: { instagram: "https://ig.test/x", facebook: "javascript:alert(1)" } };

describe("plantillas de correo", () => {
  it("reemplaza variables y deja visibles las desconocidas", () => {
    expect(renderPlantilla("Hola {nombre}, {codigo} {rara}", { nombre: "Ana", codigo: 5 })).toBe("Hola Ana, 5 {rara}");
  });

  it("toda plantilla de fábrica usa solo variables que declara", () => {
    for (const p of PLANTILLAS_BASE) {
      const usadas = [...(p.asunto + p.cuerpo + (p.boton?.texto ?? "") + (p.boton?.url ?? "")).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const v of usadas) expect(p.variables, `${p.id} usa {${v}}`).toContain(v);
    }
  });

  it("sin bloques guardados se arma título + mensaje (+ botón)", () => {
    const p = PLANTILLAS_BASE.find((x) => x.id === "bienvenida")!;
    expect(bloquesDe(p).map((b) => b.tipo)).toEqual(["titulo", "texto", "boton"]);
    expect(bloquesDe({ asunto: "A", cuerpo: "B" }).map((b) => b.tipo)).toEqual(["titulo", "texto"]);
  });

  it("el HTML escapa lo que viene de variables (sin inyección)", () => {
    const html = renderCorreoHtml(bloquesDe({ asunto: "Hola {nombre}", cuerpo: "x" }), DISENO_BASE, env, { nombre: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("los enlaces solo permiten http(s), mailto y tel; si no, quedan en #", () => {
    const b = [{ id: "1", tipo: "boton" as const, texto: "Ir", url: "{u}" }];
    expect(renderCorreoHtml(b, DISENO_BASE, env, { u: "https://ok.test/a" })).toContain('href="https://ok.test/a"');
    expect(renderCorreoHtml(b, DISENO_BASE, env, { u: "javascript:alert(1)" })).toContain('href="#"');
  });

  it("las redes con esquema peligroso no salen en el pie y las demás sí", () => {
    const html = renderCorreoHtml([], DISENO_BASE, env, {});
    expect(html).toContain("https://ig.test/x");
    expect(html).not.toContain("javascript:");
    expect(renderCorreoHtml([], { ...DISENO_BASE, mostrarRedes: false }, env, {})).not.toContain("ig.test");
  });

  it("usa los colores de la marca salvo que el diseño los cambie", () => {
    const b = [{ id: "1", tipo: "boton" as const, texto: "Ir", url: "https://a.test" }];
    expect(renderCorreoHtml(b, DISENO_BASE, env, {})).toContain("background:#00bdd2");
    expect(renderCorreoHtml(b, { ...DISENO_BASE, colorBoton: "#7c3aed" }, env, {})).toContain("background:#7c3aed");
  });

  it("el texto plano junta títulos y párrafos con las variables resueltas", () => {
    expect(textoPlano(bloquesDe({ asunto: "Hola {n}", cuerpo: "Cuerpo {n}" }), { n: "Ana" })).toBe("Hola Ana\n\nCuerpo Ana");
  });
});