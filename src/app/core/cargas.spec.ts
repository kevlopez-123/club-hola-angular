import { describe, expect, it } from "vitest";
import { convertirFecha, procesarMatriz, separarLista, type ColCarga } from "./carga-masiva";
import { claveMarca, COLUMNAS, filaDeEntidad, plantillaConDatos, plantillaDe, prepararCarga, resolverImagenes, type CtxCarga, type TipoCarga } from "./cargas";

const ctx = (extra: Partial<CtxCarga> = {}): CtxCarga => ({
  marcas: [{ id: "hp", nombre: "HP", web: "https://www.hp.com" }, { id: "pollo-gus", nombre: "Pollo Gus" }],
  categoriasProducto: [{ slug: "tecnologia", label: "Tecnología", subcategorias: [{ slug: "computadores", label: "Computadores" }] }],
  categoriasBeneficio: [{ slug: "restaurantes", label: "Restaurantes" }],
  provincias: ["Pichincha", "Guayas", "Azuay"],
  existentes: new Map(),
  imagenes: new Map(),
  hoyIso: "2026-11-09",
  ...extra,
});

const ENC_PROD = ["CÓDIGO *", "NOMBRE *", "MARCA *", "CATEGORÍA *", "SUBCATEGORÍA", "PUNTOS *", "PRECIO US$", "TIPO", "DESCRIPCIÓN", "CONSIDERACIONES", "ESPECIFICACIONES", "IMÁGENES", "ACTIVO"];

describe("conversión de celdas", () => {
  it("fechas: ISO, dd/mm/aaaa y número de serie de Excel; rechaza las imposibles", () => {
    expect(convertirFecha("2026-12-01")).toBe("2026-12-01");
    expect(convertirFecha("1/2/2027")).toBe("2027-02-01");
    expect(convertirFecha("45292")).toBe("2024-01-01");
    expect(convertirFecha("2026-02-30")).toBeNull();
    expect(convertirFecha("mañana")).toBeNull();
  });
  it("listas con punto y coma, barra o salto de línea", () => {
    expect(separarLista("a; b | c\nd;; ")).toEqual(["a", "b", "c", "d"]);
  });
  it("cada tipo valida y convierte", () => {
    const cols: ColCarga[] = [
      { clave: "n", titulo: "Num", tipo: "entero", min: 0, max: 10, ayuda: "", ejemplo: 1 },
      { clave: "d", titulo: "Dec", tipo: "decimal", min: 0, ayuda: "", ejemplo: 1 },
      { clave: "s", titulo: "Si", tipo: "sino", ayuda: "", ejemplo: "Sí" },
      { clave: "o", titulo: "Op", tipo: "opcion", opciones: ["Físico", "Digital"], ayuda: "", ejemplo: "Físico" },
      { clave: "u", titulo: "Url", tipo: "url", ayuda: "", ejemplo: "" },
      { clave: "c", titulo: "Cod", tipo: "codigo", limite: "codigo", ayuda: "", ejemplo: "" },
    ];
    const ok = procesarMatriz(cols, [["Num", "Dec", "Si", "Op", "Url", "Cod"], ["5.0", "12,5", "si", "digital", "https://a.com/x", "AB-1"]]).filas[0]!;
    expect(ok.error).toBeUndefined();
    expect(ok.valores).toEqual({ n: 5, d: 12.5, s: true, o: "Digital", u: "https://a.com/x", c: "AB-1" });
    const err = (fila: string[]) => procesarMatriz(cols, [["Num", "Dec", "Si", "Op", "Url", "Cod"], fila]).filas[0]!.error;
    expect(err(["11", "", "", "", "", ""])).toContain("mayor");
    expect(err(["1.5", "", "", "", "", ""])).toContain("entero");
    expect(err(["", "-1", "", "", "", ""])).toContain("menor");
    expect(err(["", "", "quizá", "", "", ""])).toContain("Sí o No");
    expect(err(["", "", "", "Raro", "", ""])).toContain("uno de");
    expect(err(["", "", "", "", "pagina", ""])).toContain("dirección");
    expect(err(["", "", "", "", "", "a b"])).toContain("sin espacios");
  });
});

describe("procesarMatriz", () => {
  const cols = COLUMNAS.ajustes;
  it("reconoce los encabezados de la plantilla (mayúsculas, tildes y asterisco) y salta filas vacías", () => {
    const r = procesarMatriz(cols, [["DOCUMENTO *", "PUNTOS *", "MOTIVO *"], ["1712345678", "500", "Premio"], [], ["", "", ""], ["0923456781", "-100", "Corrección"]], "documento");
    expect(r.filas.map((f) => f.fila)).toEqual([2, 5]);
    expect(r.filas[1]!.valores).toEqual({ documento: "0923456781", puntos: -100, motivo: "Corrección" });
  });
  it("avisa si faltan columnas obligatorias o el archivo está vacío", () => {
    expect(procesarMatriz(cols, [["DOCUMENTO", "PUNTOS"]]).errorGeneral).toContain("Motivo");
    expect(procesarMatriz(cols, []).errorGeneral).toContain("vacío");
  });
  it("una fila mala no frena a las demás y las repetidas se rechazan desde la segunda", () => {
    const r = procesarMatriz(cols, [["Documento", "Puntos", "Motivo"], ["1", "x", "a"], ["2", "5", "b"], ["2", "6", "c"]], "documento");
    expect(r.filas.map((f) => !!f.error)).toEqual([true, false, true]);
    expect(r.filas[2]!.error).toContain("fila 3");
  });
});

describe("carga de productos", () => {
  const prod = (...f: (string | number)[]) => [ENC_PROD, f.map(String)];
  it("crea un producto completo con categoría, subcategoría y marca resueltas por nombre", () => {
    const r = prepararCarga("productos", [ENC_PROD, ["LAP-001", "Laptop", "hp", "tecnologia", "Computadores", "25000", "850", "Físico", "Desc", "A; B", "C", "", "Sí"]], ctx());
    const f = r.filas[0]!;
    expect(f.error).toBeUndefined();
    expect(f.accion).toBe("crear");
    expect(f.entidad).toMatchObject({ id: "LAP-001", marca: "HP", marcaUrl: "https://www.hp.com", categoria: "tecnologia", categoriaLabel: "Tecnología", subcategoria: "computadores", puntos: 25000, precio: 850, digital: false, consideraciones: ["A", "B"], especificaciones: ["C"], activo: true });
    expect(r.resumen).toEqual({ crear: 1, actualizar: 0, errores: 0 });
  });
  it("al crear exige lo obligatorio; marca, categoría o subcategoría inexistentes se rechazan con el motivo", () => {
    const e = (f: string[]) => prepararCarga("productos", [ENC_PROD, f], ctx()).filas[0]!.error;
    expect(e(["X-1", "Solo nombre", "", "", "", "", "", "", "", "", "", "", ""])).toContain("Faltan datos obligatorios");
    expect(e(["X-1", "N", "Marca falsa", "Tecnología", "", "10", "", "", "", "", "", "", ""])).toContain("no existe");
    expect(e(["X-1", "N", "HP", "Inventada", "", "10", "", "", "", "", "", "", ""])).toContain("Categorías: Tecnología");
    expect(e(["X-1", "N", "HP", "Tecnología", "Otra", "10", "", "", "", "", "", "", ""])).toContain("no pertenece");
  });
  it("si el código existe se actualiza y las celdas vacías no cambian el dato", () => {
    const previo = { id: "LAP-001", nombre: "Viejo", marca: "HP", marcaUrl: "https://www.hp.com", categoria: "tecnologia", categoriaLabel: "Tecnología", subcategoria: "computadores", subcategoriaLabel: "Computadores", puntos: 100, precio: 5, descripcion: "Antes", activo: true, imagenes: ["x.png"], imagen: "x.png", galeria: ["x.png"] };
    const r = prepararCarga("productos", [ENC_PROD, ["LAP-001", "", "", "", "", "200", "", "", "", "", "", "", "No"]], ctx({ existentes: new Map([["LAP-001", previo]]) }));
    expect(r.filas[0]!.accion).toBe("actualizar");
    expect(r.filas[0]!.entidad).toMatchObject({ nombre: "Viejo", puntos: 200, descripcion: "Antes", activo: false, imagenes: ["x.png"], categoriaLabel: "Tecnología" });
  });
  it("enlaza las imágenes por nombre de archivo (con o sin extensión) y rechaza las que no se subieron", () => {
    const imagenes = new Map([["laptop-1.jpg", "data:image/jpeg;base64,AAA"], ["laptop-2.png", "data:image/png;base64,BBB"]]);
    const ok = prepararCarga("productos", [ENC_PROD, ["LAP-001", "L", "HP", "Tecnología", "", "1", "", "", "", "", "", "Laptop-1.JPG; laptop-2; https://x.com/f.jpg", ""]], ctx({ imagenes })).filas[0]!;
    expect(ok.error).toBeUndefined();
    expect(ok.entidad.imagenes).toEqual(["data:image/jpeg;base64,AAA", "data:image/png;base64,BBB", "https://x.com/f.jpg"]);
    expect(ok.entidad.imagen).toBe("data:image/jpeg;base64,AAA");
    expect(ok.imagenesUsadas).toEqual(["Laptop-1.JPG", "laptop-2"]);
    const mal = prepararCarga("productos", [ENC_PROD, ["LAP-002", "L", "HP", "Tecnología", "", "1", "", "", "", "", "", "falta.jpg", ""]], ctx({ imagenes })).filas[0]!;
    expect(mal.error).toContain("falta.jpg");
    expect(resolverImagenes(["a.png"], new Map()).faltan).toEqual(["a.png"]);
  });
  it("respeta los límites de caracteres", () => {
    const largo = "x".repeat(81);
    expect(prepararCarga("productos", [ENC_PROD, ["X-1", largo, "HP", "Tecnología", "", "1", "", "", "", "", "", "", ""]], ctx()).filas[0]!.error).toContain("80 caracteres");
  });
  void prod;
});

describe("carga de beneficios", () => {
  const ENC = COLUMNAS.beneficios.map((c) => c.titulo);
  const fila = (o: Record<string, string | number>) => ENC.map((t) => String(o[t] ?? ""));
  const base = { "Código": "CAFE-1", "Nombre": "2x1", "Comercio": "Pollo Gus", "Categoría": "Restaurantes", "Descuento": "2x1" };
  it("crea un beneficio con vigencia, regla del cupón, provincias (sin tildes) y código compartido", () => {
    const r = prepararCarga("beneficios", [ENC, fila({ ...base, "Desde": "01/12/2026", "Hasta": "2027-03-31", "Provincias": "pichincha; GUAYAS", "Duración (horas)": 24, "Límite de canjes": 1, "Espera (meses)": 3, "Código compartido": "verano26", "Usos máximos": 100 })], ctx());
    const f = r.filas[0]!;
    expect(f.error).toBeUndefined();
    expect(f.entidad).toMatchObject({ id: "CAFE-1", tipo: "cupon", categoriaSlug: "restaurantes", desde: "2026-12-01", hasta: "2027-03-31", provincias: ["Pichincha", "Guayas"], cupon: { horas: 24, limite: 1, meses: 3 }, modoCodigo: "compartido", codigoCompartido: "VERANO26", usosMaximos: 100 });
  });
  it("«Todo el país» deja la lista vacía y una provincia inexistente se rechaza", () => {
    expect(prepararCarga("beneficios", [ENC, fila({ ...base, "Provincias": "Todo el país" })], ctx()).filas[0]!.entidad.provincias).toEqual([]);
    expect(prepararCarga("beneficios", [ENC, fila({ ...base, "Provincias": "Narnia" })], ctx()).filas[0]!.error).toContain("Narnia");
  });
  it("valida las reglas: vencimiento anterior al inicio y espera fuera de rango", () => {
    expect(prepararCarga("beneficios", [ENC, fila({ ...base, "Desde": "2027-01-10", "Hasta": "2027-01-01" })], ctx()).filas[0]!.error).toContain("anterior");
    expect(prepararCarga("beneficios", [ENC, fila({ ...base, "Espera (meses)": 99 })], ctx()).filas[0]!.error).toContain("60");
  });
  it("modalidad Compra y solo dinero", () => {
    const e = prepararCarga("beneficios", [ENC, fila({ ...base, "Modalidad": "compra", "Solo dinero": "Sí", "Precio US$": 12 })], ctx()).filas[0]!.entidad;
    expect(e).toMatchObject({ tipo: "compra", soloDinero: true, precio: 12 });
  });
});

describe("carga de marcas y ajustes", () => {
  it("marcas: la clave es el nombre sin tildes ni mayúsculas (actualiza si existe)", () => {
    const ENC = COLUMNAS.marcas.map((c) => c.titulo);
    const existentes = new Map([["pollo-gus", { id: "pollo-gus", nombre: "Pollo Gus", logo: "", web: "", descripcion: "Antes", activo: true }]]);
    const r = prepararCarga("marcas", [ENC, ["Pollo Gus", "https://www.pollogus.com", "", "", ""], ["Café Nuevo", "", "Cafés", "", "No"]], ctx({ existentes }));
    expect(r.filas[0]!.accion).toBe("actualizar");
    expect(r.filas[0]!.entidad).toMatchObject({ id: "pollo-gus", web: "https://www.pollogus.com", descripcion: "Antes" });
    expect(r.filas[1]!.accion).toBe("crear");
    expect(r.filas[1]!.entidad).toMatchObject({ id: "cafe-nuevo", nombre: "Café Nuevo", activo: false });
    expect(claveMarca("Café Nuevo")).toBe("cafe-nuevo");
  });
  it("marcas: logo por nombre de archivo subido", () => {
    const ENC = COLUMNAS.marcas.map((c) => c.titulo);
    const r = prepararCarga("marcas", [ENC, ["Nueva", "", "", "logo.png", ""]], ctx({ imagenes: new Map([["logo.png", "data:image/png;base64,ZZZ"]]) }));
    expect(r.filas[0]!.entidad.logo).toBe("data:image/png;base64,ZZZ");
  });
  it("ajustes: valida formato; el punto 0 y los repetidos se rechazan", () => {
    const r = prepararCarga("ajustes", [["Documento", "Puntos", "Motivo"], ["1712345678", "500", "Premio"], ["1712345678", "5", "x"], ["0923456781", "0", "Nada"], ["0911111111", "abc", "Mal"]], ctx());
    expect(r.filas.map((f) => !!f.error)).toEqual([false, true, true, true]);
    expect(r.filas[2]!.error).toContain("0");
  });
  it("las plantillas se generan para los cuatro tipos con una hoja de datos y ejemplo", () => {
    for (const t of ["productos", "beneficios", "marcas", "ajustes"] as const) {
      const p = plantillaDe(t);
      expect(p.columnas.length).toBe(COLUMNAS[t].length);
      expect(p.ejemplos?.[0]?.length).toBe(COLUMNAS[t].length);
    }
  });
});

describe("exportar el catálogo para editarlo y volver a subirlo", () => {
  const titulos = (t: TipoCarga) => COLUMNAS[t].map((c) => c.titulo);
  const ida = (t: TipoCarga, entidad: any, key: string) => {
    const fila = filaDeEntidad(t, entidad).map(String);
    const r = prepararCarga(t, [titulos(t), fila], ctx({ existentes: new Map([[key, entidad]]) }));
    return r.filas[0]!;
  };
  it("producto: lo exportado se vuelve a leer sin cambiar nada (salvo imágenes subidas, que no se exportan)", () => {
    const p = { id: "LAP-1", nombre: "Laptop", marca: "HP", marcaUrl: "https://www.hp.com", categoria: "tecnologia", categoriaLabel: "Tecnología", subcategoria: "computadores", subcategoriaLabel: "Computadores", puntos: 25000, precio: 850, digital: false, descripcion: "D", consideraciones: ["A", "B; C"], especificaciones: ["E"], activo: false, imagen: "data:image/png;base64,AAA", imagenes: ["data:image/png;base64,AAA", "https://x.com/f.jpg"], galeria: [] };
    const f = ida("productos", p, "LAP-1");
    expect(f.error).toBeUndefined();
    expect(f.accion).toBe("actualizar");
    expect(f.entidad).toMatchObject({ nombre: "Laptop", puntos: 25000, precio: 850, activo: false, consideraciones: ["A", "B, C"], especificaciones: ["E"] });
    expect(filaDeEntidad("productos", p)[11]).toBe("https://x.com/f.jpg"); // la imagen subida (data:) no cabe en Excel
  });
  it("beneficio: vigencia, provincias, regla del cupón y código compartido hacen el viaje de ida y vuelta", () => {
    const b = { id: "B-1", marca: "Pollo Gus", marcaUrl: "", nombre: "2x1", descuento: "2x1", categoria: "Restaurantes", categoriaSlug: "restaurantes", tipo: "cupon", descripcion: "", pasos: ["Uno", "Dos"], terminos: "T", desde: "2026-12-01", hasta: "2027-03-31", provincias: ["Pichincha", "Guayas"], cupon: { horas: 24, limite: 1, meses: 3 }, modoCodigo: "compartido", codigoCompartido: "VERANO26", usosMaximos: 50, activo: true };
    const f = ida("beneficios", b, "B-1");
    expect(f.error).toBeUndefined();
    expect(f.entidad).toMatchObject({ desde: "2026-12-01", hasta: "2027-03-31", provincias: ["Pichincha", "Guayas"], cupon: { horas: 24, limite: 1, meses: 3 }, modoCodigo: "compartido", codigoCompartido: "VERANO26", usosMaximos: 50, pasos: ["Uno", "Dos"] });
  });
  it("marca: ida y vuelta por nombre", () => {
    const m = { id: "pollo-gus", nombre: "Pollo Gus", web: "https://www.pollogus.com", descripcion: "Asado", logo: "https://x.com/l.png", activo: true };
    const f = ida("marcas", m, "pollo-gus");
    expect(f.error).toBeUndefined();
    expect(f.entidad).toMatchObject({ id: "pollo-gus", web: "https://www.pollogus.com", logo: "https://x.com/l.png" });
  });
  it("la plantilla con datos trae los registros llenos en Datos y filas con formato para agregar más", () => {
    const p = plantillaConDatos("marcas", [{ id: "a", nombre: "A", web: "", descripcion: "", logo: "", activo: true }, { id: "b", nombre: "B", web: "https://b.com", descripcion: "", logo: "", activo: false }]);
    expect(p.titulo).toContain("Catálogo actual");
    expect(p.descripcion).toContain("Trae 2 registros");
    expect(p.filas).toHaveLength(2);
    expect(p.filas![1]).toEqual(["B", "https://b.com", "", "", "No"]);
  });
});