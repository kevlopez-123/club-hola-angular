// Genera public/robots.txt y public/sitemap.xml para el dominio donde se publica el sitio.
// Uso:  SITE_URL=https://www.midominio.com npm run seo:archivos     (por defecto http://localhost:4200)
// El sitemap lista las páginas públicas fijas. Las fichas (productos, beneficios) las debe listar el backend:
// al conectarlo, servir /sitemap.xml desde el API con todas las URLs /canjea/:id y /beneficios/:id.
import { writeFileSync } from "node:fs";

const base = (process.env.SITE_URL ?? process.argv[2] ?? "http://localhost:4200").replace(/\/$/, "");
const publicas = [
  ["/", "1.0", "daily"],
  ["/canjea", "0.9", "daily"],
  ["/beneficios", "0.9", "daily"],
  ["/preguntas-frecuentes", "0.5", "monthly"],
  ["/terminos", "0.3", "yearly"],
  ["/privacidad", "0.3", "yearly"],
];
const privadas = ["/admin", "/login", "/carrito", "/gracias", "/favoritos", "/mi-nivel", "/notificaciones", "/mis-beneficios", "/mis-compras", "/mis-puntos", "/perfil", "/contacto", "/buscar"];
const hoy = new Date().toISOString().slice(0, 10);

writeFileSync("public/robots.txt", `User-agent: *\nAllow: /\n${privadas.map((p) => `Disallow: ${p}`).join("\n")}\n\nSitemap: ${base}/sitemap.xml\n`);
writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicas
    .map(([p, prio, freq]) => `  <url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${hoy}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
    .join("\n")}\n</urlset>\n`,
);
console.log(`SEO: public/robots.txt y public/sitemap.xml para ${base}`);