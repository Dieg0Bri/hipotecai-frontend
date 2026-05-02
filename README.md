# hipotecai · frontend

Plataforma web del estudio hipotecario asistido. Construida con Next.js 16 (App Router), TypeScript y Tailwind 4. Identidad visual: paleta notarial (navy + crema + bronce), tipografía Cormorant Garamond + Inter.

## Desarrollo

```bash
npm install
npm run dev
```

El servidor arranca en `http://localhost:3000` y redirige automáticamente a `/dashboard`.

## Páginas v0

| Ruta | Propósito |
|------|-----------|
| `/login` | Acceso a la plataforma (SSO Google + correo institucional) |
| `/dashboard` | Inicio: KPIs, accesos directos y registro de últimos estudios |
| `/estudios` | Cartera de estudios hipotecarios con filtros y búsqueda |
| `/estudios/nuevo` | Apertura de expediente: datos del inmueble, cliente y acopio documental |

## Identidad visual

- **Paleta**: navy `#0B1F3A` · crema `#F8F5EE` · bronce `#A47148` · tinta `#1C1C1C`
- **Tipografía**: Cormorant Garamond (display) + Inter (UI) + JetBrains Mono (datos)
- **Principios**: papel, tipográfico, sin gradientes, líneas finas, ornamentos sutiles tipo papel timbrado

Tokens y utilidades en `src/app/globals.css`. Componentes en `src/components/{brand,ui,layout}/`.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
```
