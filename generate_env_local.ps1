# Genera .env.local apuntando al ambiente dev desplegado en Cloud Run.
# Uso:  .\generate_env_local.ps1
. "$PSScriptRoot\..\infra\config.ps1"

$REGION = "southamerica-west1"

function Resolve-Url {
  param([string]$Service)
  $u = gcloud run services describe $Service --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>$null
  if (-not $u) { Write-Host "  [!!] no encontrado: $Service" -ForegroundColor Yellow }
  return $u
}

$LOGIN        = Resolve-Url "login-service-dev"
$ESTUDIOS     = Resolve-Url "estudios-service-dev"
$INGESTION    = Resolve-Url "ingestion-service-dev"
$CLASIFICADOR = Resolve-Url "clasificador-api-dev"
$DOCUMENTOS   = Resolve-Url "documentos-api-dev"
$SINTETIZADOR = Resolve-Url "sintetizador-api-dev"
$VERIFICACION = Resolve-Url "verificacion-legal-api-dev"
$OCR          = Resolve-Url "ocr-api-dev"

$content = @"
NEXT_PUBLIC_GOOGLE_CLIENT_ID=$Global:GOOGLE_CLIENT_ID
NEXT_PUBLIC_API_LOGIN_URL=$LOGIN
NEXT_PUBLIC_API_ESTUDIOS_URL=$ESTUDIOS
NEXT_PUBLIC_API_INGESTION_URL=$INGESTION
NEXT_PUBLIC_API_CLASIFICADOR_URL=$CLASIFICADOR
NEXT_PUBLIC_API_DOCUMENTOS_URL=$DOCUMENTOS
NEXT_PUBLIC_API_SINTETIZADOR_URL=$SINTETIZADOR
NEXT_PUBLIC_API_VERIFICACION_URL=$VERIFICACION
NEXT_PUBLIC_API_OCR_URL=$OCR
NEXT_PUBLIC_HIPOTECAI_ENV=dev
NODE_ENV=development
"@

$dest = Join-Path $PSScriptRoot ".env.local"
[System.IO.File]::WriteAllText($dest, $content, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "[OK] Escrito $dest" -ForegroundColor Green
Write-Host ""
Write-Host "Reinicia 'npm run dev' para que Next.js tome los cambios."
