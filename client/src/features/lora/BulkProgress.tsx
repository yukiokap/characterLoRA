import React from 'react';
import { Users, Sparkles } from 'lucide-react';

interface BulkProgressProps {
    progress: {
        current: number;
        total: number;
        name: string;
        isAnalyzing?: boolean;
    } | null;
}

export const BulkProgress: React.FC<BulkProgressProps> = ({ progress }) => {
    if (!progress) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                    }}>
                        <Users size={32} />
                    </div>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>キャラクター一括登録中</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {progress.current} / {progress.total} アイテム処理中...
                </p>

                <div style={{
                    fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px'
                }}>
                    {progress.name}
                </div>

                {progress.isAnalyzing && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        color: '#fb923c', fontSize: '0.8rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite'
                    }}>
                        <Sparkles size={14} className="spin" />
                        AIがプロンプトを分析しています...
                    </div>
                )}

                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                        height: '100%', background: 'linear-gradient(to right, #38bdf8, #818cf8)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                <style>{`
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                    .spin {
                        animation: spin 2s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};
