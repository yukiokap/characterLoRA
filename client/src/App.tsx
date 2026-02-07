import { useState, useEffect } from 'react';
import { CharacterManager } from './features/CharacterManager';
import { LoraManager } from './features/LoraManager';
import { WildcardManager } from './features/WildcardManager';
import { PromptGenerator } from './features/PromptGenerator';
import { TagComposer } from './features/TagComposer';
import { Users, Database, Sparkles, Tags, FileText, Settings, RefreshCw } from 'lucide-react';
import { getAppConfig, updateAppConfig } from './api';

function App() {
  const [activeTab, setActiveTab] = useState<'characters' | 'loras' | 'wildcards' | 'batch' | 'composer'>('characters');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [config, setConfig] = useState<{ loraDir?: string; wildcardDir?: string; geminiApiKey?: string }>({});

  useEffect(() => {
    // Load existing config
    getAppConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.geminiApiKey) setApiKey(cfg.geminiApiKey);
    });
  }, []);

  const handleRefresh = () => {
    // Dispatch global update events
    window.dispatchEvent(new CustomEvent('character-update'));
    window.dispatchEvent(new CustomEvent('lora-update'));
    window.dispatchEvent(new CustomEvent('wildcard-update'));
    console.log("Global refresh triggered");
  };

  const saveApiKey = async () => {
    try {
      await updateAppConfig({ ...config, geminiApiKey: apiKey });
      alert('設定を保存しました');
      setShowSettings(false);
      // Trigger refresh to reload with new directories
      handleRefresh();
    } catch (err) {
      alert('保存に失敗しました');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', color: 'white' }}>
      {/* Top Navigation */}
      <header style={{
        height: '50px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '2rem',
        background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(8px)',
        flexShrink: 0
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginRight: '1rem' }}>
          AiManager
        </div>

        <button
          onClick={() => setActiveTab('characters')}
          style={{
            background: 'transparent', border: 'none',
            color: activeTab === 'characters' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'characters' ? 600 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            height: '100%', borderBottom: activeTab === 'characters' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Users size={18} /> Characters
        </button>

        <button
          onClick={() => setActiveTab('loras')}
          style={{
            background: 'transparent', border: 'none',
            color: activeTab === 'loras' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'loras' ? 600 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            height: '100%', borderBottom: activeTab === 'loras' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Database size={18} /> LoRA Library
        </button>

        <button
          onClick={() => setActiveTab('wildcards')}
          style={{
            background: 'transparent', border: 'none',
            color: activeTab === 'wildcards' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'wildcards' ? 600 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            height: '100%', borderBottom: activeTab === 'wildcards' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <FileText size={18} /> Wildcards
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          style={{
            background: 'transparent', border: 'none',
            color: activeTab === 'batch' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'batch' ? 600 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            height: '100%', borderBottom: activeTab === 'batch' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Sparkles size={18} /> Batch Generation
        </button>

        <button
          onClick={() => setActiveTab('composer')}
          style={{
            background: 'transparent', border: 'none',
            color: activeTab === 'composer' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'composer' ? 600 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            height: '100%', borderBottom: activeTab === 'composer' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Tags size={18} /> Tag Composer
        </button>

        {/* Global Toolbar */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            title="すべてのデータを再読み込み"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="AI・グローバル設定"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{ width: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={24} /> グローバル設定
            </h2>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>LoRAディレクトリ</label>
              <input
                type="text"
                value={config.loraDir || ''}
                onChange={e => setConfig({ ...config, loraDir: e.target.value })}
                placeholder="C:\Users\...\Models\Lora"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                LoRAファイルが保存されているフォルダを指定してください。
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Wildcardディレクトリ</label>
              <input
                type="text"
                value={config.wildcardDir || ''}
                onChange={e => setConfig({ ...config, wildcardDir: e.target.value })}
                placeholder="C:\...\sd-dynamic-prompts\wildcards"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Wildcardファイルが保存されているフォルダを指定してください。
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Gemini API キー</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AI自動命名・タグ仕分けに使用"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                ※キーはサーバー側の config.json に保存されます。
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowSettings(false)}>閉じる</button>
              <button onClick={saveApiKey} className="btn-primary">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: activeTab === 'characters' ? 'contents' : 'none' }}>
          <CharacterManager />
        </div>
        <div style={{ display: activeTab === 'loras' ? 'contents' : 'none' }}>
          <LoraManager />
        </div>
        <div style={{ display: activeTab === 'wildcards' ? 'contents' : 'none' }}>
          <WildcardManager />
        </div>
        <div style={{ display: activeTab === 'batch' ? 'contents' : 'none' }}>
          <PromptGenerator />
        </div>
        <div style={{ display: activeTab === 'composer' ? 'contents' : 'none' }}>
          <TagComposer />
        </div>
      </div>
    </div>
  );
}

export default App;
