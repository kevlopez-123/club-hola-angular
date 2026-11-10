import { Injectable } from "@angular/core";

/**
 * Versiones de los registros del panel que se cargaron en esta pestaña (control de concurrencia optimista).
 * Cada lectura guarda la `version` de lo que trae; al guardar, `versionesInterceptor` la manda en `If-Match`.
 * Si otro usuario guardó antes, el servidor responde 412 y el panel avisa. Cada guardado correcto trae la versión nueva.
 */
@Injectable({ providedIn: "root" })
export class VersionesService {
  private readonly mapa = new Map<string, number>();

  /** Clave de un recurso a partir de la ruta del API: "participantes/p1", "reglas"… (null si no lleva versión). */
  static claveDeRuta(ruta: string): string | null {
    const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
    if (p[0] !== "admin") return null;
    if (p[1] === "reglas") return "reglas";
    if (p[1] === "c" && p[2] && p[3] && p[3] !== "bulk") return `${p[2]}/${p[3]}`;
    return null;
  }
  private static clave(item: any): string | undefined {
    const k = item?.id ?? item?.codigo ?? item?.slug;
    return k === undefined ? undefined : String(k);
  }
  version(ruta: string): number | undefined {
    const k = VersionesService.claveDeRuta(ruta);
    return k ? this.mapa.get(k) : undefined;
  }
  /** Guarda las versiones que trae una respuesta del API (un registro, una lista, una página `{ items }` o `{ reglas }`). */
  cosechar(ruta: string, cuerpo: any) {
    if (!cuerpo || typeof cuerpo !== "object") return;
    const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
    if (p[0] !== "admin") return;
    const col = p[1] === "q" || p[1] === "c" ? p[2] : undefined;
    const guardar = (item: any) => {
      const clave = VersionesService.clave(item);
      if (col && clave !== undefined && typeof item?.version === "number") this.mapa.set(`${col}/${clave}`, item.version);
    };
    if (p[1] === "reglas") {
      const r = cuerpo.reglas ?? cuerpo;
      if (typeof r?.version === "number") this.mapa.set("reglas", r.version);
    } else if (Array.isArray(cuerpo)) cuerpo.forEach(guardar);
    else if (Array.isArray(cuerpo.items)) cuerpo.items.forEach(guardar);
    else guardar(cuerpo);
  }
}