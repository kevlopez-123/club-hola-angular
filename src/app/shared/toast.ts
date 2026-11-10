import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from "@angular/core";
import { IconComponent } from "./icon.component";

/** Avisos breves (éxito o error) para el sitio y el panel de administración. */
@Injectable({ providedIn: "root" })
export class ToastService {
  readonly items = signal<{ id: number; msg: string; error: boolean }[]>([]);
  private n = 0;

  show(msg = "Cambios guardados") {
    this.push(msg, false);
  }
  error(msg: string) {
    this.push(msg, true);
  }
  private push(msg: string, error: boolean) {
    const id = ++this.n;
    this.items.update((x) => [...x, { id, msg, error }]);
    setTimeout(() => this.items.update((x) => x.filter((t) => t.id !== id)), error ? 5000 : 3200);
  }
}

@Component({
  selector: "a-toaster",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[120] grid gap-2" aria-live="polite">
      @for (t of toast.items(); track t.id) {
        <div [attr.role]="t.error ? 'alert' : 'status'"
          [class]="'animate-fade-up pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-lg ' + (t.error ? 'border-destructive' : 'border-border')">
          <app-icon [name]="t.error ? 'AlertCircle' : 'CheckCircle2'" [class]="'h-4 w-4 shrink-0 ' + (t.error ? 'text-destructive' : 'text-primary')" /> {{ t.msg }}
        </div>
      }
    </div>
  `,
})
export class ToasterComponent {
  protected readonly toast = inject(ToastService);
}
