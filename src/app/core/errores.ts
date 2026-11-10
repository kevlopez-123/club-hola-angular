import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable } from "@angular/core";

/**
 * Errores no capturados. Los HTTP ya se tratan en `erroresInterceptor` (aviso global de conexión y reintentos),
 * así que no se repiten en la consola como "errores de la aplicación"; el resto sí se registra.
 */
@Injectable()
export class ManejadorErrores implements ErrorHandler {
  handleError(error: unknown) {
    if (error instanceof HttpErrorResponse) return;
    console.error(error);
  }
}