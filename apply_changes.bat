@echo off
echo Stopping Node.js processes...
taskkill /F /IM node.exe
echo.
echo Updating Database...
call npx prisma db push
call npx prisma generate
echo.
echo Starting Server...
pnpm dev
