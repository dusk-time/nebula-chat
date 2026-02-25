@echo off
echo ========================================
echo   Nebula Chat 双实例测试启动器
echo ========================================
echo.

echo [1/3] 启动实例 1 (Alice)...
cd /d F:\nebula-chat
start "Nebula Chat - Alice" cmd /k "npm run tauri dev"

timeout /t 5 /nobreak >nul

echo [2/3] 启动实例 2 (Bob)...
cd /d F:\nebula-chat
start "Nebula Chat - Bob" cmd /k "npm run tauri dev -- --config src-tauri/tauri.conf.instance2.json"

echo.
echo [3/3] 两个实例都已启动！
echo.
echo ========================================
echo   测试步骤：
echo ========================================
echo.
echo 1. 在实例 1 (Alice) 中：
echo    - 创建身份 "Alice"
echo    - 复制 Peer ID
echo.
echo 2. 在实例 2 (Bob) 中：
echo    - 创建身份 "Bob"
echo    - 复制 Peer ID
echo.
echo 3. 互相添加联系人：
echo    - 在 Alice 中添加 Bob 的 Peer ID
echo    - 在 Bob 中添加 Alice 的 Peer ID
echo.
echo 4. 发送测试消息！
echo.
echo 提示：按 L 键查看调试日志
echo       点击 🐛 调试 查看连接状态
echo ========================================
echo.
pause
