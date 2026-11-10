import { describe, expect, it } from "vitest";
import { VersionesService } from "./versiones.service";

describe("VersionesService", () => {
  it("clave de ruta: registro de una colección o reglas; lo demás no lleva versión", () => {
    expect(VersionesService.claveDeRuta("admin/c/participantes/p1")).toBe("participantes/p1");
    expect(VersionesService.claveDeRuta("/api/admin/c/pedidos/BNB-1?x=1")).toBe("pedidos/BNB-1");
    expect(VersionesService.claveDeRuta("admin/reglas")).toBe("reglas");
    expect(VersionesService.claveDeRuta("admin/c/productos/bulk")).toBeNull();
    expect(VersionesService.claveDeRuta("admin/q/productos")).toBeNull();
    expect(VersionesService.claveDeRuta("me/perfil")).toBeNull();
  });

  it("cosecha la versión de páginas, listas, registros y reglas", () => {
    const v = new VersionesService();
    v.cosechar("admin/q/productos", { items: [{ id: "p1", version: 3 }, { id: "p2", version: 0 }], total: 2 });
    expect(v.version("admin/c/productos/p1")).toBe(3);
    expect(v.version("admin/c/productos/p2")).toBe(0);
    v.cosechar("admin/c/destinos", [{ slug: "miami", version: 2 }]);
    expect(v.version("admin/c/destinos/miami")).toBe(2);
    v.cosechar("admin/c/pedidos/BNB-1", { codigo: "BNB-1", version: 5 });
    expect(v.version("admin/c/pedidos/BNB-1")).toBe(5);
    v.cosechar("admin/reglas", { reglas: { precio: 0.02, version: 7 }, condiciones: [] });
    expect(v.version("admin/reglas")).toBe(7);
  });

  it("un guardado correcto trae la versión nueva y reemplaza la anterior", () => {
    const v = new VersionesService();
    v.cosechar("admin/c/productos/p1", { id: "p1", version: 1 });
    v.cosechar("admin/c/productos/p1", { id: "p1", version: 2 });
    expect(v.version("admin/c/productos/p1")).toBe(2);
  });

  it("sin versión conocida no se manda nada", () => {
    expect(new VersionesService().version("admin/c/productos/nuevo")).toBeUndefined();
  });
});