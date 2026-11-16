import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { inicialesDeMarca } from "../core/banner-beneficio";
import type { Slide } from "../core/models";

/**
 * Banner del carrusel, compuesto con la foto de un beneficio o de un evento y sus datos.
 * Escritorio: la foto a la izquierda con corte diagonal, y a la derecha el nombre, la etiqueta y el botón
 * (los beneficios llevan además el logo circular de la marca; los eventos no).
 * Móvil: la foto con la etiqueta arriba y, debajo, una franja oscura con el nombre (y el logo circular en el extremo, en beneficios).
 * `modo` fija una de las dos versiones (para las vistas previas del panel); en "auto" cambia según el ancho de la pantalla.
 */
@Component({
  selector: "app-banner-destacado",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block h-full w-full" },
  template: `
    @if (d(); as d) {
      <div class="bn" [class.oculto-movil]="modo() === 'auto'" [class.nada]="modo() === 'movil'">
        <img class="foto" [src]="slide().imagen" alt="" [attr.width]="800" [attr.height]="800" [attr.loading]="prioridad() ? 'eager' : 'lazy'" />
        <div class="panel">
          <div class="fila">
            @if (d.conLogo) { <span class="logo">@if (d.logo) { <img [src]="d.logo" alt="" /> } @else { {{ iniciales() }} }</span> }
            <p class="marca">{{ d.eyebrow }}</p>
          </div>
          <h3 class="nombre">{{ d.titulo }}</h3>
          @if (d.detalle) { <p class="detalle">{{ d.detalle }}</p> }
          @if (d.chip) { <span class="chip">{{ d.chip }}</span> }
          <span class="btn">{{ d.boton }}</span>
        </div>
      </div>

      <div class="mb" [class.solo-movil]="modo() === 'auto'" [class.nada]="modo() === 'desktop'">
        <div class="im">
          <img class="foto" [src]="slide().imagen" alt="" [attr.loading]="prioridad() ? 'eager' : 'lazy'" />
          @if (d.chip) { <span class="chip">{{ d.chip }}</span> }
        </div>
        <div class="franja" [class.sin-logo]="!d.conLogo">
          <p class="marca">{{ d.eyebrow }}</p>
          <h3 class="nombre">{{ d.titulo }}</h3>
          @if (d.conLogo) { <span class="logo">@if (d.logo) { <img [src]="d.logo" alt="" /> } @else { {{ iniciales() }} }</span> }
        </div>
      </div>
    }
  `,
  styles: `
    :host { --bb-oscuro: #131927; --bb-lima: #bed500; --bb-morado: var(--primary, #924ff5); font-family: inherit; }
    h3, p { margin: 0; }
    .nada { display: none !important; }
    .logo { display: grid; place-items: center; border-radius: 50%; background: #fff; color: #141925; font-weight: 800; overflow: hidden; flex: none; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .chip { display: inline-block; font-weight: 800; border-radius: 999px; background: var(--bb-lima); color: #141925; }
    @media (max-width: 639px) { .oculto-movil { display: none !important; } }
    @media (min-width: 640px) { .solo-movil { display: none !important; } }

    /* Escritorio y tableta: corte diagonal con franja morada */
    .bn { position: relative; container-type: inline-size; height: 100%; width: 100%; overflow: hidden; background: var(--bb-oscuro); color: #fff; isolation: isolate; }
    .bn::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 61%; background: var(--bb-morado); clip-path: polygon(0 0, 100% 0, 84% 100%, 0 100%); z-index: 0; }
    .bn .foto { position: absolute; left: 0; top: 0; height: 100%; width: 58%; object-fit: cover; clip-path: polygon(0 0, 100% 0, 84% 100%, 0 100%); z-index: 1; }
    .bn .panel { position: absolute; top: 0; bottom: 0; left: 54%; right: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 5cqw 0 11cqw; gap: 1.15cqw; z-index: 2; }
    .bn .fila { display: flex; align-items: center; gap: 1.5cqw; min-width: 0; }
    .bn .logo { width: max(44px, 7cqw); height: max(44px, 7cqw); font-size: max(14px, 2.3cqw); border: max(2px, .25cqw) solid rgba(255,255,255,.95); }
    .bn .marca { font-size: max(10px, 1.05cqw); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #c8b8f2; }
    .bn .nombre { font-size: max(15px, 2.85cqw); font-weight: 800; letter-spacing: -.015em; line-height: 1.12; text-wrap: balance; max-width: 18ch; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .bn .detalle { font-size: max(11px, 1.3cqw); color: rgba(255,255,255,.78); }
    .bn .chip { font-size: max(11px, 1.5cqw); padding: .4cqw 1.2cqw; }
    .bn .btn { display: inline-block; background: #fff; color: #141925; font-weight: 700; font-size: max(11px, 1.35cqw); padding: max(6px, 1cqw) max(14px, 2.4cqw); border-radius: .7cqw; white-space: nowrap; }

    /* Móvil: foto con la etiqueta y franja oscura debajo (con el logo circular en beneficios) */
    .mb { display: flex; flex-direction: column; height: 100%; width: 100%; background: var(--bb-oscuro); }
    .mb .im { position: relative; flex: 1 1 0; min-height: 0; }
    .mb .foto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    .mb .chip { position: absolute; left: 10px; top: 10px; font-size: 13px; padding: 4px 11px; }
    .mb .franja { position: relative; flex: none; padding: 12px 92px 14px 14px; }
    .mb .franja.sin-logo { padding-right: 14px; }
    .mb .marca { font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #c8b8f2; }
    .mb .nombre { font-size: 14.5px; font-weight: 800; color: #fff; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .mb .logo { position: absolute; right: 12px; top: -33px; width: 66px; height: 66px; border: 3px solid var(--bb-oscuro); font-size: 19px; }
  `,
})
export class BannerDestacadoComponent {
  readonly slide = input.required<Slide>();
  /** La primera diapositiva del carrusel carga la imagen de inmediato. */
  readonly prioridad = input(false);
  readonly modo = input<"auto" | "desktop" | "movil">("auto");

  /** Lo que se muestra, según sea un beneficio (con logo de la marca) o un evento (con fecha y lugar, sin logo). */
  protected readonly d = computed(() => {
    const s = this.slide();
    if (s.beneficio) return { eyebrow: s.beneficio.marca, titulo: s.beneficio.nombre, chip: s.beneficio.descuento, detalle: "", logo: s.beneficio.logo, conLogo: true, boton: "Ver beneficio" };
    if (s.evento) return { eyebrow: s.evento.categoria, titulo: s.evento.nombre, chip: s.evento.fecha, detalle: s.evento.lugar, logo: "", conLogo: false, boton: "Ver evento" };
    return null;
  });
  protected readonly iniciales = computed(() => inicialesDeMarca(this.slide().beneficio?.marca ?? ""));
}
