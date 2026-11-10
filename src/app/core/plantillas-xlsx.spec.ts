import { describe, expect, it } from "vitest";
import { hojaErrores, hojasPlantilla, type PlantillaDef } from "./plantillas-xlsx";
import { archivosXlsx } from "./xlsx";

const def: PlantillaDef = {
  titulo: "Carga de productos",
  descripcion: "Crea o actualiza productos del catálogo.",
  columnas: [
    { clave: "sku", titulo: "SKU", obligatoria: true, texto: true, ayuda: "Código único.", ejemplo: "LAP-001" },
    { clave: "nombre", titulo: "Nombre", obligatoria: true, ayuda: "Máximo 80 caracteres.", ejemplo: "Laptop" },
    { clave: "tipo", titulo: "Tipo", ayuda: "Físico o digital.", ejemplo: "Físico", opciones: ["Físico", "Digital"] },
    { clave: "puntos", titulo: "Puntos", ayuda: "Entero.", ejemplo: 25000 },
  ],
  ejemplos: [["LAP-002", "Mouse", "Digital", 900]],
  notas: ["Los repetidos se actualizan."],
};

describe("plantillas de carga en Excel", () => {
  const hojas = hojasPlantilla(def);

  it("trae Instrucciones, Datos y Ejemplo, en ese orden", () => {
    expect(hojas.map((h) => h.nombre)).toEqual(["Instrucciones", "Datos", "Ejemplo"]);
  });

  it("la hoja Datos marca con * lo obligatorio, tiene lista desplegable y filas listas", () => {
    const datos = hojas[1]!;
    expect(datos.encabezado).toBe(0);
    expect((datos.filas[0] as { v: string }[]).map((c) => c.v)).toEqual(["SKU *", "NOMBRE *", "TIPO", "PUNTOS"]);
    expect(datos.listas).toEqual([{ columna: 2, desde: 2, hasta: 301, opciones: ["Físico", "Digital"] }]);
    expect(datos.filas.length).toBe(301);
  });

  it("las instrucciones describen cada columna y combinan los textos largos con alto fijo", () => {
    const ins = hojas[0]!;
    const texto = JSON.stringify(ins.filas);
    for (const t of ["Carga de productos", "CÓMO LLENARLA", "COLUMNA", "Máximo 80 caracteres.", "Valores: Físico, Digital.", "TEN EN CUENTA", "Los repetidos se actualizan."]) expect(texto, t).toContain(t);
    expect(ins.combinar).toContain("A1:D1");
    expect(Object.keys(ins.altos ?? {}).length).toBeGreaterThan(3);
  });

  it("el libro completo es XML bien formado con el color de la marca", () => {
    const a = archivosXlsx(hojas, "#e11d48");
    for (const [nombre, xml] of Object.entries(a)) {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      expect(doc.getElementsByTagName("parsererror").length, nombre).toBe(0);
    }
    expect(a["xl/styles.xml"]).toContain("FFE11D48");
  });

  it("el reporte de errores trae fila, motivo y los datos tal como venían", () => {
    const h = hojaErrores(["documento", "correo"], [{ fila: 3, motivo: "Correo inválido", datos: ["171", "x"] }]);
    expect(h.filas[0]).toEqual(["FILA", "MOTIVO", "DOCUMENTO", "CORREO"]);
    expect(h.filas[1]).toEqual([3, "Correo inválido", "171", "x"]);
  });
});