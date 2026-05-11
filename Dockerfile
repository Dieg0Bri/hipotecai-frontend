# ============================================================================
# frontend - Next.js 16 standalone para Cloud Run
# ============================================================================
# Las variables NEXT_PUBLIC_* deben pasarse como --build-arg porque Next
# las hornea en el bundle del cliente al hacer build (no se pueden cambiar
# en runtime). El setup_cloudrun.ps1 las inyecta antes del build.
# ============================================================================

# Stage 1: deps
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install --no-audit --no-fund; \
    fi

# Stage 2: build
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ARG NEXT_PUBLIC_API_LOGIN_URL=""
ARG NEXT_PUBLIC_API_ESTUDIOS_URL=""
ARG NEXT_PUBLIC_API_INGESTION_URL=""
ARG NEXT_PUBLIC_API_CLASIFICADOR_URL=""
ARG NEXT_PUBLIC_API_DOCUMENTOS_URL=""
ARG NEXT_PUBLIC_API_SINTETIZADOR_URL=""
ARG NEXT_PUBLIC_API_VERIFICACION_URL=""
ARG NEXT_PUBLIC_API_OCR_URL=""
ARG NEXT_PUBLIC_HIPOTECAI_ENV="dev"

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_LOGIN_URL=$NEXT_PUBLIC_API_LOGIN_URL
ENV NEXT_PUBLIC_API_ESTUDIOS_URL=$NEXT_PUBLIC_API_ESTUDIOS_URL
ENV NEXT_PUBLIC_API_INGESTION_URL=$NEXT_PUBLIC_API_INGESTION_URL
ENV NEXT_PUBLIC_API_CLASIFICADOR_URL=$NEXT_PUBLIC_API_CLASIFICADOR_URL
ENV NEXT_PUBLIC_API_DOCUMENTOS_URL=$NEXT_PUBLIC_API_DOCUMENTOS_URL
ENV NEXT_PUBLIC_API_SINTETIZADOR_URL=$NEXT_PUBLIC_API_SINTETIZADOR_URL
ENV NEXT_PUBLIC_API_VERIFICACION_URL=$NEXT_PUBLIC_API_VERIFICACION_URL
ENV NEXT_PUBLIC_API_OCR_URL=$NEXT_PUBLIC_API_OCR_URL
ENV NEXT_PUBLIC_HIPOTECAI_ENV=$NEXT_PUBLIC_HIPOTECAI_ENV

RUN npm run build

# Stage 3: runtime
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd -r nodejs && useradd -r -g nodejs -m -d /home/nodejs nodejs

# Next.js standalone deja un server.js minimal con solo lo necesario.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nodejs
EXPOSE 8080
CMD ["node", "server.js"]
