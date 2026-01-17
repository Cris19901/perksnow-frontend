# Deploy generate-upload-url Edge Function to Supabase
# This enables direct R2 uploads using pre-signed URLs (works reliably on mobile)

Write-Host "🚀 Deploying generate-upload-url Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Deploy the function
Write-Host "📦 Deploying function to Supabase..." -ForegroundColor Yellow
npx supabase functions deploy generate-upload-url

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "1. The function is now live and ready to use"
    Write-Host "2. Your app will use pre-signed URLs for mobile uploads"
    Write-Host "3. This bypasses the Edge Function proxy, fixing 502 errors"
    Write-Host ""
    Write-Host "🔧 How it works:" -ForegroundColor Cyan
    Write-Host "1. Client requests a pre-signed URL from Edge Function"
    Write-Host "2. Edge Function generates secure URL (valid for 5 minutes)"
    Write-Host "3. Client uploads file DIRECTLY to R2 using that URL"
    Write-Host "4. No file proxying through Edge Function = faster & more reliable"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're logged in: npx supabase login"
    Write-Host "2. Make sure you've linked the project: npx supabase link --project-ref YOUR_PROJECT_REF"
    Write-Host "3. Check that R2 credentials are still set (they should be from before)"
    Write-Host ""
    exit 1
}

Write-Host "🎉 All done! Your mobile uploads should now work reliably." -ForegroundColor Green
