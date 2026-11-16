import { ApiError } from "./types";

/** Reglas del código de ingreso (las mismas que debe aplicar el backend real). */
export const OTP_VIDA_MS = 10 * 60_000;
export const OTP_ESPERA_MS = 30_000;
export const OTP_INTENTOS = 5;

interface Otp {
  codigo: string;
  creado: number;
  intentos: number;
}

let actual: Otp | null = null;

const aleatorio = () => String(Math.floor(100000 + Math.random() * 900000));

/** Emite un código nuevo (el anterior deja de valer). Pedir otro antes de 30 s da error 429. */
export function emitirOtp(ahora = Date.now(), generar: () => string = aleatorio): string {
  if (actual) {
    const falta = Math.ceil((actual.creado + OTP_ESPERA_MS - ahora) / 1000);
    if (falta > 0) throw new ApiError(429, `Espera ${falta} s para pedir otro código.`);
  }
  actual = { codigo: generar(), creado: ahora, intentos: 0 };
  return actual.codigo;
}

/** Comprueba el código: vence a los 10 minutos y se invalida tras 5 intentos fallidos. Si es correcto, se consume. */
export function verificarOtp(codigo: string, ahora = Date.now()): void {
  if (!actual) throw new ApiError(422, "Primero pide un código.");
  if (ahora - actual.creado > OTP_VIDA_MS) {
    actual = null;
    throw new ApiError(422, "El código venció. Pide uno nuevo.");
  }
  if (codigo !== actual.codigo) {
    actual.intentos += 1;
    const quedan = OTP_INTENTOS - actual.intentos;
    if (quedan <= 0) {
      actual = null;
      throw new ApiError(422, "Superaste los intentos. Pide un código nuevo.");
    }
    throw new ApiError(422, `Código incorrecto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.`);
  }
  actual = null;
}

export const reiniciarOtp = () => {
  actual = null;
};
