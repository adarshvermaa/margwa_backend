Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Margwa Backend Services Manager" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Go to parent directory
Set-Location ..

Write-Host "Stopping any running services..." -ForegroundColor Yellow
Write-Host ""

# Stop services on all ports
$ports = @(3000, 3001, 3002, 3004, 3005, 3006, 3007, 3008)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($processId in $pids) {
                Write-Host "Stopping process $processId on port $port..." -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        # Silently continue if port is not in use
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting All Services" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Start services in new windows
Write-Host "Starting API Gateway (Port 3000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\api-gateway && npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Auth Service (Port 3001)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\auth-service && npx -y nodemon --watch . --ext go --exec ""go run main.go""" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Route Service (Port 3002)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\route-service && npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Real-time Service (Port 3004)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\realtime-service && npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Chat Service (Port 3005)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\chat-service && npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Notification Service (Port 3006)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\notification-service && npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Payment Service (Port 3007)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\payment-service && npx -y nodemon --watch . --ext go --exec ""go run main.go""" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "Starting Analytics Service (Port 3008)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd services\analytics-service && npx -y nodemon --watch . --ext go --exec ""go run main.go""" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "All services started!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor White
Write-Host "- API Gateway:          http://localhost:3000" -ForegroundColor Gray
Write-Host "- Auth Service:         http://localhost:3001" -ForegroundColor Gray
Write-Host "- Route Service:        http://localhost:3002" -ForegroundColor Gray
Write-Host "- Real-time Service:    http://localhost:3004" -ForegroundColor Gray
Write-Host "- Chat Service:         http://localhost:3005" -ForegroundColor Gray
Write-Host "- Notification Service: http://localhost:3006" -ForegroundColor Gray
Write-Host "- Payment Service:      http://localhost:3007" -ForegroundColor Gray
Write-Host "- Analytics Service:    http://localhost:3008" -ForegroundColor Gray
Write-Host ""

# Ask to test services
Write-Host "Press any key to test all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test services
Write-Host ""
Write-Host "Testing services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
node scripts\test-api.js

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
