@echo off
echo ========================================
echo   Nebula Chat 双实例测试 - 简单版
echo ========================================
echo.
echo 实例 1 应该已经启动了 (Alice)
echo.
echo 现在启动实例 2 (Bob)...
echo.
echo 方法：直接运行编译后的 exe
echo.
cd /d F:\nebula-chat\src-tauri\target\debug
if exist nebula-chat.exe (
    echo 找到 nebula-chat.exe，启动第二个实例...
    start "Nebula Chat - Bob" nebula-chat.exe
    echo.
    echo ✅ 两个实例都已启动！
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
    echo 提示：
    echo - 按 L 键查看调试日志
    echo - 点击 🐛 调试 查看连接状态
    echo - 两个实例会存储在不同位置
    echo ========================================
) else (
    echo ❌ 未找到 nebula-chat.exe
    echo.
    echo 请先运行：npm run tauri dev
    echo 等待编译完成后再运行此脚本
)
echo.
pause
