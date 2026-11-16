import type { CanDeactivateFn } from "@angular/router";

/** Pantallas con un formulario que pueden tener cambios sin guardar. */
export interface ConCambiosSinGuardar {
  sucio(): boolean;
}

export const MENSAJE_SALIR = "Tienes cambios sin guardar. Si sales ahora se perderán.";

/** Antes de salir de la pantalla pide confirmar si quedan cambios sin guardar. */
export const salirSinGuardar: CanDeactivateFn<ConCambiosSinGuardar> = (pantalla) => !pantalla?.sucio() || window.confirm(MENSAJE_SALIR);
