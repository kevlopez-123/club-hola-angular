import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService } from "../core/catalog.service";
import { IconComponent } from "../shared/icon.component";
import { BrandService } from "../core/brand.service";
import { MarkdownComponent } from "../shared/markdown.component";
import { legalAMarkdown } from "../core/markdown";

/* ------------------------------------------------------------------ */
/* Preguntas frecuentes                                                */
/* ------------------------------------------------------------------ */

@Component({
  selector: "app-faq-page",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="mx-auto w-full max-w-3xl">
        <h1 class="text-center text-2xl font-extrabold text-ink lg:text-3xl">Preguntas frecuentes</h1>
        <p class="mx-auto mt-2 max-w-2xl text-center text-base text-muted-foreground">{{ intro() }}</p>

        <ul class="mt-8 grid gap-3">
          @for (f of faqs(); track f.q; let i = $index) {
            <li class="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
              <button type="button" [attr.aria-expanded]="abierta() === i" (click)="abierta.set(abierta() === i ? null : i)"
                class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold text-ink">
                {{ f.q }}
                <app-icon name="ChevronDown" [class]="'h-5 w-5 shrink-0 text-primary transition-transform ' + (abierta() === i ? 'rotate-180' : '')" />
              </button>
              @if (abierta() === i) {
                <p class="border-t border-border px-5 py-4 text-base text-muted-foreground">{{ f.a }}</p>
              }
            </li>
          }
        </ul>
        </div>
      </div>
    </div>
  `,
})
export class FaqPage {
  private readonly catalog = inject(CatalogService);
  protected readonly faqs = computed(() => this.catalog.config()?.contenido.faq ?? []);
  protected readonly abierta = signal<number | null>(0);
  private readonly brand = inject(BrandService);
  /** Subtítulo editable en Admin → Contenido → FAQ; si está vacío usa el original con el nombre del programa. */
  protected readonly intro = computed(() => this.catalog.config()?.contenido.faqIntro?.trim() || `Todo lo que necesitas saber sobre cómo funciona ${this.brand.programa()}.`);
}

/* ------------------------------------------------------------------ */
/* Términos y privacidad                                               */
/* ------------------------------------------------------------------ */
const legalTemplate = `
  <div class="bg-surface py-10 lg:py-14">
    <div class="page-container">
      <div class="mx-auto w-full max-w-3xl">
        <h1 class="text-center text-2xl font-extrabold text-ink lg:text-3xl">{{ titulo }}</h1>
        <p class="mx-auto mt-2 max-w-2xl text-center text-base text-muted-foreground">{{ intro() }}</p>
        @if (version(); as v) { <p class="mt-1 text-center text-sm font-medium text-muted-foreground">Versión {{ v.version }} · vigente desde el {{ fecha(v.vigenteDesde) }}</p> }
        <article class="mt-8 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <app-markdown [texto]="texto()" />
        </article>
      </div>
    </div>
  </div>
`;

@Component({ selector: "app-terminos-page", imports: [MarkdownComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: legalTemplate })
export class TerminosPage {
  protected readonly titulo = "Términos y condiciones";
  private readonly catalog = inject(CatalogService);
  private readonly brand = inject(BrandService);
  /** Subtítulo editable en Admin → Contenido → FAQ y legales. */
  protected readonly intro = computed(() => this.catalog.config()?.contenido.terminosIntro?.trim() || `Al participar en ${this.brand.programa()} aceptas estas condiciones.`);
  protected readonly version = computed(() => this.catalog.config()?.contenido.legales?.terminos);
  protected readonly fecha = (iso: string) => iso.split("-").reverse().join("/");
  protected readonly texto = computed(() => legalAMarkdown(this.catalog.config()?.contenido.terminos));
}

@Component({ selector: "app-privacidad-page", imports: [MarkdownComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: legalTemplate })
export class PrivacidadPage {
  protected readonly titulo = "Política de privacidad";
  private readonly catalog = inject(CatalogService);
  protected readonly intro = computed(() => this.catalog.config()?.contenido.privacidadIntro?.trim() ?? "");
  protected readonly version = computed(() => this.catalog.config()?.contenido.legales?.privacidad);
  protected readonly fecha = (iso: string) => iso.split("-").reverse().join("/");
  protected readonly texto = computed(() => legalAMarkdown(this.catalog.config()?.contenido.privacidad));
}
/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-not-found-page",
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div class="max-w-md text-center">
        <h1 class="text-7xl font-bold text-foreground">404</h1>
        <h2 class="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p class="mt-2 text-sm text-muted-foreground">La página que buscas no existe o fue movida.</p>
        <a routerLink="/" class="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Ir al inicio</a>
      </div>
    </div>
  `,
})
export class NotFoundPage {}

/* ------------------------------------------------------------------ */
/* Baja de novedades (enlace de los correos de campaña)                */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-baja-page",
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[60vh] items-center justify-center bg-background px-4 py-12">
      <div class="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 class="text-2xl font-extrabold text-ink">Novedades por correo</h1>
        @switch (fase()) {
          @case ("cargando") { <p role="status" class="mt-4 text-base text-muted-foreground">Verificando tu enlace…</p> }
          @case ("invalido") {
            <p role="alert" class="mt-4 text-base text-ink">{{ error() }}</p>
            <p class="mt-2 text-sm text-muted-foreground">Puedes cambiar esta preferencia en <a routerLink="/perfil" class="font-semibold text-primary underline">Mi perfil</a> cuando ingreses a tu cuenta.</p>
          }
          @case ("activa") {
            <p class="mt-4 text-base text-ink">Hoy recibes nuestras novedades y promociones. ¿Quieres dejar de recibirlas?</p>
            <p class="mt-2 text-sm text-muted-foreground">Seguirás recibiendo los avisos de tu cuenta: código de acceso, pedidos y puntos.</p>
            @if (error()) { <p role="alert" class="mt-3 text-sm font-semibold text-destructive">{{ error() }}</p> }
            <button type="button" (click)="cambiar(false)" [disabled]="enviando()" class="mt-6 min-h-12 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground disabled:opacity-60">Dejar de recibir novedades</button>
          }
          @case ("baja") {
            <p role="status" class="mt-4 text-base text-ink">Listo, ya no recibirás novedades ni promociones por correo.</p>
            <p class="mt-2 text-sm text-muted-foreground">Los avisos de tu cuenta seguirán llegando.</p>
            @if (error()) { <p role="alert" class="mt-3 text-sm font-semibold text-destructive">{{ error() }}</p> }
            <button type="button" (click)="cambiar(true)" [disabled]="enviando()" class="mt-6 min-h-12 rounded-full border border-border px-8 text-base font-bold text-ink hover:bg-muted disabled:opacity-60">Fue un error, volver a recibirlas</button>
          }
        }
        <a routerLink="/" class="mt-6 inline-block text-sm font-semibold text-primary underline">Ir al inicio</a>
      </div>
    </div>
  `,
})
export class BajaPage {
  private readonly api = inject(ApiService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get("t") ?? "";
  protected readonly fase = signal<"cargando" | "invalido" | "activa" | "baja">("cargando");
  protected readonly error = signal("");
  protected readonly enviando = signal(false);

  constructor() {
    if (!this.token) {
      this.fase.set("invalido");
      this.error.set("Este enlace está incompleto. Abre el enlace completo que recibiste en tu correo.");
      return;
    }
    this.api.get<{ recibe: boolean }>("novedades/baja", { t: this.token }).subscribe({
      next: (r) => this.fase.set(r.recibe ? "activa" : "baja"),
      error: (e) => { this.fase.set("invalido"); this.error.set(e?.error?.message ?? "No pudimos verificar el enlace. Inténtalo de nuevo más tarde."); },
    });
  }

  protected cambiar(recibe: boolean) {
    this.error.set("");
    this.enviando.set(true);
    this.api.post<{ recibe: boolean }>(recibe ? "novedades/alta" : "novedades/baja", { t: this.token }).subscribe({
      next: (r) => { this.enviando.set(false); this.fase.set(r.recibe ? "activa" : "baja"); },
      error: () => { this.enviando.set(false); this.error.set("No pudimos guardar el cambio. Inténtalo de nuevo."); },
    });
  }
}
