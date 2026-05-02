# ============================================================================
# frontend - build + deploy a Cloud Run
# ============================================================================
# Diferencia con los servicios backend: las NEXT_PUBLIC_* se pasan como
# --build-arg (Next.js las hornea en el bundle del cliente).
#
# Este script consulta las URLs reales de los 7 servicios backend ya
# desplegados en el ambiente activo y las inyecta al build.
# ============================================================================

. "$PSScriptRoot\..\infra\config.ps1"

$SERVICE_BASE = "frontend"
$SERVICE_NAME = Get-HipotecaiServiceName $SERVICE_BASE
$IMAGE        = "$AR_HOST/$PROJECT_ID/$AR_REPO/$($SERVICE_NAME):latest"
$SA_EMAIL     = "$SERVICE_BASE-sa@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "Ambiente    : $($Global:ENVIRONMENT.ToUpper())"
Write-Host "Servicio    : $SERVICE_NAME"
Write-Host "Imagen      : $IMAGE"

# ---- Resolver URLs de los servicios backend ya desplegados ---------------
function Resolve-ServiceUrl {
  param([string]$BaseName)
  $name = Get-HipotecaiServiceName $BaseName
  $url = gcloud run services describe $name `
    --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>$null
  if (-not $url) { return "" }
  return $url
}

$LOGIN_URL        = Resolve-ServiceUrl "login-service"
$ESTUDIOS_URL     = Resolve-ServiceUrl "estudios-service"
$INGESTION_URL    = Resolve-ServiceUrl "ingestion-service"
$CLASIFICADOR_URL = Resolve-ServiceUrl "clasificador-api"
$DOCUMENTOS_URL   = Resolve-ServiceUrl "documentos-api"
$SINTETIZADOR_URL = Resolve-ServiceUrl "sintetizador-api"
$VERIFICACION_URL = Resolve-ServiceUrl "verificacion-legal-api"

Write-Host ""
Write-Host "URLs backend resueltas:"
Write-Host "  login         : $LOGIN_URL"
Write-Host "  estudios      : $ESTUDIOS_URL"
Write-Host "  ingestion     : $INGESTION_URL"
Write-Host "  clasificador  : $CLASIFICADOR_URL"
Write-Host "  documentos    : $DOCUMENTOS_URL"
Write-Host "  sintetizador  : $SINTETIZADOR_URL"
Write-Host "  verificacion  : $VERIFICACION_URL"

if (-not $LOGIN_URL -or -not $ESTUDIOS_URL) {
  Write-Host ""
  Write-Host "[!!] Algunos servicios backend aun no estan desplegados." -ForegroundColor Yellow
  Write-Host "     Despliegalos primero:  .\deploy_all.ps1"
  $cont = Read-Host "Continuar igual? (s/N)"
  if ($cont -ne "s" -and $cont -ne "S") { exit 1 }
}

# ---- Build con Cloud Build pasando los build args -------------------------
Write-Host "`n[1/2] Construyendo imagen (con NEXT_PUBLIC_* horneadas)..." -ForegroundColor Yellow

$substitutions = "_GOOGLE_CLIENT_ID=$Global:GOOGLE_CLIENT_ID," +
  "_API_LOGIN_URL=$LOGIN_URL," +
  "_API_ESTUDIOS_URL=$ESTUDIOS_URL," +
  "_API_INGESTION_URL=$INGESTION_URL," +
  "_API_CLASIFICADOR_URL=$CLASIFICADOR_URL," +
  "_API_DOCUMENTOS_URL=$DOCUMENTOS_URL," +
  "_API_SINTETIZADOR_URL=$SINTETIZADOR_URL," +
  "_API_VERIFICACION_URL=$VERIFICACION_URL," +
  "_HIPOTECAI_ENV=$Global:ENVIRONMENT"

# Cloud Build inline config (usar build args correctamente)
$cloudbuildContent = @"
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=`${_GOOGLE_CLIENT_ID}'
      - '--build-arg=NEXT_PUBLIC_API_LOGIN_URL=`${_API_LOGIN_URL}'
      - '--build-arg=NEXT_PUBLIC_API_ESTUDIOS_URL=`${_API_ESTUDIOS_URL}'
      - '--build-arg=NEXT_PUBLIC_API_INGESTION_URL=`${_API_INGESTION_URL}'
      - '--build-arg=NEXT_PUBLIC_API_CLASIFICADOR_URL=`${_API_CLASIFICADOR_URL}'
      - '--build-arg=NEXT_PUBLIC_API_DOCUMENTOS_URL=`${_API_DOCUMENTOS_URL}'
      - '--build-arg=NEXT_PUBLIC_API_SINTETIZADOR_URL=`${_API_SINTETIZADOR_URL}'
      - '--build-arg=NEXT_PUBLIC_API_VERIFICACION_URL=`${_API_VERIFICACION_URL}'
      - '--build-arg=NEXT_PUBLIC_HIPOTECAI_ENV=`${_HIPOTECAI_ENV}'
      - '-t'
      - '$IMAGE'
      - '.'
images:
  - '$IMAGE'
options:
  logging: CLOUD_LOGGING_ONLY
"@

$tempCloudbuild = Join-Path $PSScriptRoot "_cloudbuild.tmp.yaml"
$cloudbuildContent | Out-File -FilePath $tempCloudbuild -Encoding ASCII

gcloud builds submit . --config=$tempCloudbuild --substitutions=$substitutions --project=$PROJECT_ID
$buildExit = $LASTEXITCODE

Remove-Item $tempCloudbuild -ErrorAction SilentlyContinue

if ($buildExit -ne 0) { exit 1 }

# ---- Deploy a Cloud Run ---------------------------------------------------
Write-Host "`n[2/2] Desplegando a Cloud Run..." -ForegroundColor Yellow

# La SA del frontend solo necesita servir trafico publico
$saExists = gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID --format="value(email)" 2>$null
if ($saExists -ne $SA_EMAIL) {
  Write-Host "  [--] Creando SA del frontend..."
  gcloud iam service-accounts create "$SERVICE_BASE-sa" `
    --display-name="frontend" `
    --description="Sirve la SPA Next.js de hipotecai" `
    --project=$PROJECT_ID --quiet
}

gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --region $REGION `
  --project $PROJECT_ID `
  --platform managed `
  --service-account $SA_EMAIL `
  --allow-unauthenticated `
  --set-env-vars "NODE_ENV=production,HIPOTECAI_ENV=$Global:ENVIRONMENT" `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --concurrency 80 `
  --max-instances 5 `
  --min-instances 0

if ($LASTEXITCODE -eq 0) {
  $url = gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)"
  Write-Host "`n[OK] Frontend desplegado: $url" -ForegroundColor Green
  Write-Host ""
  Write-Host "Acciones post-despliegue:" -ForegroundColor Yellow
  Write-Host "  1. Agrega esta URL a Authorized JavaScript origins en GCP Console:"
  Write-Host "     https://console.cloud.google.com/apis/credentials"
  Write-Host "  2. Actualiza ALLOWED_ORIGINS en login-service y demas:"
  Write-Host "     gcloud run services update $(Get-HipotecaiServiceName 'login-service') --region=$REGION --project=$PROJECT_ID --update-env-vars=ALLOWED_ORIGINS='$url,http://localhost:3030',FRONTEND_URL='$url'"
}
