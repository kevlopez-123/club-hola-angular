import { expect, test, type Page } from "@playwright/test";
import { entrarAdmin, esperarCarga } from "./helpers";

const K = "bancosolidario_mockdb_v11";

/** Cambia la base simulada del navegador (como si el panel ya lo hubiera guardado) y deja la página lista para recargar. */
async function editarDb(page: Page, parches: { benef?: Record<string, Record<string, unknown>>; provincia?: string | null; liberarCupones?: boolean; canjesHaceDias?: number | null }) {
  await page.evaluate(([k, p]) => {
    const d = JSON.parse(localStorage.getItem(k as string)!);
    const pa = p as any;
    for (const [id, cambios] of Object.entries(pa.benef ?? {})) {
      for (const lista of [d.admin.beneficios, d.catalogo.beneficios]) {
        const b = lista.find((x: any) => x.id === id);
        if (b) for (const [c, v] of Object.entries(cambios as Record<string, unknown>)) { if (v === undefined) delete b[c]; else b[c] = v; }
      }
    }
    if (pa.provincia !== undefined) {
      const campo = d.admin.campos.find((c: any) => c.mapeo === "provincia");
      d.perfil.extra = { ...(d.perfil.extra ?? {}) };
      if (pa.provincia === null) delete d.perfil.extra[campo.id]; else d.perfil.extra[campo.id] = pa.provincia;
      const ficha = d.admin.participantes.find((x: any) => x.id === "p1");
      if (ficha) ficha.extra = { ...(ficha.extra ?? {}), ...(pa.provincia === null ? {} : { [campo.id]: pa.provincia }) };
    }
    if (pa.liberarCupones) d.cupones = {};
    if (pa.canjesHaceDias !== undefined) {
      d.misBeneficios = d.misBeneficios.filter((m: any) => m.beneficioId !== "b1");
      if (pa.canjesHaceDias !== null) d.misBeneficios.push({ id: "mbt", beneficioId: "b1", codigo: "X", estado: "activo", fecha: "01/01/2026", vence: "01/01/2026 10:00", ts: Date.now() - pa.canjesHaceDias * 864e5 });
    }
    localStorage.setItem(k as string, JSON.stringify(d));
  }, [K, parches]);
}

const dia = (desplazamiento: number) => new Date(Date.now() + desplazamiento * 864e5).toISOString().slice(0, 10);

async function abrirBeneficio(page: Page, id = "b1") {
  await page.goto(`/beneficios/${id}`);
  await esperarCarga(page);
}
const botonGenerar = (page: Page) => page.getByRole("button", { name: "Generar cupón" });
async function generar(page: Page) {
  await botonGenerar(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
}

test.describe("Fase C: reglas de los beneficios", () => {
  test.beforeEach(async ({ page }) => {
    await entrarAdmin(page); // deja la sesión y la base simulada guardadas en el navegador
  });

  test("vigencia: un beneficio programado o vencido no se lista y su ficha explica por qué no se puede canjear", async ({ page }) => {
    await editarDb(page, { benef: { b1: { desde: dia(5) } } });
    await page.goto("/beneficios");
    await esperarCarga(page);
    await expect(page.locator('a[href="/beneficios/b1"]')).toHaveCount(0);
    await abrirBeneficio(page);
    await expect(page.getByText(/estará disponible desde el/)).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();

    await editarDb(page, { benef: { b1: { desde: undefined, hasta: dia(-1) } } });
    await abrirBeneficio(page);
    await expect(page.getByText(/Este beneficio venció el/)).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();

    await editarDb(page, { benef: { b1: { desde: dia(-3), hasta: dia(10) } } });
    await abrirBeneficio(page);
    await expect(page.getByLabel("Condiciones del beneficio").getByText(/Válido hasta el/)).toBeVisible();
    await expect(botonGenerar(page)).toBeEnabled();
  });

  test("regla del cupón: dura 24 h, se canjea 1 vez y luego hay que esperar 3 meses desde el último canje", async ({ page }) => {
    await editarDb(page, { benef: { b1: { cupon: { horas: 24, limite: 1, meses: 3 } } }, liberarCupones: true, canjesHaceDias: null });
    await abrirBeneficio(page);
    await expect(page.getByText(/Puedes canjearlo 1 vez; después debes esperar 3 meses/).first()).toBeVisible();
    await botonGenerar(page).click();
    await expect(page.getByRole("dialog")).toContainText("validez de 24 horas");
    await page.getByRole("dialog").getByRole("button", { name: "Generar cupón" }).click();
    await expect(page.getByAltText(/Código QR/)).toBeVisible();

    // El cupón vence: el beneficio queda bloqueado hasta 3 meses después del canje.
    await page.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)!); d.cupones.b1.expira = Date.now() - 1000; localStorage.setItem(k, JSON.stringify(d)); }, K);
    await abrirBeneficio(page);
    await expect(page.getByText(/Ya canjeaste este beneficio\. Podrás volver a canjearlo el \d{2}\/\d{2}\/\d{4}\./)).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();

    // Pasados los 3 meses desde el último canje, se puede de nuevo.
    await editarDb(page, { liberarCupones: true, canjesHaceDias: 100 });
    await abrirBeneficio(page);
    await expect(botonGenerar(page)).toBeEnabled();
  });

  test("código compartido: todos reciben el mismo código y se respeta el máximo de usos", async ({ page }) => {
    await editarDb(page, { benef: { b1: { modoCodigo: "compartido", codigoCompartido: "PROMO20", usosMaximos: 1, usos: 0, cupon: undefined } }, liberarCupones: true, canjesHaceDias: null });
    await abrirBeneficio(page);
    expect(await page.content()).not.toContain("PROMO20"); // el código compartido no se publica en el catálogo: solo lo recibe quien canjea
    await generar(page);
    await expect(page.getByAltText("Código QR PROMO20")).toBeVisible();

    await editarDb(page, { liberarCupones: true, canjesHaceDias: null }); // otro participante / otro día
    await abrirBeneficio(page);
    await expect(page.getByText("Los cupones de este beneficio se agotaron.")).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();
  });

  test("provincias: el filtro del catálogo muestra lo disponible en la provincia elegida y la ficha avisa si no aplica", async ({ page }) => {
    await editarDb(page, { benef: { b1: { provincias: ["Guayas"] }, b2: { provincias: ["Pichincha"] } }, provincia: "Pichincha", liberarCupones: true, canjesHaceDias: null });
    await page.goto("/beneficios");
    await esperarCarga(page);
    await expect(page.locator('a[href="/beneficios/b1"]').first()).toBeVisible(); // sin filtro se ven todos
    await page.getByRole("button", { name: /Filtros/ }).click();
    const sel = page.getByLabel("Provincia", { exact: true });
    await expect(sel.locator("option")).toHaveText(["Todas las provincias", "Guayas", "Pichincha"]);
    await sel.selectOption("Pichincha");
    await expect(page.locator('a[href="/beneficios/b1"]')).toHaveCount(0);
    await expect(page.locator('a[href="/beneficios/b2"]').first()).toBeVisible();
    await sel.selectOption("Guayas");
    await expect(page.locator('a[href="/beneficios/b1"]').first()).toBeVisible();
    await expect(page.locator('a[href="/beneficios/b2"]')).toHaveCount(0);

    await abrirBeneficio(page, "b1");
    await expect(page.getByText("Disponible en Guayas").first()).toBeVisible();
    await expect(page.getByText(/Tu provincia \(Pichincha\) no está incluida/)).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();
    await abrirBeneficio(page, "b2");
    await expect(botonGenerar(page)).toBeEnabled();
  });

  test("sin provincia en Mis datos el beneficio se muestra y se pide completarla", async ({ page }) => {
    await editarDb(page, { benef: { b1: { provincias: ["Guayas"] } }, provincia: null, liberarCupones: true, canjesHaceDias: null });
    await abrirBeneficio(page);
    await expect(page.getByText(/Indica tu provincia en Mis datos para canjearlo/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Completar mis datos" })).toBeVisible();
    await expect(botonGenerar(page)).toBeDisabled();
  });

  test("panel: se editan la vigencia, la regla del cupón, el código compartido y las provincias de un beneficio", async ({ page }) => {
    await page.goto("/admin/beneficios");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Editar" }).first().click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Inicio", { exact: true }).fill(dia(-2));
    await d.getByLabel("Vencimiento", { exact: true }).fill(dia(30));
    await d.getByLabel("Dura (horas)").fill("24");
    await d.getByLabel("Se puede canjear (veces)").fill("1");
    await d.getByLabel("Espera (meses)").fill("3");
    await expect(d.getByText("El cupón dura 24 horas. Cada participante puede canjearlo 1 vez; después debe esperar 3 meses desde su último canje para volver a hacerlo.")).toBeVisible();
    await d.getByLabel("Código del cupón").selectOption("compartido");
    await d.getByLabel("Código compartido").fill("verano26");
    await d.getByRole("switch", { name: "En todo el país" }).click();
    await d.getByRole("button", { name: "Guayas", exact: true }).click();
    await d.getByRole("button", { name: "Azuay", exact: true }).click();
    await expect(d.getByText("2 de 24 provincias")).toBeVisible();

    // Un vencimiento anterior al inicio no deja guardar.
    await d.getByLabel("Vencimiento", { exact: true }).fill(dia(-10));
    await expect(d.getByRole("alert")).toContainText("no puede ser anterior");
    await expect(d.getByRole("button", { name: "Guardar beneficio" })).toBeDisabled();
    await d.getByLabel("Vencimiento", { exact: true }).fill(dia(30));
    await d.getByRole("button", { name: "Guardar beneficio" }).click();
    await expect(page.getByText("Beneficio guardado")).toBeVisible();

    const fila = page.locator("tbody tr").first();
    await expect(fila).toContainText("Vigente");
    await expect(fila).toContainText("Guayas, Azuay");
    const guardado = await page.evaluate((k) => { const b = JSON.parse(localStorage.getItem(k)!).admin.beneficios[0]; return { cod: b.codigoCompartido, modo: b.modoCodigo, cupon: b.cupon, prov: b.provincias, vig: b.vigencia }; }, K);
    expect(guardado).toEqual({ cod: "VERANO26", modo: "compartido", cupon: { horas: 24, limite: 1, meses: 3 }, prov: ["Guayas", "Azuay"], vig: undefined });

    // El filtro de vigencia de la lista.
    await page.getByLabel("Vigencia", { exact: true }).selectOption("vencido");
    await expect(page.locator("tbody tr").filter({ hasText: "Vigente" })).toHaveCount(0);
  });

  test("panel: la regla del cupón es de cada beneficio y no deja guardar valores fuera de rango", async ({ page }) => {
    await page.goto("/admin/beneficios");
    await esperarCarga(page);
    await expect(page.getByText("Regla general del cupón")).toHaveCount(0);
    await page.getByRole("button", { name: "Editar" }).first().click();
    const d = page.getByRole("dialog");
    await expect(d.getByText("Regla del cupón de este beneficio")).toBeVisible();
    await d.getByLabel("Espera (meses)").fill("0");
    await expect(d.getByRole("alert")).toContainText("1 a 60 meses");
    await expect(d.getByRole("button", { name: "Guardar beneficio" })).toBeDisabled();
    await d.getByLabel("Espera (meses)").fill("6");
    await d.getByLabel("Dura (horas)").fill("48");
    await d.getByRole("button", { name: "Guardar beneficio" }).click();
    await expect(page.getByText("Beneficio guardado")).toBeVisible();
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).admin.beneficios[0].cupon, K)).toMatchObject({ horas: 48, meses: 6 });
    // el segundo beneficio conserva su propia regla
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).admin.beneficios[1].cupon?.horas, K)).not.toBe(48);
  });
});
