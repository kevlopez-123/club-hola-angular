import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from "@angular/core";

/** Cuenta regresiva hh:mm:ss hasta `expira` (timestamp en ms). */
@Component({
  selector: "app-countdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-center gap-2">
      @for (b of cajas(); track b.l) {
        <div class="text-center">
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">{{ b.v }}</span>
          <span class="mt-1 block text-[11px] text-muted-foreground">{{ b.l }}</span>
        </div>
      }
    </div>
  `,
})
export class Countdown {
  readonly expira = input.required<number>();
  private readonly ahora = signal(Date.now());

  constructor() {
    const t = setInterval(() => this.ahora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  protected readonly cajas = computed(() => {
    const restante = Math.max(0, this.expira() - this.ahora());
    const pad = (n: number) => String(n).padStart(2, "0");
    return [
      { v: pad(Math.floor(restante / 3600000)), l: "Hrs" },
      { v: pad(Math.floor((restante % 3600000) / 60000)), l: "Min" },
      { v: pad(Math.floor((restante % 60000) / 1000)), l: "Seg" },
    ];
  });
}
