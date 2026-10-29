# My Work OS — Global AI Automation Tool

Herramienta interna para hacer Social Media, SEO Local, Paid Media y Gestión Comercial con IA, para clientes de **cualquier país**.

Cada cliente define su **idioma (ISO 639-1)**, **moneda (ISO 4217)**, **zona horaria (IANA)** y **país (opcional)**. Todo lo que se muestra o se genera usa esa configuración (`Intl.NumberFormat`, `Intl.DateTimeFormat`, `date-fns-tz`). No hay nada fijo para un país, idioma o moneda.

## Arranque rápido (5 minutos)

```bash
npm install
cp .env.example .env.local   # pon tu OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

- **Sin Supabase**: funciona sin configurar nada más. Los datos se guardan en `localStorage` de tu navegador. En Ajustes puedes exportar e importar un JSON como copia de seguridad.
- **API key de OpenAI**: ponla en `OPENAI_API_KEY` (servidor) o pégala en **Ajustes**. Si la pegas en Ajustes, se guarda solo en tu navegador.

## Deploy en Vercel

1. Importa el repo en Vercel (framework: Next.js, sin cambios).
2. Variables de entorno: `OPENAI_API_KEY` y, de forma opcional, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

> ⚠️ Si despliegas **sin** Supabase y con `OPENAI_API_KEY` en el servidor, cualquiera que tenga la URL puede gastar tu key. En ese caso, o activas Supabase (pide login) o no pones la key en Vercel y la pegas solo en Ajustes.

## Supabase (opcional, recomendado para usarlo desde varios dispositivos)

1. Crea un proyecto en supabase.com.
2. En el **SQL Editor**, ejecuta `supabase/schema.sql`. Crea las tablas `businesses`, `leads`, `reviews`, `gbp_posts`, `ad_reports` y `social_posts`, con RLS por usuario y un bucket de Storage `assets`.
3. Pon `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Al abrir la app aparece el login (email + contraseña). Crea tu cuenta. Si tienes la confirmación por email activada en Auth, confírmala.

Con Supabase configurado, la app usa la base de datos. Si no está configurado, usa `localStorage`.

## Módulos

| Ruta | Qué hace |
|---|---|
| `/` | Dashboard del cliente activo: leads de la semana (la semana se calcula en su zona horaria y según el primer día de semana de su país), valor del pipeline en su moneda, reseñas sin responder, anuncios activos o a pausar, y posts programados. |
| `/seo` | Auditoría de GBP con checklist, 4 posts GBP del mes, y respuestas a reseñas (la IA **detecta el idioma de la reseña** y contesta en ese idioma; con 1–2★ pide disculpas y ofrece una solución, con 4–5★ agradece). Se guarda en `gbp_posts` y `reviews`. |
| `/crm` | Tabla de leads (estado, valor en la moneda del cliente, fecha en su zona horaria), respuesta de venta con CTA y follow-up en 3 variantes. El botón 💬 de cada lead rellena el follow-up. |
| `/ads` | Pega CSV, una tabla o notas libres. La IA extrae las campañas, el código marca **"Recomendado pausar"** si el gasto supera el umbral sin conversiones, y la IA redacta el reporte para el cliente. Se guarda en `ad_reports`. Incluye un generador de 5 copys (Hook, Beneficio, CTA). |
| `/social` | Kanban (To Do / En producción / Publicado) con arrastrar y soltar, generador de 12 ideas para el mes (`social_posts`) y Estudio de Video IA: guion de Reel de 20s con tiempos, copy y un prompt para Runway, Pika o Luma, más pasos para CapCut. |
| `/settings` | Idioma, moneda, zona horaria y país del cliente, tono de marca (formal, casual, divertido, premium), **base de conocimiento** (precios, servicios, horarios: la IA solo usa estos datos y no inventa precios), umbral de pausa de Ads, API key, e idioma de la interfaz (ES/EN). |

Cada texto generado tiene un botón **Copiar**, y las secciones grandes tienen **Copiar todo**.

## Cómo funciona la IA

- `app/api/ai/route.ts` es el único endpoint. Recibe `{ task, business, input }`, construye el prompt en el servidor (`lib/ai/prompts.ts`) y llama a `gpt-4o-mini` en modo JSON. El modelo se puede cambiar con `OPENAI_MODEL`.
- Cada prompt incluye el perfil del cliente: idioma, locale (p. ej. `es-AR`), moneda con un ejemplo de formato real (`$ 1.234,50`, `1.234,50 €`), la hora local actual en su zona horaria, el tono y la base de conocimiento.
- Excepciones a propósito: las respuestas a reseñas van en el idioma de la reseña, y el prompt de video va en inglés porque Runway, Pika y Luma funcionan mejor así. El guion y el copy van en el idioma del cliente.
- La IA no navega por la web. En la auditoría de GBP, pega los datos del perfil (descripción, número de fotos, último post…) para obtener un resultado preciso.

## Estructura

```
app/                 páginas (/, /seo, /crm, /ads, /social, /settings) + api/ai
components/          shell, formulario de cliente, componentes ui (estilo shadcn)
lib/locale.ts        listas ISO/IANA + formateadores Intl/date-fns-tz
lib/data/store.ts    capa de datos: Supabase o localStorage
lib/ai/prompts.ts    prompts por tarea
lib/i18n.ts          textos de la interfaz (es/en)
supabase/schema.sql  tablas + RLS + bucket
```

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run typecheck` · `npm run lint`
