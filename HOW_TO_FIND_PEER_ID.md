# 获取 Peer ID 的方法

## 方法 1: 查看应用界面（推荐）

在 Nebula Chat 应用窗口中：

1. **查看主界面顶部或设置页面**
   - Peer ID 应该显示在窗口标题栏或用户信息区域
   - 格式：`16Uiu2HAmABC123...` (约 50-60 个字符)

2. **查找"我的信息"或"设置"按钮**
   - 点击后应该显示您的 Peer ID
   - 可能有"复制"按钮

---

## 方法 2: 查看控制台输出

如果应用是从命令行启动的，控制台会显示：

```
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAmABC123456789...
   Public Key: CAESAK...
   Name: User1
   Ready for real P2P communication!
```

**但是**当前实例是从文件管理器启动的，没有控制台输出。

---

## 方法 3: 使用测试脚本（技术方法）

创建一个 PowerShell 脚本来读取身份信息：

```powershell
# 读取 LocalStorage 中的身份信息
$localStoragePath = "$env:APPDATA\com.nebula.chat\nebula\identity.json"
if (Test-Path $localStoragePath) {
    $identity = Get-Content $localStoragePath | ConvertFrom-Json
    Write-Host "Peer ID: $($identity.peerId)"
    Write-Host "Public Key: $($identity.publicKey)"
} else {
    Write-Host "身份信息未找到，请先在应用中创建身份"
}
```

---

## 方法 4: 在应用中添加"显示 Peer ID"功能

我可以快速修改前端代码，在主界面显示 Peer ID。

---

## 🎯 最简单的方案

**现在在应用窗口中:**

1. 查看窗口标题栏 - 可能显示 Peer ID
2. 查找"设置"或"我的信息"按钮
3. 查看是否有"复制 Peer ID"按钮
4. 检查主界面的用户信息区域

**如果找不到:**

我可以立即修改前端代码，在显眼位置显示 Peer ID。需要我这样做吗？

---

## 💡 快速解决方案

我可以创建一个简单的测试页面，显示当前实例的 Peer ID。要我现在做吗？

或者，如果您能看到应用界面，告诉我界面上有什么按钮和文字，我可以帮您找到 Peer ID 的位置。
