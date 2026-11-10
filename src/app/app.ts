import { ChangeDetectionStrategy, Component, computed, effect, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs";
import { ConexionService } from "./core/conexion.service";
import { SesionService } from "./core/sesion.service";
import { CookiesComponent } from "./shared/cookies";
import { AvisoRedComponent } from "./shared/aviso-red";
import { LimitesCampos } from "./shared/limites-campos";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, AvisoRedComponent, CookiesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-aviso-red /><router-outlet />@if (conCookies()) { <app-cookies /> }`,
})
export class App {
  private readonly router = inject(Router);
  private readonly conexion = inject(ConexionService);
  private readonly sesion = inject(SesionService);
  /** Límite de caracteres en todos los campos de texto (ver shared/limites-campos). */
  private readonly limites = inject(LimitesCampos).iniciar();
  /** Un 401 del API en el sitio (token vencido o ausente): se pide ingresar de nuevo y se vuelve a la página actual. */
  private readonly vencida = effect(() => {
    if (this.conexion.sesionParticipanteVencida()) {
      this.conexion.sesionParticipanteVencida.set(false);
      if (!this.router.url.startsWith("/admin") && !this.router.url.startsWith("/login")) this.sesion.irAIngresar(this.router.url);
    }
  });
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: location.pathname });
  /** El aviso de cookies es del sitio del participante (incluye el ingreso); el panel interno no lo muestra. */
  protected readonly conCookies = computed(() => !this.url().startsWith("/admin"));
}