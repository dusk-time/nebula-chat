@echo off
echo 启动 Nebula Chat 实例 2（端口 5174）...
cd /d F:\nebula-chat
start "Nebula Chat - Instance 2" cmd /k "npm run dev -- --port 5174"
echo 实例 2 启动中...
echo 访问地址：http://localhost:5174
echo.
echo 提示：使用隐私模式/不同浏览器访问实例 2
