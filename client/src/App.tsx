import { useState } from 'react';
import { CharacterManager } from './features/CharacterManager';
import { LoraManager } from './features/LoraManager';
import { PromptGenerator } from './features/PromptGenerator';
import { Users, Database, Sparkles } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'characters' | 'loras' | 'batch'>('characters');

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
      </header>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: activeTab === 'characters' ? 'contents' : 'none' }}>
          <CharacterManager />
        </div>
        <div style={{ display: activeTab === 'loras' ? 'contents' : 'none' }}>
          <LoraManager />
        </div>
        <div style={{ display: activeTab === 'batch' ? 'contents' : 'none' }}>
          <PromptGenerator />
        </div>
      </div>
    </div>
  );
}

export default App;
