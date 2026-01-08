@echo off
echo ====================================
echo Docker Infrastructure Management
echo ====================================
echo.

REM Go to parent directory
cd ..

:menu
echo Select an option:
echo 1. Start infrastructure (Postgres + Redis)
echo 2. Start all services with Docker Compose
echo 3. Stop all services
echo 4. View logs
echo 5. Restart services
echo 6. Clean up (remove volumes)
echo 7. Build services
echo 8. Exit
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start_infra
if "%choice%"=="2" goto start_all
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto restart
if "%choice%"=="6" goto cleanup
if "%choice%"=="7" goto build
if "%choice%"=="8" goto end

echo Invalid choice. Try again.
echo.
goto menu

:start_infra
echo.
echo Starting Postgres and Redis...
docker-compose up -d postgres redis pgadmin redis-commander
echo.
echo Infrastructure started!
echo - PostgreSQL: http://localhost:5432
echo - PgAdmin: http://localhost:5050
echo - Redis: http://localhost:6379
echo - Redis Commander: http://localhost:8081
echo.
pause
goto menu

:start_all
echo.
echo Starting all services...
docker-compose up -d
echo.
echo All services started!
echo Check status with: docker-compose ps
echo.
pause
goto menu

:stop
echo.
echo Stopping all services...
docker-compose down
echo.
echo All services stopped!
echo.
pause
goto menu

:logs
echo.
echo Viewing logs (Ctrl+C to exit)...
docker-compose logs -f
goto menu

:restart
echo.
echo Restarting all services...
docker-compose restart
echo.
echo All services restarted!
echo.
pause
goto menu

:cleanup
echo.
echo WARNING: This will remove all data!
set /p confirm="Are you sure? (yes/no): "
if /i "%confirm%"=="yes" (
    echo Cleaning up...
    docker-compose down -v
    echo Cleanup complete!
) else (
    echo Cleanup cancelled.
)
echo.
pause
goto menu

:build
echo.
echo Building all services...
docker-compose build
echo.
echo Build complete!
echo.
pause
goto menu

:end
echo.
echo Goodbye!
