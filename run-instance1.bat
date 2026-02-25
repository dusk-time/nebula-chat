@echo off
echo ====================================
echo Nebula Chat - 实例 1
echo ====================================
echo.
cd /d %~dp0src-tauri
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
echo 启动时间：%date% %time%
echo.
cargo run --release
pause
