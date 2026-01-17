# Test Edge Function Directly
# Replace YOUR_ANON_KEY with your actual anon key

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY"
    "Content-Type" = "application/json"
}

$body = @{
    type = "welcome"
    data = @{
        to_email = "fadiscojay@gmail.com"
        to_name = "Test User"
        referral_code = "TEST123"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Calling Edge Function..."
Write-Host "URL: https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email" -Method Post -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error!" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
    Write-Host "Error Message:" $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" $_.ErrorDetails.Message
    }
}
