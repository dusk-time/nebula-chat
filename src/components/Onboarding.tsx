import { useState } from 'react';
import { generateIdentity } from '../lib/api';

interface OnboardingProps {
  onComplete: (secretKey: string, publicKey: string, name: string) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [generatedIdentity, setGeneratedIdentity] = useState<any>(null);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');

  async function handleGenerateIdentity() {
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    try {
      console.log('🚀 调用 generateIdentity API...');
      const identity = await generateIdentity(username);
      console.log('✅ 收到身份数据:', JSON.stringify(identity, null, 2));
      setGeneratedIdentity(identity);
      setStep(2);
      setError('');
    } catch (err: any) {
      console.error('❌ 生成失败:', err);
      setError('生成失败：' + err.message);
    }
  }

  function handleCopyIdentity() {
    if (generatedIdentity) {
      navigator.clipboard.writeText(JSON.stringify(generatedIdentity, null, 2));
      alert('已复制到剪贴板！');
    }
  }

  function handleImport() {
    try {
      const identity = JSON.parse(importText);
      if (identity.public_key && identity.name) {
        // 这里需要调用导入 API
        onComplete('', identity.public_key, identity.name);
      } else {
        setError('无效的身份格式');
      }
    } catch (err: any) {
      setError('解析失败：' + err.message);
    }
  }

  function handleContinueWithGenerated() {
    if (generatedIdentity) {
      // 调试：打印完整的身份数据
      console.log('🔍 身份数据:', JSON.stringify(generatedIdentity, null, 2));
      
      // 使用真实的密钥（从后端生成）
      // 后端返回的是 secret_key（蛇形命名）
      const secretKey = generatedIdentity.secret_key || generatedIdentity.secretKey;
      
      if (!secretKey || secretKey === 'generated-secret-key') {
        console.error('❌ 无效的密钥:', secretKey);
        alert('❌ 身份生成失败：密钥格式错误\n\n请刷新页面重试');
        return;
      }
      
      console.log('🔑 使用的密钥:', secretKey.substring(0, 30) + '...');
      console.log('   密钥长度:', secretKey.length);
      console.log('   密钥前缀:', secretKey.substring(0, 10));
      
      onComplete(secretKey, generatedIdentity.public_key, generatedIdentity.name);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌌</div>
          <h1 className="text-3xl font-bold text-white mb-2">Nebula Chat</h1>
          <p className="text-gray-400">去中心化 P2P 加密聊天</p>
        </div>

        {/* 步骤 1: 创建或导入身份 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">创建你的身份</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="输入你的昵称"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleGenerateIdentity}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  生成新身份
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">或</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  导入已有身份
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* 步骤 2: 备份身份 */}
        {step === 2 && generatedIdentity && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">✅ 身份创建成功！</h2>
              <p className="text-gray-400 text-sm mb-4">
                请务必备份你的身份信息。这是你在 Nebula Chat 中的唯一标识。
              </p>

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">你的身份信息</label>
                  <button
                    onClick={handleCopyIdentity}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    📋 复制
                  </button>
                </div>
                <pre className="text-xs text-green-400 overflow-auto max-h-40 bg-gray-950 p-2 rounded">
                  {JSON.stringify(generatedIdentity, null, 2)}
                </pre>
              </div>

              <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg text-sm mb-4">
                ⚠️ <strong>重要：</strong>请妥善保存以上信息。如果丢失，将无法恢复你的身份！
              </div>

              <button
                onClick={handleContinueWithGenerated}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                我已备份，继续
              </button>
            </div>
          </div>
        )}

        {/* 步骤 3: 导入身份 */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">导入已有身份</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">粘贴身份信息 (JSON)</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='{"public_key": "...", "name": "..."}'
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    导入
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* 功能特点 */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">🔐</div>
              <div className="text-xs text-gray-400">端到端加密</div>
            </div>
            <div>
              <div className="text-2xl mb-1">🌐</div>
              <div className="text-xs text-gray-400">去中心化</div>
            </div>
            <div>
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-xs text-gray-400">P2P 直连</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
