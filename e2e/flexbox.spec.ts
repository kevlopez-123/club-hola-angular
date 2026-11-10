import { expect, test, type Page } from "@playwright/test";
import { ADMIN_ROUTES, PUBLIC_ROUTES, entrarAdmin, esperarCarga } from "./helpers";

/**
 * Detecta contenedores flex cuyos hijos se salen de su caja (texto o botones cortados, como un "Editar" fuera de la tarjeta).
 * Los carruseles con scroll horizontal (overflow-x auto/scroll) se excluyen a propósito.
 */
async function desbordesFlex(page: Page) {
  return page.evaluate(() => {
    const out = new Set<string>();
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const cs = getComputedStyle(el);
      if (!/flex/.test(cs.display) || cs.visibility === "hidden" || /(auto|scroll)/.test(cs.overflowX)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || el.closest(".leaflet-container,.cd-popup,.cs-popup,[aria-hidden=true]")) continue;
      for (const c of Array.from(el.children) as HTMLElement[]) {
        const cc = getComputedStyle(c);
        if (cc.position === "absolute" || cc.position === "fixed" || cc.display === "none") continue;
        const b = c.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right - r.right > 1.5 || (cs.flexDirection.startsWith("row") && b.left < r.left - 1.5)) {
          out.add(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 5).join(".")} > ${c.tagName.toLowerCase()}${c.className ? "." + String(c.className).split(" ")[0] : ""}`);
        }
      }
    }
    return [...out];
  });
}

const ANCHOS = [
  { nombre: "móvil", width: 375, height: 800 },
  { nombre: "tablet", width: 768, height: 1000 },
  { nombre: "escritorio", width: 1280, height: 800 },
];

for (const vp of ANCHOS) {
  test.describe(`Flexbox sin desbordes · ${vp.nombre} ${vp.width}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.setTimeout(300_000);

    test("el sitio no tiene contenedores flex desbordados", async ({ page }) => {
      const fallos: string[] = [];
      for (const ruta of PUBLIC_ROUTES) {
        await page.goto(ruta);
        await esperarCarga(page);
        for (const d of await desbordesFlex(page)) fallos.push(`${ruta} → ${d}`);
      }
      expect(fallos).toEqual([]);
    });

    test("el panel no tiene contenedores flex desbordados (incluidas las pestañas de categorías)", async ({ page }) => {
      await entrarAdmin(page);
      const fallos: string[] = [];
      for (const ruta of ADMIN_ROUTES) {
        await page.goto(ruta);
        await esperarCarga(page);
        for (const d of await desbordesFlex(page)) fallos.push(`${ruta} → ${d}`);
        if (ruta === "/admin/productos" || ruta === "/admin/beneficios") {
          for (const pestana of ["Categorías y subcategorías", "Categorías", "Banners"]) {
            const b = page.getByRole("button", { name: pestana, exact: true });
            if (await b.count()) {
              await b.click();
              await page.waitForTimeout(400);
              for (const d of await desbordesFlex(page)) fallos.push(`${ruta} [${pestana}] → ${d}`);
            }
          }
        }
      }
      expect(fallos).toEqual([]);
    });
  });
}