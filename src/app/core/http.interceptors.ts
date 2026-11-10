import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, retry, tap, throwError, timer } from "rxjs";
import { environment } from "../../environments/environment";
import { ConexionService } from "./conexion.service";
import { TokenService, type AmbitoToken } from "./token.service";
import { VersionesService } from "./versiones.service";
import { HttpResponse } from "@angular/common/http";

const esDelApi = (url: string) => url.startsWith(environment.apiBase + "/") || url === environment.apiBase;
/** Rutas de ingreso: un 401 ahí significa "credenciales incorrectas", no "sesión vencida". */
const esIngreso = (url: string) => /\/auth\//.test(url);

/** Eventos de analítica: son accesorios, así que no deben mostrar avisos de conexión ni cerrar sesiones. */
const esAnalitica = (url: string) => /\/analitica\/eventos$/.test(url);

/** Ámbito de una petición: las rutas `admin/...` son del panel; el resto, del participante. */
const ambitoDe = (url: string): AmbitoToken => (url.startsWith(environment.apiBase + "/admin/") ? "admin" : "participante");

/** Agrega `Authorization: Bearer <token>` a las peticiones al API cuando hay token del ámbito que corresponde. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (esAnalitica(req.url)) return next(req); // anónimo: no lleva la sesión de nadie
  const token = inject(TokenService).get(ambitoDe(req.url));
  if (!token || !esDelApi(req.url)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

/**
 * Control de concurrencia del panel: manda la versión cargada de cada registro en `If-Match` al guardarlo y recuerda
 * la versión que trae cada respuesta. Un 412 significa que otro usuario guardó antes: se avisa con `conflicto`.
 */
export const versionesInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase + "/admin/")) return next(req);
  const versiones = inject(VersionesService);
  const conexion = inject(ConexionService);
  const ruta = req.url.slice(environment.apiBase.length + 1);
  const v = req.method === "PUT" ? versiones.version(ruta) : undefined;
  const salida = v === undefined ? req : req.clone({ setHeaders: { "If-Match": String(v) } });
  return next(salida).pipe(
    tap({
      next: (ev) => { if (ev instanceof HttpResponse && req.method !== "DELETE") versiones.cosechar(ruta, ev.body); },
      error: (e) => { if (e instanceof HttpErrorResponse && e.status === 412) conexion.conflicto.set((e.error as { message?: string } | null)?.message ?? "Otro usuario modificó este registro."); },
    }),
  );
};

/**
 * Errores de red y de servidor, en un solo lugar:
 *  - reintenta las lecturas (GET) ante corte de red o 502/503/504, con espera creciente;
 *  - marca "sin conexión" / "error de servidor" para el aviso global;
 *  - 401 fuera del ingreso → sesión vencida (se limpia el token);
 *  - el resto de errores (422, 409…) se devuelve tal cual para que cada pantalla muestre su mensaje.
 */
export const erroresInterceptor: HttpInterceptorFn = (req, next) => {
  const conexion = inject(ConexionService);
  const token = inject(TokenService);
  if (!esDelApi(req.url) || esAnalitica(req.url)) return next(req);
  const reintentable = (e: unknown) => e instanceof HttpErrorResponse && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504);
  const lectura = req.method === "GET";
  return next(req).pipe(
    lectura && environment.reintentosLectura > 0
      ? retry({ count: environment.reintentosLectura, delay: (e, n) => (reintentable(e) ? timer(400 * 2 ** (n - 1)) : throwError(() => e)) })
      : tap(),
    tap({ next: () => conexion.reportarOk() }),
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) conexion.sinConexion.set(true);
        else if (e.status >= 500) conexion.errorServidor.set(true);
        else if (e.status === 403) conexion.permisoDenegado.set((e.error as { message?: string } | null)?.message ?? "No tienes permiso para esta acción.");
        else if (e.status === 401 && !esIngreso(req.url)) {
          const ambito = ambitoDe(req.url);
          token.set(null, ambito);
          if (ambito === "admin") conexion.sesionVencida.set(true);
          else conexion.sesionParticipanteVencida.set(true);
        }
      }
      return throwError(() => e);
    }),
  );
};