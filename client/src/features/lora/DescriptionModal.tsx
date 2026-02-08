import React from 'react';
import { X, Info, RefreshCw, Globe, Copy } from 'lucide-react';

interface DescriptionModalProps {
    file: any;
    meta: any;
    loading: boolean;
    images: any[];
    description?: string | null;
    onClose: () => void;
    onRefresh: () => void;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({
    file, meta, loading, images, description, onClose, onRefresh
}) => {
    if (!file) return null;

    const handleCopyPrompt = (prompt: string) => {
        if (prompt) {
            navigator.clipboard.writeText(prompt);
            alert('Prompt copied!');
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }} onClick={onClose}>
            <div className="glass-panel" style={{
                maxWidth: '800px', width: '100%', maxHeight: '80vh',
                display: 'flex', flexDirection: 'column', padding: '2rem',
                position: 'relative', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X />
                </button>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Info color="var(--accent)" /> モデルの説明
                        {file?.modelId && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>(ID: {file.modelId})</span>}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            style={{
                                background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
                                fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <RefreshCw size={14} className={loading ? 'spin' : ''} /> 最新版を確認
                        </button>
                        {(file?.civitaiUrl || meta?.civitaiUrl) && (
                            <a
                                href={meta?.civitaiUrl || file?.civitaiUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Globe size={14} /> Civitaiで見る
                            </a>
                        )}
                    </div>
                </h2>
                {!loading && images.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Sample Images (Click to copy prompt)</div>
                        <div style={{ display: 'flex', gap: '1.2rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'thin' }}>
                            {images.map((img, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flexShrink: 0, width: '180px', position: 'relative',
                                        borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        transition: 'transform 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    onClick={() => handleCopyPrompt(img.meta?.prompt)}
                                    title={img.meta?.prompt ? 'Click to copy generation prompt' : 'No prompt available'}
                                >
                                    <img src={img.url} style={{ width: '100%', height: '220px', objectFit: 'cover' }} alt="Sample" />
                                    {img.meta?.prompt && (
                                        <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '4px', background: 'rgba(0,0,0,0.7)', borderTopLeftRadius: '8px' }}>
                                            <Copy size={14} color="white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div
                    className="description-content"
                    style={{
                        overflowY: 'auto', flex: 1, paddingRight: '1rem',
                        color: '#e2e8f0', lineHeight: 1.6, fontSize: '1rem'
                    }}
                    dangerouslySetInnerHTML={{
                        __html: loading
                            ? '<div style="display:flex;justify-content:center;padding:2rem;">Loading description from Civitai...</div>'
                            : (description || file.description || '<div style="text-align:center;padding:2rem;color:#64748b;">No description available for this model.</div>')
                    }}
                />
            </div>
        </div>
    );
};
