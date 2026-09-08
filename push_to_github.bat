@echo off
chcp 65001 > nul
echo ========================================================
echo   SiamBus Express - Pushing Code to GitHub
echo ========================================================
cd /d C:\same\01
git push -u origin main
echo.
echo กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้...
pause > nul
