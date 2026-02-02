import React, { useState } from 'react';
import { CharacterManager } from './features/CharacterManager';
import { LoraManager } from './features/LoraManager';
import { Users, Database } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'characters' | 'loras'>('characters');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', color: 'white' }}>
      {/* Top Navigation */}
      <header style={{
        height: '50px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '2rem',
        background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(8px)'
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
      </header>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'characters' ? <CharacterManager /> : <LoraManager />}
      </div>
    </div>
  );
}

export default App;
