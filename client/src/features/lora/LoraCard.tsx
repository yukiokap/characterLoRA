import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Globe, List, UserPlus, Copy, Info, Trash2, Heart, X, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, updateLoraMeta, uploadLoraPreview, deleteLoraNode, type LoraFile } from '../../api';
import { formatSize } from './utils';

interface LoraCardProps {
    file: LoraFile;
    meta: any;
    favLists?: string[];
    onUpdateMeta: (newMeta: any) => void;
    onShowTags: () => void;
    onShowDescription: () => void;
    onToggleFav: (file: LoraFile, list: string) => void;
    onDelete: () => void;
    scale?: number;
    showPath?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    selectedCount?: number;
    onRegisterCharacter?: () => void;
}

export const LoraCard: React.FC<LoraCardProps> = ({
    file, meta, favLists = [], onUpdateMeta, onShowTags, onShowDescription, onToggleFav, onDelete,
    scale = 1, showPath = false, isSelected = false, onToggleSelect, selectedCount = 0, onRegisterCharacter
}) => {
    const displayName = file.name.replace(/\.(safetensors|pt|ckpt)$/i, '');
    const isXL = file.name.toLowerCase().includes('xl');
    const isPony = file.name.toLowerCase().includes('pony');
    const isIllustrious = file.name.toLowerCase().includes('illust') || file.name.toLowerCase().includes(' il');
    const [triggerWords, setTriggerWords] = useState(meta?.triggerWords || '');
    const [civitaiUrl, setCivitaiUrl] = useState(meta?.civitaiUrl || file.civitaiUrl || '');
    const [isEditing, setIsEditing] = useState(false);
    const [showFavMenu, setShowFavMenu] = useState(false);
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [isEditingAlias, setIsEditingAlias] = useState(false);
    const [tempAlias, setTempAlias] = useState(meta?.alias || '');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check if in any favorite list
    const isInAnyList = (meta?.favoriteLists?.length ?? 0) > 0;

    const effectiveCivitaiUrl = civitaiUrl || (file.modelId ? `https://civitai.com/models/${file.modelId}` : '');

    useEffect(() => {
        if (!isEditing) {
            setTriggerWords(meta?.triggerWords || '');
            setCivitaiUrl(meta?.civitaiUrl || file.civitaiUrl || '');
        }
    }, [meta?.triggerWords, meta?.civitaiUrl, file.civitaiUrl, isEditing]);

    useEffect(() => {
        if (!isEditingAlias) {
            setTempAlias(meta?.alias || '');
        }
    }, [meta?.alias, isEditingAlias]);

    const allImages = useMemo(() => {
        const localPreviewUrl = file.previewPath ? `/api/loras/image?path=${encodeURIComponent(file.previewPath)}&t=${file.mtime ? new Date(file.mtime).getTime() : ''}` : null;
        const civitaiImages = Array.from(new Set([
            ...(file.civitaiImages || []),
            ...(meta?.civitaiImages || [])
        ]));
        return [
            ...(localPreviewUrl ? [localPreviewUrl] : []),
            ...civitaiImages
        ];
    }, [file.previewPath, file.mtime, file.civitaiImages, meta?.civitaiImages]);
    const currentImageUrl = allImages[activeImgIdx] || (allImages.length > 0 ? allImages[0] : null);

    const nextImg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveImgIdx((prev) => (prev + 1) % (allImages.length || 1));
    };

    const prevImg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveImgIdx((prev) => (prev - 1 + allImages.length) % (allImages.length || 1));
    };

    const handleSave = async () => {
        await updateLoraMeta(file.path, { triggerWords, civitaiUrl });
        setIsEditing(false);
        onUpdateMeta({ ...meta, triggerWords, civitaiUrl });
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowFavMenu(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setShowFavMenu(false);
        }, 300);
    };

    const toggleFavMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowFavMenu(!showFavMenu);
    };

    const copyPrompt = () => {
        const name = file.name.replace(/\.(safetensors|pt|ckpt)$/i, '');
        const prompt = `<lora:${name}:1> ${triggerWords}`;
        navigator.clipboard.writeText(prompt);
        toast.success('プロンプトをコピーしました');
    };


    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`警告: 「${file.name}」を本当に削除しますか？\nこの操作は元に戻せません。`)) {
            try {
                await deleteLoraNode(file.path);
                onDelete();
                toast.success('削除しました');
            } catch (error: any) {
                toast.error('削除に失敗しました: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const isNew = file.mtime ? (new Date().getTime() - new Date(file.mtime).getTime()) < (72 * 60 * 60 * 1000) : false;

    useEffect(() => {
        setActiveImgIdx(0);
    }, [file.path]);

    useEffect(() => {
        if (file.modelId && allImages.length <= 1 && !meta?.civitaiImages) {
            const silentFetch = async () => {
                try {
                    const res = await api.get(`/loras/model-description?modelId=${file.modelId}&loraPath=${encodeURIComponent(file.path)}`);
                    if (res.data.images && res.data.images.length > 0) {
                        const images = res.data.images.map((img: any) => img.url).filter(Boolean);
                        if (images.length > 0) {
                            onUpdateMeta({ ...meta, civitaiImages: images });
                        }
                    }
                } catch (e) { }
            };
            silentFetch();
        }
    }, [file.modelId, file.path]);

    return (
        <div
            className="glass-panel lora-card"
            style={{
                display: 'flex', flexDirection: 'column', height: `${320 * scale}px`, cursor: 'pointer',
                position: 'relative', padding: 0, border: 'none',
                zIndex: showFavMenu ? 100 : 1,
                overflow: showFavMenu ? 'visible' : 'hidden'
            }}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('sourcePath', file.path);
                if (isSelected && selectedCount > 1) {
                    e.dataTransfer.setData('isBulk', 'true');
                }
                e.dataTransfer.effectAllowed = 'move';
            }}
        >
            <div
                onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.style.boxShadow = 'inset 0 0 0 4px var(--accent)';
                    }
                }}
                onDragLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                }}
                onDrop={async (e) => {
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.style.boxShadow = 'none';
                        const fileBlob = e.dataTransfer.files[0];
                        if (fileBlob.type.startsWith('image/') || fileBlob.name.toLowerCase().endsWith('.mp4')) {
                            try {
                                await uploadLoraPreview(file.path, fileBlob);
                                onDelete();
                                toast.success('プレビュー画像を更新しました');
                            } catch (err: any) {
                                toast.error('アップロードに失敗しました: ' + err.message);
                            }
                        }
                    }
                }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#000', transition: 'box-shadow 0.2s' }}
            >
                {currentImageUrl ? (
                    currentImageUrl.toLowerCase().endsWith('.mp4') ? (
                        <video
                            src={currentImageUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            draggable={false}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                            onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.retried) {
                                    target.dataset.retried = 'true';
                                    setTimeout(() => {
                                        const url = new URL(target.src);
                                        url.searchParams.set('retry', Date.now().toString());
                                        target.src = url.toString();
                                    }, 1000);
                                }
                            }}
                        />
                    ) : (
                        <img
                            src={currentImageUrl}
                            alt={file.name}
                            draggable={false}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                            onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.retried) {
                                    target.dataset.retried = 'true';
                                    setTimeout(() => {
                                        const url = new URL(target.src);
                                        url.searchParams.set('retry', Date.now().toString());
                                        target.src = url.toString();
                                    }, 1000);
                                }
                            }}
                        />
                    )
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                        No Preview<br />Drop Image/MP4 to upload
                    </div>
                )}
            </div>

            {allImages.length > 1 && (
                <div className="nav-arrows" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
                    <button
                        onClick={prevImg}
                        className="nav-arrow-btn"
                        style={{
                            position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 100%)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px',
                            width: '36px', height: '36px',
                            color: 'white',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={nextImg}
                        className="nav-arrow-btn"
                        style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 100%)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px',
                            width: '36px', height: '36px',
                            color: 'white',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ChevronRight size={24} strokeWidth={2.5} />
                    </button>

                    <div style={{ position: 'absolute', bottom: '90px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '5px' }}>
                        {allImages.map((_, i) => (
                            <div key={i} style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: i === activeImgIdx ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                transition: 'all 0.2s'
                            }} />
                        ))}
                    </div>
                </div>
            )}

            <div
                style={{ position: 'absolute', top: '42px', left: '10px', zIndex: 60 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    onClick={toggleFavMenu}
                    style={{
                        background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                        width: '24px', height: '24px',
                        padding: 0, color: isInAnyList ? '#ef4444' : 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <Heart size={14} fill={isInAnyList ? '#ef4444' : 'none'} />
                </button>

                {showFavMenu && (
                    <div
                        style={{
                            position: 'absolute', top: '0', left: '100%', marginLeft: '8px',
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', padding: '0.5rem', zIndex: 61,
                            width: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
                            リストに追加
                        </div>
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {favLists.map(list => {
                                const isActive = meta?.favoriteLists?.includes(list);
                                return (
                                    <div
                                        key={list}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleFav(file, list);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '4px 6px', cursor: 'pointer', fontSize: '0.8rem',
                                            color: isActive ? '#fca5a5' : 'white',
                                            borderRadius: '4px',
                                            transition: 'background 0.2s'
                                        }}
                                        className="fav-menu-item"
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Heart size={12} fill={isActive ? "currentColor" : "none"} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list}</span>
                                    </div>
                                );
                            })}
                            {favLists.length === 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '4px' }}>リストがありません</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', top: '10px', left: '42px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {isNew && <span style={{ background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>NEW</span>}
                    <span style={{ background: '#2563eb', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>LORA</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {isIllustrious && <span style={{ background: '#4f46e5', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Illustrious</span>}
                    {isXL && <span style={{ background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>XL</span>}
                    {isPony && <span style={{ background: '#db2777', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>Pony</span>}
                </div>
            </div>

            <div
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
                style={{
                    position: 'absolute', top: '10px', left: '10px', zIndex: 60,
                    width: '24px', height: '24px', borderRadius: '4px',
                    background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
                    border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
            >
                {isSelected && <X size={16} color="white" strokeWidth={3} />}
            </div>

            <div className="card-actions" style={{
                zIndex: 110,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
                width: 'auto',
                padding: '4px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)'
            }}>
                {effectiveCivitaiUrl && (
                    <a href={effectiveCivitaiUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="action-btn" title="Civitaiで開く" style={{ color: '#fff' }}>
                        <Globe size={18} strokeWidth={2.5} />
                    </a>
                )}
                <button onClick={(e) => { e.stopPropagation(); onShowTags(); }} title="タグ一覧を表示" className="action-btn" style={{ color: '#fff' }}>
                    <List size={18} strokeWidth={2.5} />
                </button>
                {onRegisterCharacter && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRegisterCharacter(); }}
                        title="キャラクターとして登録"
                        className="action-btn"
                        style={{ color: '#fff' }}
                    >
                        <UserPlus size={18} strokeWidth={2.5} />
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); copyPrompt(); }} title="プロンプトをコピー" className="action-btn" style={{ color: '#fff' }}>
                    <Copy size={18} strokeWidth={2.5} />
                </button>
                {(file.modelId || civitaiUrl || meta?.civitaiUrl) && (
                    <button onClick={(e) => { e.stopPropagation(); onShowDescription(); }} title="説明文を表示" className="action-btn" style={{ color: '#fff' }}>
                        <Info size={18} strokeWidth={2.5} />
                    </button>
                )}
                <button onClick={handleDelete} title="ファイルを削除" className="action-btn-danger" style={{ color: '#ff4d4d' }}>
                    <Trash2 size={18} strokeWidth={2.5} />
                </button>
            </div>

            <div
                className="lora-info-overlay"
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)',
                    padding: '30px 10px 10px 10px', zIndex: 1,
                    display: 'flex', flexDirection: 'column', gap: '2px',
                    transition: 'all 0.3s ease'
                }}
                onClick={(e) => {
                    if (!isEditing) {
                        e.stopPropagation();
                        setIsEditing(true);
                    }
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px' }}>
                    <div
                        style={{
                            fontWeight: 'bold', fontSize: '0.9rem', color: 'white',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '5px', flex: 1
                        }}
                    >
                        {isEditingAlias ? (
                            <input
                                autoFocus
                                value={tempAlias}
                                onChange={e => setTempAlias(e.target.value)}
                                onBlur={async () => {
                                    await updateLoraMeta(file.path, { alias: tempAlias });
                                    onUpdateMeta({ ...meta, alias: tempAlias });
                                    setIsEditingAlias(false);
                                }}
                                onKeyDown={async e => {
                                    if (e.key === 'Enter') {
                                        await updateLoraMeta(file.path, { alias: tempAlias });
                                        onUpdateMeta({ ...meta, alias: tempAlias });
                                        setIsEditingAlias(false);
                                    }
                                }}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)',
                                    color: 'white', fontSize: '0.8rem', padding: '1px 4px', borderRadius: '4px'
                                }}
                            />
                        ) : (
                            <>
                                <span
                                    style={{
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onShowDescription(); }}
                                >
                                    {meta?.alias || displayName}
                                </span>
                                <div style={{ flexShrink: 0, display: 'flex', marginLeft: 'auto' }}>
                                    <Edit2
                                        size={14}
                                        style={{ opacity: 0.7, cursor: 'pointer', padding: '4px', margin: '-4px' }}
                                        onClick={(e) => { e.stopPropagation(); setIsEditingAlias(true); }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                        {formatSize(file.size)}
                    </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {showPath ? (file.path.split(/[\\\/]/).slice(0, -1).join('/') || 'Root') : file.name}
                </div>

                {isEditing ? (
                    <div style={{ marginTop: '5px' }}>
                        <textarea
                            autoFocus
                            className="trigger-textarea"
                            value={triggerWords}
                            onChange={e => setTriggerWords(e.target.value)}
                            onBlur={handleSave}
                            placeholder="Trigger Words..."
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px', color: 'white', fontSize: '0.75rem', padding: '4px'
                            }}
                            rows={3}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <div
                        className="trigger-words"
                        style={{
                            fontSize: '0.75rem', color: triggerWords ? '#cbd5e1' : 'rgba(255,255,255,0.3)',
                            marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {triggerWords ? `Triggers: ${triggerWords}` : 'Click to add triggers...'}
                    </div>
                )}
            </div>
        </div>
    );
};
