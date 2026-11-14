import { DestroyRef, Directive, ElementRef, inject } from "@angular/core";
import { Router } from "@angular/router";
import { SesionService } from "../core/sesion.service";

/**
 * Versión pública de una página (sin sesión): se puede mirar, pero cualquier enlace o tarjeta lleva al ingreso.
 * Los controles que no navegan (flechas de un carrusel, pestañas) siguen funcionando.
 * Con sesión iniciada no hace nada.
 */
@Directive({ selector: "[appGuestGate]" })
export class GuestGateDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const router = inject(Router);
    const sesion = inject(SesionService);
    const alClic = (e: Event) => {
      if (sesion.logged()) return;
      const control = (e.target as HTMLElement | null)?.closest("a, button");
      if (!control || !el.contains(control)) return;
      // Navega a otra página si es un enlace o está dentro de una tarjeta (beneficio, favorito…).
      if (control.tagName !== "A" && !control.closest("article")) return;
      e.preventDefault();
      e.stopPropagation();
      void router.navigate(["/login"]);
    };
    // En captura: se decide antes de que el enlace o la tarjeta naveguen por su cuenta.
    el.addEventListener("click", alClic, true);
    inject(DestroyRef).onDestroy(() => el.removeEventListener("click", alClic, true));
  }
}
