import { Injectable, signal } from "@angular/core";

/** Estado de la conexión con el API. Lo alimentan el navegador (online/offline) y el interceptor de errores. */
@Injectable({ providedIn: "root" })
export class ConexionService {
  /** Sin internet o el API no responde. */
  readonly sinConexion = signal(typeof navigator !== "undefined" ? !navigator.onLine : false);
  /** El API respondió con un error de servidor (5xx) en la última petición. */
  readonly errorServidor = signal(false);
  /** Otro usuario guardó antes el registro que se estaba editando (412): mensaje del servidor. */
  readonly conflicto = signal<string | null>(null);
  /** El servidor negó una acción por permisos (403): mensaje para mostrar. Lo consume el panel. */
  readonly permisoDenegado = signal<string | null>(null);
  /** La sesión del panel venció (401 en una ruta del panel). */
  readonly sesionVencida = signal(false);
  /** La sesión del participante venció o no existe (401 en una ruta del sitio): hay que volver a ingresar. */
  readonly sesionParticipanteVencida = signal(false);

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.sinConexion.set(false));
    window.addEventListener("offline", () => this.sinConexion.set(true));
  }
  reportarOk() {
    // Una respuesta que ya venía en camino cuando se cortó la red no debe borrar el aviso de "sin conexión".
    if (typeof navigator === "undefined" || navigator.onLine) this.sinConexion.set(false);
    this.errorServidor.set(false);
  }
}