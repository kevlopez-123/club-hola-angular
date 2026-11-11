import { describe, expect, it } from "vitest";
import { PERMISOS, SECCIONES, esRolSistema, normalizarMatriz, puede, puedeApi, registrarRoles, requisitoApi, rolExiste, seccionDeRuta } from "./permisos";

describe("permisos por sección y acción", () => {
  it("el administrador puede todo en todas las secciones", () => {
    for (const s of SECCIONES) for (const a of ["ver", "editar", "eliminar", "exportar"] as const) expect(puede("Administrador", s.id, a), `${s.id}:${a}`).toBe(true);
  });

  it("solo lectura consulta dashboard y reportes y no puede editar nada", () => {
    expect(puede("Solo lectura", "reportes", "ver")).toBe(true);
    expect(puede("Solo lectura", "reportes", "exportar")).toBe(true);
    for (const s of SECCIONES) {
      expect(puede("Solo lectura", s.id, "editar"), s.id).toBe(false);
      expect(puede("Solo lectura", s.id, "eliminar"), s.id).toBe(false);
    }
    expect(puede("Solo lectura", "pedidos", "ver")).toBe(false);
  });

  it("solo el administrador gestiona usuarios, roles, niveles, configuración y auditoría", () => {
    for (const s of ["usuarios", "roles", "niveles", "configuracion", "auditoria"] as const) {
      for (const rol of ["Catálogo", "Operaciones", "Atención", "Solo lectura"] as const) expect(puede(rol, s, "ver"), `${rol}:${s}`).toBe(false);
    }
  });

  it("solo catálogo y administración eliminan; operaciones y atención no", () => {
    for (const rol of ["Operaciones", "Atención", "Solo lectura"] as const) {
      for (const s of SECCIONES) expect(puede(rol, s.id, "eliminar"), `${rol}:${s.id}`).toBe(false);
    }
    expect(puede("Catálogo", "beneficios", "eliminar")).toBe(true);
  });

  it("cada acción de edición, eliminación o exportación exige también poder ver", () => {
    for (const [rol, mapa] of Object.entries(PERMISOS)) {
      for (const [s, acciones] of Object.entries(mapa)) if (acciones!.length) expect(acciones, `${rol}:${s}`).toContain("ver");
    }
  });

  it("ruta → sección", () => {
    expect(seccionDeRuta("/admin")).toBe("dashboard");
    expect(seccionDeRuta("/admin/pedidos?x=1")).toBe("pedidos");
    expect(seccionDeRuta("/admin/participantes/p1")).toBe("participantes");
    expect(seccionDeRuta("/admin/inexistente")).toBeNull();
  });

  it("API: la acción sale del método HTTP y la sección de la ruta", () => {
    expect(requisitoApi("DELETE", "admin/c/beneficios/b1")).toEqual({ secciones: ["beneficios"], accion: "eliminar" });
    expect(requisitoApi("PUT", "admin/c/beneficios/b1")).toEqual({ secciones: ["beneficios"], accion: "editar" });
    expect(requisitoApi("GET", "admin/q/pedidos")).toEqual({ secciones: ["pedidos"], accion: "ver" });
    expect(requisitoApi("GET", "admin/resumen")).toBeNull();
  });

  it("API: catálogo no toca pedidos ni participantes; operaciones no borra; atención responde mensajes", () => {
    expect(puedeApi("Catálogo", "PUT", "admin/c/beneficios/b1")).toBe(true);
    expect(puedeApi("Catálogo", "PUT", "admin/c/pedidos/BNB-1")).toBe(false);
    expect(puedeApi("Catálogo", "POST", "admin/participantes/p1/codigo")).toBe(false);
    expect(puedeApi("Operaciones", "DELETE", "admin/c/pedidos/BNB-1")).toBe(false);
    expect(puedeApi("Operaciones", "PUT", "admin/c/pedidos/BNB-1")).toBe(true);
    expect(puedeApi("Atención", "PUT", "admin/c/mensajes/c1")).toBe(true);
    expect(puedeApi("Atención", "PUT", "admin/niveles")).toBe(false);
  });

  it("API: admin/config distingue la marca (configuración) del contenido (también catálogo)", () => {
    expect(puedeApi("Catálogo", "PUT", "admin/config", { contenido: {} })).toBe(true);
    expect(puedeApi("Catálogo", "PUT", "admin/config", { tenant: {} })).toBe(false);
    expect(puedeApi("Administrador", "PUT", "admin/config", { tenant: {} })).toBe(true);
  });

  it("API: las consultas de apoyo no exigen sección", () => {
    for (const r of ["admin/meta", "admin/resumen"]) expect(puedeApi("Solo lectura", "GET", r), r).toBe(true);
  });
});

describe("roles personalizados", () => {
  it("un rol registrado manda lo que puede hacer y deja de existir al quitarlo", () => {
    registrarRoles([{ rol: "Editor", matriz: { contenido: ["ver", "editar"], dashboard: ["ver"] } }]);
    expect(rolExiste("Editor")).toBe(true);
    expect(puede("Editor", "contenido", "editar")).toBe(true);
    expect(puede("Editor", "contenido", "eliminar")).toBe(false);
    expect(puede("Editor", "pedidos", "ver")).toBe(false);
    expect(puedeApi("Editor", "PUT", "admin/config", { contenido: {} })).toBe(true);
    expect(puedeApi("Editor", "GET", "admin/q/pedidos")).toBe(false);
    registrarRoles([]);
    expect(rolExiste("Editor")).toBe(false);
    expect(puede("Editor", "contenido", "ver")).toBe(false);
  });
  it("un rol registrado no puede pisar uno del sistema", () => {
    registrarRoles([{ rol: "Administrador", matriz: {} }]);
    expect(esRolSistema("Administrador")).toBe(true);
    expect(puede("Administrador", "roles", "eliminar")).toBe(true);
  });
  it("normaliza: descarta secciones o acciones inválidas y agrega ver", () => {
    const m = normalizarMatriz({ pedidos: ["eliminar", "volar"], inventada: ["ver"], marcas: [] });
    expect(m).toEqual({ pedidos: ["ver", "eliminar"] });
  });
  it("API: gestionar roles exige la sección Roles", () => {
    expect(puedeApi("Catálogo", "POST", "admin/roles", { rol: "x" })).toBe(false);
    expect(puedeApi("Administrador", "DELETE", "admin/roles/x")).toBe(true);
  });
});

