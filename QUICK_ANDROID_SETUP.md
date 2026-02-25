# 🚀 Android APK 快速构建方案

## ⚠️ 当前状态

**Android SDK 未安装**，需要手动配置环境。

---

## 📋 方案选择

### 方案 A: 完整 Android 环境（推荐用于正式发布）

**需要：**
1. Android Studio（约 3GB）
2. Android SDK
3. Java JDK 11+
4. Rust Android 目标

**优点：**
- 官方支持
- 可以发布到应用商店
- 完整的调试工具

**缺点：**
- 安装较大（约 5-10GB）
- 配置复杂
- 首次构建时间长

---

### 方案 B: 使用在线构建服务（快速测试）

**推荐服务：**
1. **GitHub Actions** - 免费 CI/CD
2. **Codemagic** - 免费移动端 CI
3. **Bitrise** - 免费额度

**优点：**
- 无需本地环境
- 自动构建
- 云端缓存

**缺点：**
- 需要上传代码
- 依赖网络
- 调试不便

---

### 方案 C: 使用预构建镜像（最快）

**使用 Docker 容器：**

```bash
# 拉取 Tauri Android 构建镜像
docker pull ghcr.io/tauri-apps/tauri-android:latest

# 运行构建
docker run --rm -v ${PWD}:/project ghcr.io/tauri-apps/tauri-android:latest \
  bash -c "cd /project && npx tauri android build --apk"
```

**优点：**
- 无需安装 Android Studio
- 环境隔离
- 可重复构建

**缺点：**
- 需要 Docker
- Windows 需要 WSL2

---

## 🎯 推荐：最小化安装方案

### 步骤 1: 安装 Java JDK

**下载：** https://www.oracle.com/java/technologies/downloads/

选择 **JDK 17**（LTS 版本）

安装后设置环境变量：
```powershell
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
setx PATH "%PATH%;%JAVA_HOME%\bin"
```

### 步骤 2: 安装 Android 命令行工具

**下载：** https://developer.android.com/studio#command-tools

解压到：`C:\Users\你的用户名\AppData\Local\Android\Sdk`

### 步骤 3: 安装必需的 SDK 组件

```powershell
cd C:\Users\你的用户名\AppData\Local\Android\Sdk\cmdline-tools\latest\bin

# 接受许可
.\sdkmanager.bat --licenses

# 安装平台工具
.\sdkmanager.bat "platform-tools" "platforms;android-31" "build-tools;31.0.0"

# 设置环境变量
setx ANDROID_HOME "C:\Users\你的用户名\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin"
```

### 步骤 4: 安装 Rust Android 目标

```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
```

### 步骤 5: 构建 APK

```bash
cd F:\nebula-chat
npx tauri android init
npx tauri android build --apk
```

---

## 💡 最简单的方法：使用 GitHub Actions

### 1. 创建 `.github/workflows/android.yml`

我已经为你创建了工作流文件（见下方）

### 2. 推送到 GitHub

```bash
cd F:\nebula-chat
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/nebula-chat.git
git push -u origin main
```

### 3. 自动构建

每次推送都会自动构建 APK，在 **Actions** 标签页下载！

---

## 📦 GitHub Actions 工作流

创建文件：`.github/workflows/android.yml`

```yaml
name: Android Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  CARGO_TERM_COLOR: always

jobs:
  build-android:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: aarch64-linux-android
      
      - name: Install Android dependencies
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Install dependencies
        run: |
          npm install
          rustup target add aarch64-linux-android
      
      - name: Build APK
        run: |
          npx tauri android init
          npx tauri android build --apk
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: nebula-chat-android
          path: src-tauri/gen/android/app/build/outputs/apk/release/
```

---

## 🔧 快速测试（无需 Android）

### 使用 Web 版本

Nebula Chat 前端是响应式的，可以直接在浏览器使用：

```bash
cd F:\nebula-chat
npm run dev
```

然后在手机浏览器访问：`http://你的电脑 IP:5173`

**注意：** 需要关闭防火墙或允许访问

---

## 📊 对比总结

| 方案 | 难度 | 时间 | 适合场景 |
|------|------|------|----------|
| 完整环境 | ⭐⭐⭐⭐ | 2-3 小时 | 正式开发 |
| GitHub Actions | ⭐⭐ | 10 分钟 | 快速测试 |
| Docker | ⭐⭐⭐ | 30 分钟 | CI/CD |
| Web 版本 | ⭐ | 5 分钟 | 临时测试 |

---

## 🎯 我的建议

**如果你只是想测试：**
→ 使用 **Web 版本** 或 **GitHub Actions**

**如果你要正式发布：**
→ 安装 **完整 Android 环境**

**如果你经常构建：**
→ 使用 **Docker** 或 **本地环境**

---

## 📞 需要我帮你做什么？

1. **创建 GitHub Actions 工作流** - 自动构建 APK
2. **配置完整 Android 环境** - 详细安装指南
3. **优化移动端 UI** - 适配手机界面
4. **其他需求** - 告诉我！

---

**最后更新:** 2026-02-25
