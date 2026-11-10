import { expect, test, type Page } from "@playwright/test";
import { pngValido, xlsxDeExcel, zipDe } from "./archivos";
import { entrarAdmin, esperarCarga, textoDeArchivo } from "./helpers";

const K = "bancosolidario_mockdb_v11";
const PNG = pngValido();
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Datos de la base simulada que las filas de prueba necesitan (una marca, categorías y participantes que existen). */
async function datos(page: Page) {
  return page.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k)!);
    const p1 = d.admin.participantes.find((p: any) => p.id === "p1");
    const otro = d.admin.participantes.find((p: any) => p.id !== "p1" && p.cedula);
    return {
      marca: d.admin.marcas[0].nombre as string,
      catProducto: d.admin.categoriasProducto.find((c: any) => c.activo).label as string,
      catBeneficio: d.admin.categoriasBeneficio.find((c: any) => c.activo).label as string,
      p1: { cedula: p1.cedula as string, puntos: p1.puntos as number },
      otro: { cedula: otro.cedula as string, puntos: otro.puntos as number },
    };
  }, K);
}
const leerDb = (page: Page, ruta: string) => page.evaluate(([k, r]) => { let v: any = JSON.parse(localStorage.getItem(k!)!); for (const p of r!.split(".")) v = v?.[p]; return v; }, [K, ruta]);

const ENC_PRODUCTOS = ["CÓDIGO *", "NOMBRE *", "MARCA *", "CATEGORÍA *", "SUBCATEGORÍA", "PUNTOS *", "PRECIO US$", "TIPO", "DESCRIPCIÓN", "CONSIDERACIONES", "ESPECIFICACIONES", "IMÁGENES", "ACTIVO"];
const ENC_BENEFICIOS = ["CÓDIGO *", "NOMBRE *", "COMERCIO *", "CATEGORÍA *", "DESCUENTO *", "MODALIDAD", "PUNTOS", "PRECIO US$", "SOLO DINERO", "DESCRIPCIÓN", "PASOS", "TÉRMINOS", "DESDE", "HASTA", "PROVINCIAS", "CÓDIGO COMPARTIDO", "USOS MÁXIMOS", "DURACIÓN (HORAS)", "LÍMITE DE CANJES", "ESPERA (MESES)", "IMÁGENES", "ACTIVO"];
const ENC_MARCAS = ["NOMBRE *", "SITIO WEB", "DESCRIPCIÓN", "LOGO", "ACTIVO"];
const ENC_AJUSTES = ["DOCUMENTO *", "PUNTOS *", "MOTIVO *"];
const fila = (n: number, o: Record<number, string>) => Array.from({ length: n }, (_, i) => o[i] ?? "");
const subir = (page: Page, nombre: string, buffer: Buffer) => page.getByRole("dialog").getByLabel("Subir archivo de la carga").setInputFiles({ name: nombre, mimeType: XLSX, buffer });

test.describe("Fase D: cargas masivas", () => {
  test.beforeEach(async ({ page }) => {
    await entrarAdmin(page);
  });

  test("productos: plantilla, imágenes en un ZIP, revisión fila por fila, carga y actualización", async ({ page }) => {
    const d = await datos(page);
    await page.goto("/admin/productos");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const m = page.getByRole("dialog", { name: "Carga masiva de productos" });

    const [pl] = await Promise.all([page.waitForEvent("download"), m.getByRole("button", { name: "Descargar plantilla" }).click()]);
    expect(pl.suggestedFilename()).toBe("plantilla_productos.xlsx");
    const x = await textoDeArchivo(pl);
    for (const t of ["Instrucciones", "Datos", "Ejemplo", "CÓDIGO *", "IMÁGENES", "se actualiza ese registro"]) expect(x, t).toContain(t);

    // Imágenes: un ZIP con dos imágenes, un archivo que no lo es y la carpeta de Mac (se ignora).
    const zip = zipDe([{ nombre: "fotos/Lap-1.PNG", datos: PNG }, { nombre: "fotos/lap-2.png", datos: PNG }, { nombre: "fotos/notas.txt", datos: Buffer.from("hola") }, { nombre: "__MACOSX/._lap-1.png", datos: Buffer.from("x") }]);
    await m.getByLabel("Subir imágenes").setInputFiles({ name: "fotos.zip", mimeType: "application/zip", buffer: zip });
    await expect(m.getByText("2 imágenes listas")).toBeVisible();
    await expect(m.getByLabel("Imágenes omitidas")).toContainText("notas.txt");
    await expect(m.getByLabel("Imágenes omitidas")).not.toContainText("macosx");

    const nuevo = fila(13, { 0: "TEST-LAP-1", 1: "Laptop de prueba", 2: d.marca, 3: d.catProducto, 5: "1500", 6: "99.5", 7: "digital", 9: "A; B", 11: "lap-1.png; LAP-2", 12: "Sí" });
    const sinMarca = fila(13, { 0: "TEST-LAP-2", 1: "Con marca falsa", 2: "Marca que no existe", 3: d.catProducto, 5: "10" });
    const sinImagen = fila(13, { 0: "TEST-LAP-3", 1: "Sin foto", 2: d.marca, 3: d.catProducto, 5: "10", 11: "no-esta.jpg" });
    await subir(page, "productos.xlsx", xlsxDeExcel([ENC_PRODUCTOS, nuevo, sinMarca, sinImagen]));
    await expect(m.getByText("1 por crear")).toBeVisible();
    await expect(m.getByText("2 con errores")).toBeVisible();
    await expect(m.getByRole("row", { name: /TEST-LAP-2/ })).toContainText("no existe");
    await expect(m.getByRole("row", { name: /TEST-LAP-3/ })).toContainText("no-esta.jpg");
    await expect(m.getByRole("row", { name: /TEST-LAP-1/ })).toContainText("Se crea");

    const [err] = await Promise.all([page.waitForEvent("download"), m.getByRole("button", { name: "Descargar reporte de errores" }).click()]);
    expect(err.suggestedFilename()).toBe("errores_productos.xlsx");
    expect(await textoDeArchivo(err)).toContain("Marca que no existe");

    await m.getByRole("button", { name: "Cargar 1 fila" }).click();
    await expect(m.getByText("1 creados · 0 actualizados · 2 filas omitidas")).toBeVisible();
    const p = await leerDb(page, "admin.productos").then((l: any[]) => l.find((x) => x.id === "TEST-LAP-1"));
    expect(p).toMatchObject({ nombre: "Laptop de prueba", puntos: 1500, precio: 99.5, digital: true, consideraciones: ["A", "B"], activo: true, categoriaLabel: d.catProducto });
    expect(p.imagenes).toHaveLength(2);
    expect(p.imagenes[0]).toMatch(/^data:image\/(webp|jpeg)/);
    expect(p.imagen).toBe(p.imagenes[0]);
    expect(await leerDb(page, "admin.importaciones").then((l: any[]) => l[0])).toMatchObject({ tipo: "Productos", archivo: "productos.xlsx", importadas: 1 });
    await m.getByRole("button", { name: "Cerrar" }).last().click();

    // Segunda carga: mismo código → se actualiza; las celdas vacías no cambian el dato.
    await page.getByRole("button", { name: "Carga masiva" }).click();
    await subir(page, "productos2.xlsx", xlsxDeExcel([ENC_PRODUCTOS, fila(13, { 0: "TEST-LAP-1", 5: "2000" })]));
    await expect(page.getByRole("row", { name: /TEST-LAP-1/ })).toContainText("Se actualiza");
    await page.getByRole("dialog").getByRole("button", { name: "Cargar 1 fila" }).click();
    await expect(page.getByText("0 creados · 1 actualizados")).toBeVisible();
    expect(await leerDb(page, "admin.productos").then((l: any[]) => l.find((x) => x.id === "TEST-LAP-1"))).toMatchObject({ nombre: "Laptop de prueba", puntos: 2000, precio: 99.5 });
    // Y el catálogo del sitio ya lo muestra con su imagen.
    await page.goto("/canjea/TEST-LAP-1");
    await expect(page.getByRole("heading", { name: "Laptop de prueba" })).toBeVisible();
    await expect(page.locator("article img").first()).toHaveAttribute("src", /^data:image/);
  });

  test("archivos que no sirven: sin columnas obligatorias, vacío, repetidos y más de 2.000 filas", async ({ page }) => {
    await page.goto("/admin/productos");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const m = page.getByRole("dialog");
    await subir(page, "malo.xlsx", xlsxDeExcel([["CÓDIGO *", "NOMBRE *"], ["A-1", "Algo"]]));
    await expect(m.getByRole("alert")).toContainText("Faltan columnas en el archivo");
    await subir(page, "vacio.xlsx", xlsxDeExcel([ENC_PRODUCTOS]));
    await expect(m.getByRole("alert")).toContainText("no tiene filas con datos");
    const d = await datos(page);
    const dup = fila(13, { 0: "DUP-1", 1: "Uno", 2: d.marca, 3: d.catProducto, 5: "1" });
    const dup2 = fila(13, { 0: "DUP-1", 1: "Dos", 2: d.marca, 3: d.catProducto, 5: "1" });
    await subir(page, "dup.xlsx", xlsxDeExcel([ENC_PRODUCTOS, dup, dup2]));
    await expect(m.getByRole("row", { name: /^2 DUP-1/ })).toBeVisible();
    await expect(m.getByText(/ya aparece en la fila 2/)).toBeVisible();
    await m.getByRole("button", { name: "Cambiar archivo" }).click();
    const muchas = Array.from({ length: 2001 }, (_, i) => fila(13, { 0: `M-${i}`, 1: "x", 2: d.marca, 3: d.catProducto, 5: "1" }));
    await subir(page, "muchas.xlsx", xlsxDeExcel([ENC_PRODUCTOS, ...muchas]));
    await expect(m.getByRole("alert")).toContainText("máximo por carga es 2.000");
  });

  test("beneficios: vigencia, provincias, regla del cupón y código compartido llegan al registro", async ({ page }) => {
    const d = await datos(page);
    await page.goto("/admin/beneficios");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const m = page.getByRole("dialog", { name: "Carga masiva de beneficios" });
    const bien = fila(22, { 0: "TEST-BEN-1", 1: "2x1 de prueba", 2: d.marca, 3: d.catBeneficio, 4: "2x1", 12: "01/12/2026", 13: "2027-03-31", 14: "pichincha; Guayas", 15: "verano26", 16: "50", 17: "24", 18: "1", 19: "3", 21: "Sí" });
    const mal = fila(22, { 0: "TEST-BEN-2", 1: "Fechas al revés", 2: d.marca, 3: d.catBeneficio, 4: "10%", 12: "2027-02-01", 13: "2027-01-01" });
    const provMala = fila(22, { 0: "TEST-BEN-3", 1: "Provincia falsa", 2: d.marca, 3: d.catBeneficio, 4: "5%", 14: "Narnia" });
    await subir(page, "beneficios.xlsx", xlsxDeExcel([ENC_BENEFICIOS, bien, mal, provMala]));
    await expect(m.getByText("1 por crear")).toBeVisible();
    await expect(m.getByRole("row", { name: /TEST-BEN-2/ })).toContainText("anterior");
    await expect(m.getByRole("row", { name: /TEST-BEN-3/ })).toContainText("Narnia");
    await m.getByRole("button", { name: "Cargar 1 fila" }).click();
    await expect(m.getByText("1 creados · 0 actualizados · 2 filas omitidas")).toBeVisible();
    const b = await leerDb(page, "admin.beneficios").then((l: any[]) => l.find((x) => x.id === "TEST-BEN-1"));
    expect(b).toMatchObject({ desde: "2026-12-01", hasta: "2027-03-31", provincias: ["Pichincha", "Guayas"], cupon: { horas: 24, limite: 1, meses: 3 }, modoCodigo: "compartido", codigoCompartido: "VERANO26", usosMaximos: 50, tipo: "cupon" });
    // Ya aparece en la lista del panel con su vigencia.
    await m.getByRole("button", { name: "Cerrar" }).last().click();
    await page.getByPlaceholder("Buscar beneficio o comercio").fill("2x1 de prueba");
    await expect(page.locator("tbody tr").first()).toContainText("Programado"); // empieza el 01/12/2026
  });

  test("marcas: crea con logo del ZIP y actualiza por nombre", async ({ page }) => {
    await page.goto("/admin/marcas");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const m = page.getByRole("dialog", { name: "Carga masiva de marcas" });
    await m.getByLabel("Subir imágenes").setInputFiles({ name: "logos.png", mimeType: "image/png", buffer: PNG });
    await expect(m.getByText("1 imagen lista")).toBeVisible();
    await subir(page, "marcas.xlsx", xlsxDeExcel([ENC_MARCAS, ["Marca de Prueba", "https://www.prueba.com", "Una marca", "logos.png", "Sí"], ["Sin Web Valida", "pagina", "", "", ""]]));
    await expect(m.getByText("1 por crear")).toBeVisible();
    await expect(m.getByRole("row", { name: /Sin Web Valida/ })).toContainText("dirección completa");
    await m.getByRole("button", { name: "Cargar 1 fila" }).click();
    await expect(m.getByText("1 creados")).toBeVisible();
    const marca = await leerDb(page, "admin.marcas").then((l: any[]) => l.find((x) => x.nombre === "Marca de Prueba"));
    expect(marca).toMatchObject({ id: "marca-de-prueba", web: "https://www.prueba.com", activo: true });
    expect(marca.logo).toMatch(/^data:image/);
    await m.getByRole("button", { name: "Cerrar" }).last().click();
    // Segunda vez: se actualiza (misma marca, otra descripción) y no se duplica.
    await page.getByRole("button", { name: "Carga masiva" }).click();
    await subir(page, "marcas2.xlsx", xlsxDeExcel([ENC_MARCAS, ["marca de prueba", "", "Descripción nueva", "", ""]]));
    await expect(page.getByRole("row", { name: /marca de prueba/ })).toContainText("Se actualiza");
    await page.getByRole("dialog").getByRole("button", { name: "Cargar 1 fila" }).click();
    await expect(page.getByText("0 creados · 1 actualizados")).toBeVisible();
    const todas = await leerDb(page, "admin.marcas").then((l: any[]) => l.filter((x) => x.nombre === "Marca de Prueba"));
    expect(todas).toHaveLength(1);
    expect(todas[0].descripcion).toBe("Descripción nueva");
  });

  test("ajuste masivo de puntos: simula con totales, rechaza lo imposible y aplica solo lo válido", async ({ page }) => {
    const d = await datos(page);
    await page.goto("/admin/participantes");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Ajuste masivo de puntos" }).click();
    const m = page.getByRole("dialog", { name: "Ajuste masivo de puntos" });
    const filas = [
      ENC_AJUSTES,
      [d.p1.cedula, "500", "Premio de prueba"],
      [d.otro.cedula, String(-(d.otro.puntos + 1)), "Dejaría saldo negativo"],
      ["0000000001", "10", "Documento inexistente"],
      [d.p1.cedula, "5", "Repetido"],
      ["1700000000", "0", "Cero"],
    ];
    await subir(page, "ajustes.xlsx", xlsxDeExcel(filas));
    await expect(m.getByText("1 válidas")).toBeVisible();
    await expect(m.getByText("4 con errores")).toBeVisible();
    await expect(m.getByText("+500", { exact: true }).first()).toBeVisible(); // se suman
    await expect(m.getByRole("row", { name: new RegExp(`2 ${d.p1.cedula}`) })).toContainText(`Saldo ${d.p1.puntos.toLocaleString("es")} → ${(d.p1.puntos + 500).toLocaleString("es")}`);
    await expect(m.getByRole("row", { name: /3 / }).first()).toContainText("negativo");
    await expect(m.getByText(/No hay un participante con el documento 0000000001/)).toBeVisible();
    await expect(m.getByText(/ya aparece en la fila 2/)).toBeVisible();
    // Simular no cambia nada.
    expect(await leerDb(page, "admin.participantes").then((l: any[]) => l.find((p) => p.id === "p1").puntos)).toBe(d.p1.puntos);

    await m.getByRole("button", { name: "Aplicar 1 ajuste" }).click();
    await expect(m.getByText("1 ajuste aplicado")).toBeVisible();
    const p1 = await leerDb(page, "admin.participantes").then((l: any[]) => l.find((p) => p.id === "p1"));
    expect(p1.puntos).toBe(d.p1.puntos + 500);
    expect(p1.ajustes[0]).toMatchObject({ puntos: 500, motivo: "Premio de prueba", usuario: "Mariela Castro" });
    expect(await leerDb(page, "usuario.puntos")).toBe(d.p1.puntos + 500); // la participante demo comparte saldo con su sesión
    expect(await leerDb(page, "admin.participantes").then((l: any[]) => l.find((p) => p.cedula === d.otro.cedula).puntos)).toBe(d.otro.puntos); // el rechazado no cambió
    expect(await leerDb(page, "admin.importaciones").then((l: any[]) => l[0])).toMatchObject({ tipo: "Ajuste de puntos", importadas: 1 });
    const auditoria = await leerDb(page, "admin.auditoria").then((l: any[]) => l.map((a) => a.accion));
    expect(auditoria.some((a: string) => /ajuste masivo de puntos/i.test(a))).toBe(true);
  });

  test("participantes y códigos usan el mismo recorrido: duplicados rechazados y todo en Importaciones", async ({ page }) => {
    await page.goto("/admin/participantes");
    await esperarCarga(page);
    const antes = await leerDb(page, "admin.participantes").then((l: any[]) => l.length);
    await page.getByRole("button", { name: "Carga masiva", exact: true }).click();
    const m = page.getByRole("dialog", { name: "Carga masiva de participantes" });
    const [pl] = await Promise.all([page.waitForEvent("download"), m.getByRole("button", { name: "Descargar plantilla" }).click()]);
    expect(pl.suggestedFilename()).toBe("plantilla_participantes.xlsx");
    const filas = [
      ["DOCUMENTO *", "NOMBRE *", "CORREO *", "PUNTOS *"],
      ["1790000011", "Nueva Persona", "nueva.persona@correo.com", "100"],
      ["1790000012", "Otro Nuevo", "otro.nuevo@correo.com", "200"],
    ];
    await subir(page, "participantes.xlsx", xlsxDeExcel(filas));
    await expect(m.getByText("2 por crear")).toBeVisible();
    await m.getByRole("button", { name: "Importar 2 participantes" }).click();
    await expect(m.getByText(/2 participantes agregados/)).toBeVisible();
    expect(await leerDb(page, "admin.participantes").then((l: any[]) => l.length)).toBe(antes + 2);
    await m.getByRole("button", { name: "Cerrar" }).last().click();

    // Quien ya existe (mismo documento) se rechaza en el servidor y se avisa.
    await page.getByRole("button", { name: "Carga masiva", exact: true }).click();
    await subir(page, "repetido.xlsx", xlsxDeExcel([filas[0]!, ["1790000011", "Nueva Persona", "nueva.persona@correo.com", "100"], ["1790000013", "Tercera", "tercera@correo.com", "5"]]));
    await page.getByRole("dialog").getByRole("button", { name: "Importar 2 participantes" }).click();
    await expect(page.getByText(/1 participantes agregados.*1 ya existían/)).toBeVisible();
    expect(await leerDb(page, "admin.participantes").then((l: any[]) => l.length)).toBe(antes + 3);
  });

  test("exportar lo que hay: el catálogo sale en el formato de carga y se puede volver a subir sin errores", async ({ page }) => {
    await page.goto("/admin/marcas");
    await esperarCarga(page);
    await page.getByRole("button", { name: "Carga masiva" }).click();
    const m = page.getByRole("dialog", { name: "Carga masiva de marcas" });
    const [exp] = await Promise.all([page.waitForEvent("download"), m.getByRole("button", { name: "Descargar lo que hay para editarlo" }).click()]);
    expect(exp.suggestedFilename()).toBe("catalogo_marcas.xlsx");
    const x = await textoDeArchivo(exp);
    expect(x).toContain("Catálogo actual de marcas");
    const nombres: string[] = await leerDb(page, "admin.marcas").then((l: any[]) => l.map((r) => r.nombre));
    for (const n of nombres) expect(x, n).toContain(n.replace(/&/g, "&amp;"));
    // Subir el mismo archivo: todas las filas existen y se actualizan, sin errores.
    const ruta = test.info().outputPath("catalogo_marcas.xlsx");
    await exp.saveAs(ruta);
    await m.getByLabel("Subir archivo de la carga").setInputFiles(ruta);
    await expect(m.getByText(`${nombres.length} por actualizar`)).toBeVisible();
    await expect(m.getByText("0 con errores")).toBeVisible();
  });
});
