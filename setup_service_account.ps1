# ============================================================================
# frontend - cuenta de servicio dedicada (minima)
# ============================================================================
# El frontend solo sirve la SPA estatica + SSR. No necesita acceso directo
# a Cloud SQL ni a buckets - todo eso lo hace via los backend services.
# ============================================================================

. "$PSScriptRoot\..\infra\config.ps1"

$SA_NAME  = "frontend-sa"
$SA_EMAIL = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "  Cuenta : $SA_EMAIL"

$exists = gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID --format="value(email)" 2>$null
if ($exists -eq $SA_EMAIL) {
  Write-Host "  [--] SA ya existe" -ForegroundColor Gray
} else {
  gcloud iam service-accounts create $SA_NAME `
    --display-name="frontend" `
    --description="Sirve la SPA Next.js de hipotecai" `
    --project=$PROJECT_ID --quiet
  Write-Host "  [OK] SA creada" -ForegroundColor Green
}

# El frontend no necesita roles especiales por ahora.
Write-Host "  Roles: (ninguno - el frontend solo sirve HTTP publico)"
