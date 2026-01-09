@echo off
set "PATH=%PATH%;C:\Windows\System32\WindowsPowerShell\v1.0"
echo ====================================
echo Margwa Backend - Database Setup
echo ====================================
echo.

REM Go to parent directory
cd ..

echo Setting up database...
echo.

echo [1/3] Running migrations...
cd shared\database
echo Generating migrations...
call npm run db:generate
echo.
echo Applying migrations...
call npm run db:migrate
echo.

@REM echo [2/3] Seeding database with sample data...
@REM cd ..\..
@REM call npm run db:seed
@REM echo.

@REM echo [3/3] Testing database connection...
@REM call npm run test:api
@REM echo.

echo ====================================
echo Database setup complete!
echo ====================================
echo.
echo You can now:
echo - View database in PgAdmin: http://localhost:5050
echo - View database in Drizzle Studio: npm run db:studio
echo.
pause
