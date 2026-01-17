# Quick Deploy Script for Upload Edge Function
# This automates the deployment process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Edge Function Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
    Write-Host "✅ Supabase CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
}

Write-Host ""

# Prompt for R2 credentials if not set
Write-Host "R2 Configuration" -ForegroundColor Yellow
Write-Host "You'll need these from Cloudflare Dashboard → R2 → Manage R2 API Tokens" -ForegroundColor Gray
Write-Host ""

$r2AccountId = Read-Host "Enter R2 Account ID"
$r2AccessKey = Read-Host "Enter R2 Access Key ID"
$r2SecretKey = Read-Host "Enter R2 Secret Access Key" -AsSecureString
$r2SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($r2SecretKey))
$r2BucketName = Read-Host "Enter R2 Bucket Name (default: perksnow-media-dev)"
if ([string]::IsNullOrWhiteSpace($r2BucketName)) {
    $r2BucketName = "perksnow-media-dev"
}

$r2PublicUrl = Read-Host "Enter R2 Public URL (e.g., https://pub-abc123.r2.dev or leave blank)"

Write-Host ""
Write-Host "Setting Supabase secrets..." -ForegroundColor Yellow

# Set secrets
supabase secrets set "R2_ACCOUNT_ID=$r2AccountId"
supabase secrets set "R2_ACCESS_KEY_ID=$r2AccessKey"
supabase secrets set "R2_SECRET_ACCESS_KEY=$r2SecretKeyPlain"
supabase secrets set "R2_BUCKET_NAME=$r2BucketName"

if (![string]::IsNullOrWhiteSpace($r2PublicUrl)) {
    supabase secrets set "R2_PUBLIC_URL=$r2PublicUrl"
}

Write-Host "✅ Secrets configured!" -ForegroundColor Green
Write-Host ""

# Deploy the Edge Function
Write-Host "Deploying upload-media Edge Function..." -ForegroundColor Yellow
supabase functions deploy upload-media

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update frontend code to use new upload function" -ForegroundColor White
    Write-Host "   - See DEPLOY_UPLOAD_FUNCTION.md Step 5" -ForegroundColor Gray
    Write-Host "2. Test the upload on your profile page" -ForegroundColor White
    Write-Host "3. Enable R2 public access in Cloudflare if needed" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
    Write-Host "See DEPLOY_UPLOAD_FUNCTION.md for troubleshooting." -ForegroundColor Yellow
}
