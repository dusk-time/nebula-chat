# Nebula Chat Android APK 构建指南

## 📋 前提条件

### 1. 安装 Android Studio

**下载地址：** https://developer.android.com/studio

**安装时选择：**
- ✅ Android SDK
- ✅ Android SDK Platform (API 31 或更高)
- ✅ Android SDK Build-Tools
- ✅ Android Emulator (可选)

### 2. 安装 Rust Android 编译目标

```bash
# 添加 Android 目标
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
```

### 3. 安装 Tauri CLI (如果还没有)

```bash
npm install -g @tauri-apps/cli
```

---

## 🔧 配置步骤

### 步骤 1: 初始化 Tauri 移动端支持

```bash
cd F:\nebula-chat
npx tauri android init
```

### 步骤 2: 配置 Android 环境

创建 `src-tauri/gen/android/gradle.properties`：

```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
```

### 步骤 3: 修改权限配置

编辑 `src-tauri/capabilities/main.json`，添加移动端权限：

```json
{
  "identifier": "main-capability",
  "description": "Main capability for Nebula Chat",
  "local": true,
  "windows": ["main"],
  "platforms": ["windows", "macOS", "linux", "android", "iOS"],
  "permissions": [
    "core:default",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "core:window:default",
    "shell:allow-execute",
    "dialog:default",
    "fs:default",
    "fs:allow-appdata-read",
    "fs:allow-appdata-write"
  ]
}
```

---

## 📱 构建 APK

### 方法 1: Debug APK (推荐用于测试)

```bash
cd F:\nebula-chat
npx tauri android dev
```

**说明：**
- 构建 debug 版本的 APK
- 自动安装到连接的 Android 设备或模拟器
- 支持热重载

### 方法 2: Release APK (用于发布)

```bash
cd F:\nebula-chat
npx tauri android build --apk
```

**输出位置：**
```
F:\nebula-chat\src-tauri\gen\android\app\build\outputs\apk\release\
├── app-release.apk
└── app-release-universal.apk
```

### 方法 3: 构建 AAB (Google Play 发布)

```bash
cd F:\nebula-chat
npx tauri android build --aab
```

**输出位置：**
```
F:\nebula-chat\src-tauri\gen\android\app\build\outputs\bundle\release\
└── app-release.aab
```

---

## 🔍 常见问题

### 问题 1: 找不到 Android SDK

**错误：** `Android SDK not found`

**解决：**
```bash
# 设置环境变量
setx ANDROID_HOME "C:\Users\你的用户名\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

### 问题 2: 缺少 Rust 目标

**错误：** `no such target: aarch64-linux-android`

**解决：**
```bash
rustup target add aarch64-linux-android
```

### 问题 3: 构建失败 - 权限不足

**错误：** `Permission denied`

**解决：**
- 以管理员身份运行终端
- 或者在 Android Studio 中构建

### 问题 4: 签名问题

**错误：** `Keystore file not found`

**解决（Debug 版本不需要签名）：**
```bash
# Debug 版本会自动使用 debug 签名
npx tauri android dev
```

**发布版本签名：**
```bash
# 生成签名密钥
keytool -genkey -v -keystore nebula-chat.keystore -alias nebula -keyalg RSA -keysize 2048 -validity 10000

# 在 tauri.conf.json 中配置
{
  "bundle": {
    "android": {
      "keystorePath": "nebula-chat.keystore",
      "keystorePassword": "你的密码",
      "keyPassword": "你的密码",
      "keyAlias": "nebula"
    }
  }
}
```

---

## 📲 在手机上测试

### 方法 1: USB 调试

1. **启用开发者选项：**
   - 设置 → 关于手机 → 连续点击"版本号"7 次
   
2. **启用 USB 调试：**
   - 设置 → 开发者选项 → USB 调试 → 开启
   
3. **连接手机：**
   ```bash
   # 检查设备
   adb devices
   
   # 运行应用
   npx tauri android dev
   ```

### 方法 2: 模拟器

1. **创建模拟器：**
   - 打开 Android Studio
   - Tools → Device Manager
   - Create Virtual Device
   - 选择设备（如 Pixel 6）
   - 选择系统镜像（API 31+）
   
2. **启动模拟器并运行：**
   ```bash
   npx tauri android dev
   ```

### 方法 3: 直接安装 APK

1. **构建 APK：**
   ```bash
   npx tauri android build --apk
   ```

2. **传输 APK 到手机：**
   - 通过 USB 传输
   - 或者通过云存储
   
3. **在手机上安装：**
   - 文件管理器中找到 APK
   - 点击安装（可能需要允许"未知来源"）

---

## 🎯 移动端优化建议

### 1. 适配移动界面

修改 `src/App.tsx`，添加响应式设计：

```typescript
// 检测设备类型
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 移动端优化
<div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
```

### 2. 添加移动端权限

编辑 `src-tauri/gen/android/app/src/main/AndroidManifest.xml`：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 3. 优化 P2P 连接

移动端网络环境复杂，建议：
- 使用 WebSocket 中继（如果直连失败）
- 添加网络状态监听
- 优化电池使用

---

## 📊 构建时间参考

| 构建类型 | 首次构建 | 后续构建 | 文件大小 |
|----------|----------|----------|----------|
| Debug APK | ~10 分钟 | ~2 分钟 | ~15-20 MB |
| Release APK | ~15 分钟 | ~3 分钟 | ~8-12 MB |
| AAB | ~15 分钟 | ~3 分钟 | ~10-15 MB |

---

## 🚀 快速开始（推荐）

**最简单的测试方法：**

```bash
# 1. 安装依赖
cd F:\nebula-chat
npm install

# 2. 初始化移动端
npx tauri android init

# 3. 连接手机或启动模拟器

# 4. 运行
npx tauri android dev
```

**等待构建完成，应用会自动安装到设备上！**

---

## 📞 需要帮助？

**官方文档：**
- [Tauri 移动端文档](https://tauri.app/v1/guides/building/mobile)
- [Android 开发文档](https://developer.android.com/docs)

**遇到问题：**
1. 检查错误日志
2. 确保所有依赖已安装
3. 清理构建缓存：`npx tauri android clean`
4. 重新构建

---

**最后更新:** 2026-02-25  
**Tauri 版本:** 2.x  
**Android API:** 31+
