# Quick Deploy Script for Upload Edge Function (Using NPX)
# This automates the deployment process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Edge Function Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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

# Set secrets using npx
npx supabase secrets set "R2_ACCOUNT_ID=$r2AccountId"
npx supabase secrets set "R2_ACCESS_KEY_ID=$r2AccessKey"
npx supabase secrets set "R2_SECRET_ACCESS_KEY=$r2SecretKeyPlain"
npx supabase secrets set "R2_BUCKET_NAME=$r2BucketName"

if (![string]::IsNullOrWhiteSpace($r2PublicUrl)) {
    npx supabase secrets set "R2_PUBLIC_URL=$r2PublicUrl"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secrets configured!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to set secrets" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy the Edge Function
Write-Host "Deploying upload-media Edge Function..." -ForegroundColor Yellow
npx supabase functions deploy upload-media

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update frontend code to use new upload function" -ForegroundColor White
    Write-Host "   - Replace 'image-upload' with 'image-upload-new' in imports" -ForegroundColor Gray
    Write-Host "2. Test the upload on your profile page" -ForegroundColor White
    Write-Host "3. Enable R2 public access in Cloudflare if needed" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
    Write-Host "See DEPLOY_UPLOAD_FUNCTION.md for troubleshooting." -ForegroundColor Yellow
}
