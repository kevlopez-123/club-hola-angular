import { expect, test, type Page } from "@playwright/test";

/** Las pruebas no dependen de internet: se simulan las teselas del mapa y el servicio de direcciones de OpenStreetMap. */
async function simularOsm(page: Page) {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png }));
  await page.route("**/nominatim.openstreetmap.org/reverse*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ display_name: "Av. Simulada 123, Quito", address: { road: "Av. Simulada", house_number: "123", city: "Quito", state: "Pichincha" } }) }),
  );
  await page.route("**/nominatim.openstreetmap.org/search*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ lat: "-0.2", lon: "-78.5" }]) }));
}

test.describe("Dirección con mapa de OpenStreetMap (Leaflet)", () => {
  test("marcar un punto completa la dirección y se guarda con su ubicación", async ({ page }) => {
    await simularOsm(page);
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    const mapa = page.getByRole("application", { name: /Mapa para ubicar tu dirección/ });
    await expect(mapa).toBeVisible();
    await expect(page.locator(".leaflet-tile-pane img").first()).toBeAttached();
    await mapa.click({ position: { x: 120, y: 90 } });
    await expect(page.getByText(/Ubicación marcada: -?\d+\.\d+, -?\d+\.\d+/)).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon")).toBeVisible();
    await expect(page.getByLabel("Dirección", { exact: true })).toHaveValue("Av. Simulada 123");
    await expect(page.getByLabel("Ciudad", { exact: true })).toHaveValue("Quito");
    await expect(page.getByLabel("Provincia")).toHaveValue("Pichincha");

    // lo escrito a mano no se pisa con una nueva sugerencia
    await page.getByLabel("Dirección", { exact: true }).fill("Mi calle exacta 45");
    await mapa.click({ position: { x: 60, y: 120 } });
    await expect(page.getByLabel("Dirección", { exact: true })).toHaveValue("Mi calle exacta 45");

    const d = page.getByRole("dialog");
    await d.getByLabel("Alias (Casa, Oficina)").fill("Mapa");
    await d.getByLabel("¿Quién recibe?").fill("Ana");
    await d.getByLabel("Teléfono de contacto").fill("996543210");
    await d.getByRole("button", { name: "Guardar dirección" }).click();
    const tarjeta = page.locator("li", { hasText: "Mi calle exacta 45" });
    await expect(tarjeta.getByRole("link", { name: "Ver en el mapa" })).toHaveAttribute("href", /openstreetmap\.org\/\?mlat=-?\d+\.\d+&mlon=-?\d+\.\d+/);
  });

  test("buscar un lugar centra el mapa y la dirección es opcional", async ({ page }) => {
    await simularOsm(page);
    await page.goto("/perfil");
    await page.getByRole("tab", { name: "Direcciones de envío" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    await page.getByLabel("Buscar dirección en el mapa").fill("Plaza Foch");
    await page.getByRole("dialog").getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText("Ubicación marcada: -0.20000, -78.50000")).toBeVisible();
    // sin mapa también se puede guardar escribiendo la dirección
    const d = page.getByRole("dialog");
    await d.getByLabel("Alias (Casa, Oficina)").fill("Sin mapa");
    await d.getByLabel("¿Quién recibe?").fill("Ana");
    await d.getByLabel("Teléfono de contacto").fill("996543210");
    await d.getByLabel("Dirección", { exact: true }).fill("Calle Sin Pin 1");
    await d.getByLabel("Provincia").selectOption("Pichincha");
    await d.getByLabel("Ciudad", { exact: true }).selectOption("Quito");
    await d.getByRole("button", { name: "Guardar dirección" }).click();
    await expect(page.locator("li", { hasText: "Calle Sin Pin 1" })).toBeVisible();
  });

  test("también está en el formulario de dirección del carrito", async ({ page }) => {
    await simularOsm(page);
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
    const mapa = page.getByRole("application", { name: /Mapa para ubicar tu dirección/ });
    await expect(mapa).toBeVisible();
    await mapa.click({ position: { x: 100, y: 80 } });
    await expect(page.getByText(/Ubicación marcada/)).toBeVisible();
  });
});

test.describe("Controles de la tienda", () => {
  test("los radio buttons de las direcciones tienen forma, tamaño y marca propios", async ({ page }) => {
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Ver carrito" }).click();
    const radios = page.locator('input[name="direccion"]');
    await expect(radios.first()).toBeVisible();
    const estilo = await radios.first().evaluate((e) => {
      const c = getComputedStyle(e);
      return { ancho: c.width, alto: c.height, radio: c.borderRadius, apariencia: c.appearance, fondo: c.backgroundImage };
    });
    expect(estilo.ancho).toBe("20px");
    expect(estilo.alto).toBe("20px");
    expect(parseFloat(estilo.radio)).toBeGreaterThan(8);
    expect(estilo.apariencia).toBe("none");
    expect(estilo.fondo).toContain("radial-gradient"); // la primera dirección viene marcada
    const sinMarcar = await radios.nth(1).evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(sinMarcar).toBe("none");
    // el círculo queda alineado con la primera línea del texto
    const r = await radios.first().boundingBox();
    const t = await page.locator('label:has(input[name="direccion"]) >> nth=0').locator("span.font-bold").first().boundingBox();
    expect(Math.abs(r!.y + r!.height / 2 - (t!.y + t!.height / 2))).toBeLessThan(8);
  });

  test("el contador del carrito se distingue del fondo de la cabecera", async ({ page }) => {
    await page.goto("/canjea");
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /Seguir|Cerrar/ }).first().click().catch(() => undefined);
    const insignia = page.locator("header span.rounded-full", { hasText: /^\s*\d+\s*$/ }).first();
    await expect(insignia).toBeVisible();
    const c = await insignia.evaluate((e) => {
      const s = getComputedStyle(e);
      return { fondo: s.backgroundColor, texto: s.color, cabecera: getComputedStyle(document.querySelector("header")!).backgroundColor };
    });
    expect(c.fondo).not.toBe(c.cabecera);
    expect(c.fondo).toBe("rgb(255, 255, 255)");
    expect(c.texto).not.toBe(c.fondo);
  });
});