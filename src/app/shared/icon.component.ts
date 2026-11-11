import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import {
  Accessibility, Youtube, AlertCircle, AlertTriangle, AlignLeft, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowRight,
  ArrowUp, AtSign, Award, BarChart3, Bell, Bike, Briefcase, Calendar, CalendarDays, Car, Check, CheckCheck, CheckCircle2,
  CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Clock, Coffee, Coins, CreditCard,
  Database, DollarSign, Download, Dumbbell, ExternalLink, Eye, EyeOff, Facebook, FileSpreadsheet, FileText,
  FormInput, Gem, Gift, GraduationCap, Hash, Heart, HeartPulse, Image, Info, Instagram, Laptop,
  LayoutDashboard, LayoutGrid, Link2, Linkedin, List, Loader2, Lock, LogOut, LucideAngularModule,
  LucideIconData, Mail, MapPin, Menu, MessageCircleQuestion, MessageSquare, Minus, Monitor, Music2, Package,
  Paperclip, Pause, PawPrint, Pencil, Phone, PiggyBank, Plane, PlaneTakeoff, Play, Plus, Printer, QrCode, Search,
  Send, Settings, Shirt, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart,
  SlidersHorizontal, Smartphone, Sofa, Sparkles, Tag, Ticket, Trash2, Trees, Trophy, Twitter, Upload, User, Users,
  UtensilsCrossed, X, Boxes, Filter, Moon, Percent, Receipt, Scale, Sun, UserPlus, Copy, ChefHat, Wine, Theater, Images,
} from "lucide-angular";
import { ICONOS_CATEGORIA_DATA } from "./iconos-categoria";

/** Registro de íconos usados (tree-shaking). Se referencian por su nombre de lucide en PascalCase. */
export const ICONS: Record<string, LucideIconData> = {
  Accessibility, Youtube, AlertCircle, AlertTriangle, AlignLeft, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowRight,
  ArrowUp, AtSign, Award, BarChart3, Bell, Bike, Briefcase, Calendar, CalendarDays, Car, Check, CheckCheck, CheckCircle2,
  CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Clock, Coffee, Coins, CreditCard,
  Database, DollarSign, Download, Dumbbell, ExternalLink, Eye, EyeOff, Facebook, FileSpreadsheet, FileText,
  FormInput, Gem, Gift, GraduationCap, Hash, Heart, HeartPulse, Image, Info, Instagram, Laptop,
  LayoutDashboard, LayoutGrid, Link2, Linkedin, List, Loader2, Lock, LogOut, Mail, MapPin, Menu,
  MessageCircleQuestion, MessageSquare, Minus, Monitor, Music2, Package, Paperclip, Pause, PawPrint, Pencil, Phone,
  PiggyBank, Plane, PlaneTakeoff, Play, Plus, Printer, QrCode, Search, Send, Settings, Shirt, ShieldAlert,
  ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, SlidersHorizontal, Smartphone, Sofa, Sparkles, Tag, Ticket,
  Trash2, Trees, Trophy, Twitter, Upload, User, Users, UtensilsCrossed, X, Boxes, Filter, Moon, Percent, Receipt, Scale, Sun, UserPlus, Copy, ChefHat, Wine, Theater, Images,
  ...ICONOS_CATEGORIA_DATA,
};

/**
 * <app-icon name="ChevronDown" class="h-4 w-4" />
 * El tamaño lo dan las clases de Tailwind del host; el svg lo rellena.
 */
@Component({
  selector: "app-icon",
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.fill-icon]": "fill()", "aria-hidden": "true" },
  template: `<lucide-icon [img]="data()" [strokeWidth]="2" />`,
  styles: `
    :host { display: inline-block; flex-shrink: 0; line-height: 0; vertical-align: middle; }
    :host ::ng-deep svg { width: 100%; height: 100%; display: block; }
    :host(.fill-icon) ::ng-deep svg { fill: currentColor; }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly fill = input(false);
  protected readonly data = computed(() => ICONS[this.name()] ?? Tag);
}

/** Ícono de una categoría: el SVG propio si lo subieron; si no, el ícono elegido de la lista (Tag por defecto). */
@Component({
  selector: "app-cat-icon",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-grid place-items-center", "aria-hidden": "true" },
  template: `@if (svg(); as src) { <img [src]="src" alt="" class="h-full w-full object-contain" /> } @else { <app-icon [name]="icon() || 'Tag'" class="h-full w-full" /> }`,
})
export class CatIconComponent {
  readonly icon = input<string | undefined>("");
  readonly imagen = input<string | undefined>("");
  private readonly sanitizer = inject(DomSanitizer);
  /** Angular no deja pasar `data:image/svg+xml`; se acepta solo ese formato (el panel ya valida el SVG y se muestra con <img>, sin scripts). */
  protected readonly svg = computed(() => {
    const i = this.imagen();
    return i && /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/.test(i) ? this.sanitizer.bypassSecurityTrustUrl(i) : null;
  });
}