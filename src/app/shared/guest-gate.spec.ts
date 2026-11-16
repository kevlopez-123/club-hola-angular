import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { describe, expect, it, vi } from "vitest";
import { SesionService } from "../core/sesion.service";
import { GuestGateDirective } from "./guest-gate";

/** Lo mismo que un banner del carrusel: un enlace con la foto y el texto dentro, más una flecha que no navega. */
@Component({
  imports: [GuestGateDirective],
  template: `
    <div appGuestGate>
      <a href="/beneficios/b29" id="banner"><img id="foto" alt="" /><span id="boton">Ver beneficio</span></a>
      <button type="button" id="flecha" aria-label="Siguiente">›</button>
    </div>
  `,
})
class Anfitrion {}

function montar(logged: boolean) {
  const navegar = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: { navigate: navegar } },
      { provide: SesionService, useValue: { logged: signal(logged) } },
    ],
  });
  const f = TestBed.createComponent(Anfitrion);
  f.detectChanges();
  return { el: f.nativeElement as HTMLElement, navegar };
}

describe("GuestGateDirective con banners", () => {
  it("sin sesión, tocar cualquier parte del banner lleva al ingreso", () => {
    const { el, navegar } = montar(false);
    for (const id of ["#banner", "#foto", "#boton"]) el.querySelector<HTMLElement>(id)!.click();
    expect(navegar).toHaveBeenCalledTimes(3);
    expect(navegar).toHaveBeenCalledWith(["/login"]);
  });
  it("sin sesión, las flechas del carrusel no navegan", () => {
    const { el, navegar } = montar(false);
    el.querySelector<HTMLElement>("#flecha")!.click();
    expect(navegar).not.toHaveBeenCalled();
  });
  it("con sesión no interviene", () => {
    const { el, navegar } = montar(true);
    el.querySelector<HTMLElement>("#boton")!.click();
    expect(navegar).not.toHaveBeenCalled();
  });
});
