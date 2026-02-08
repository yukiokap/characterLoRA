import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Copy, Plus, Edit2 } from 'lucide-react';
import { api, updateLoraMeta, uploadLoraTagImage, type LoraFile } from '../../api';

// Helper for path normalization
const normalizePath = (p: string) => p.replace(/\\/g, '/');

interface TagSidebarProps {
    file: LoraFile;
    meta: any;
    onUpdateMeta: (newMeta: any) => void;
    onClose: () => void;
}

export const TagSidebar: React.FC<TagSidebarProps> = ({ file, meta, onUpdateMeta, onClose }) => {
    const [filter, setFilter] = useState('');
    const [strength, setStrength] = useState(1.0);
    const [newTag, setNewTag] = useState('');
    const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
    const [editingTagValue, setEditingTagValue] = useState('');
    const [localTriggerWords, setLocalTriggerWords] = useState(meta?.triggerWords || '');
    const [includeLoraPrefix, setIncludeLoraPrefix] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [civitaiTags, setCivitaiTags] = useState<string[]>(file.trainedWords || []);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    const previewUrl = file.previewPath ? `/api/loras/image?path=${encodeURIComponent(file.previewPath)}&t=${file.mtime ? new Date(file.mtime).getTime() : ''}` : null;

    const customTags = meta?.customTags || [];

    // Combine and remove duplicates
    const allSuggestions = Array.from(new Set([...civitaiTags, ...customTags]));

    const fetchCivitaiInfo = async (forceRefresh = false) => {
        const modelId = file.modelId || (meta?.civitaiUrl?.match(/models\/(\d+)/)?.[1]);
        if (!modelId) return;

        setIsFetchingInfo(true);
        try {
            const res = await api.get(`/loras/model-description?modelId=${modelId}&loraPath=${encodeURIComponent(file.path)}${forceRefresh ? '&refresh=true' : ''}`);
            if (res.data.trainedWords) {
                setCivitaiTags(res.data.trainedWords);
            }
        } catch (e) {
            console.error("Failed to fetch Civitai info in sidebar", e);
        } finally {
            setIsFetchingInfo(false);
        }
    };

    useEffect(() => {
        fetchCivitaiInfo();
    }, [file.path, file.modelId]);

    useEffect(() => {
        setLocalTriggerWords(meta?.triggerWords || '');
    }, [meta?.triggerWords]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleSaveTriggerWords = async () => {
        const normPath = normalizePath(file.path);
        await updateLoraMeta(normPath, { triggerWords: localTriggerWords });
        onUpdateMeta({ ...meta, triggerWords: localTriggerWords });
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        const tag = newTag.trim();
        if (customTags.includes(tag)) {
            setNewTag('');
            return;
        }
        const updatedCustomTags = [...customTags, tag];
        const normPath = normalizePath(file.path);
        await updateLoraMeta(normPath, { customTags: updatedCustomTags });
        onUpdateMeta({ ...meta, customTags: updatedCustomTags });
        setNewTag('');
    };

    const handleStartEditTag = (idx: number, val: string) => {
        setEditingTagIdx(idx);
        setEditingTagValue(val);
    };

    const handleSaveEditTag = async (oldTag: string) => {
        const val = editingTagValue.trim();
        if (!val || val === oldTag) {
            setEditingTagIdx(null);
            return;
        }
        const updatedCustomTags = customTags.map((t: string) => t === oldTag ? val : t);
        const normPath = normalizePath(file.path);
        await updateLoraMeta(normPath, { customTags: updatedCustomTags });
        onUpdateMeta({ ...meta, customTags: updatedCustomTags });
        setEditingTagIdx(null);
    };

    const handleRemoveTag = async (tag: string) => {
        const updatedCustomTags = customTags.filter((t: string) => t !== tag);
        const normPath = normalizePath(file.path);
        await updateLoraMeta(normPath, { customTags: updatedCustomTags });
        onUpdateMeta({ ...meta, customTags: updatedCustomTags });
    };

    const handleDropTagImage = async (e: React.DragEvent, tagName: string) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            try {
                const normPath = normalizePath(file.path);
                const res = await uploadLoraTagImage(normPath, tagName, droppedFile);
                if (res.success) {
                    const updatedTagImages = { ...(meta?.tagImages || {}), [tagName]: res.imagePath };
                    await updateLoraMeta(normPath, { tagImages: updatedTagImages });
                    onUpdateMeta({ ...meta, tagImages: updatedTagImages });
                }
            } catch (err) {
                console.error('Failed to upload tag image', err);
            }
        }
    };

    const getCleanName = () => file.name.replace(/\.(safetensors|pt|ckpt)$/i, '');
    const loraPrefix = `<lora:${getCleanName()}:${strength}>`;

    const toggleTagSelection = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleCopySelected = () => {
        const parts = [];
        if (includeLoraPrefix) parts.push(loraPrefix);
        if (localTriggerWords.trim()) parts.push(localTriggerWords.trim());
        if (selectedTags.length > 0) parts.push(selectedTags.join(', '));

        const finalPrompt = parts.join(' ');
        handleCopy(finalPrompt);
    };

    const handleSelectAll = () => {
        if (selectedTags.length === allSuggestions.length) {
            setSelectedTags([]);
        } else {
            setSelectedTags([...allSuggestions]);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '350px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            boxShadow: '-4px 0 10px rgba(0,0,0,0.3)', zIndex: 1000,
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Tags & Info</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => fetchCivitaiInfo(true)}
                        disabled={isFetchingInfo}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title="Civitaiから再取得"
                    >
                        <RefreshCw size={16} className={isFetchingInfo ? 'spin' : ''} />
                    </button>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
                {previewUrl && (
                    <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={previewUrl} alt={file.name} style={{ width: '100%', display: 'block' }} />
                    </div>
                )}

                <div style={{ marginBottom: '1rem', wordBreak: 'break-all', fontWeight: 'bold' }}>
                    {file.name}
                </div>

                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Trigger Words</span>
                            <div onClick={() => handleCopy(localTriggerWords)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Copy size={12} />
                            </div>
                        </div>
                        <textarea
                            value={localTriggerWords}
                            onChange={e => setLocalTriggerWords(e.target.value)}
                            onBlur={handleSaveTriggerWords}
                            placeholder="Main trigger words..."
                            style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', fontSize: '0.85rem', resize: 'none' }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>LoRA Strength</span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.8 }}>
                                    <input
                                        type="checkbox"
                                        checked={includeLoraPrefix}
                                        onChange={e => setIncludeLoraPrefix(e.target.checked)}
                                        style={{ cursor: 'pointer', width: '12px', height: '12px' }}
                                    />
                                    Include LoRA
                                </label>
                            </div>
                            <span>{strength.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={strength}
                            onChange={e => setStrength(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                    <div>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Register New Tag</div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input
                                placeholder="Add custom tag..."
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                            />
                            <button
                                onClick={handleAddTag}
                                style={{ padding: '8px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Filter Suggestions</span>
                            <button
                                onClick={handleSelectAll}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                            >
                                {selectedTags.length === allSuggestions.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <input
                            placeholder="Filter tags..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allSuggestions
                        .filter(w => w.toLowerCase().includes(filter.toLowerCase()))
                        .map((word, idx) => {
                            const isCustom = customTags.includes(word);
                            const isEditingThis = editingTagIdx === idx;
                            return (
                                <div
                                    key={idx}
                                    className="glass-panel"
                                    onDragOver={e => {
                                        e.preventDefault();
                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                                    }}
                                    onDragLeave={e => {
                                        e.currentTarget.style.borderColor = isCustom ? 'rgba(56, 189, 248, 0.3)' : 'transparent';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                    onDrop={e => {
                                        e.currentTarget.style.borderColor = isCustom ? 'rgba(56, 189, 248, 0.3)' : 'transparent';
                                        e.currentTarget.style.background = 'transparent';
                                        handleDropTagImage(e, word);
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        border: isCustom ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        gap: '12px'
                                    }}
                                    onClick={() => !isEditingThis && toggleTagSelection(word)}
                                >
                                    <div style={{ zIndex: 5, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTags.includes(word)}
                                            onChange={() => toggleTagSelection(word)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                    </div>
                                    {meta?.tagImages?.[word] && (
                                        <div
                                            className="tag-image-bg"
                                            style={{
                                                position: 'absolute', right: 0, top: 0, bottom: 0, width: '180px',
                                                opacity: 0.5, pointerEvents: 'none', zIndex: 0,
                                                maskImage: 'linear-gradient(to left, black 60%, transparent 100%)',
                                                WebkitMaskImage: 'linear-gradient(to left, black 60%, transparent 100%)',
                                                transition: 'opacity 0.2s'
                                            }}
                                        >
                                            <img
                                                src={`/api/loras/image?path=${encodeURIComponent(meta.tagImages[word])}`}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 1 }}>
                                        {/* Action Buttons at the Top Right */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            display: 'flex',
                                            gap: '4px',
                                            zIndex: 2
                                        }}>
                                            {!isEditingThis && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(includeLoraPrefix ? `${loraPrefix}, ${word}` : word); }}
                                                    style={{
                                                        background: 'rgba(15, 23, 42, 0.9)',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        padding: '3px',
                                                        cursor: 'pointer',
                                                        color: 'white',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    className="tag-action-btn"
                                                    title="コピー"
                                                >
                                                    <Copy size={13} />
                                                </button>
                                            )}
                                            {isCustom && !isEditingThis && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStartEditTag(idx, word); }}
                                                        style={{
                                                            background: 'rgba(15, 23, 42, 0.9)',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                                            padding: '3px',
                                                            cursor: 'pointer',
                                                            color: 'var(--accent)',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        className="tag-action-btn"
                                                        title="編集"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveTag(word); }}
                                                        style={{
                                                            background: 'rgba(15, 23, 42, 0.9)',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                                            padding: '3px',
                                                            cursor: 'pointer',
                                                            color: '#ff4d4d',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        className="tag-action-btn"
                                                        title="削除"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Tag Text Content (Lower part or full if not editing) */}
                                        <div style={{ marginTop: (!isEditingThis && (isCustom || true)) ? '12px' : '0' }}>
                                            {isEditingThis ? (
                                                <textarea
                                                    autoFocus
                                                    value={editingTagValue}
                                                    onChange={e => setEditingTagValue(e.target.value)}
                                                    onBlur={() => handleSaveEditTag(word)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSaveEditTag(word);
                                                        }
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        background: 'rgba(0,0,0,0.5)',
                                                        border: '1px solid var(--accent)',
                                                        color: 'white',
                                                        padding: '8px',
                                                        fontSize: '0.9rem',
                                                        width: '100%',
                                                        minHeight: '100px',
                                                        borderRadius: '4px',
                                                        resize: 'vertical',
                                                        fontFamily: 'inherit',
                                                        lineHeight: '1.4'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ fontWeight: meta?.tagImages?.[word] ? 600 : 400, wordBreak: 'break-all' }}>{word}</span>
                                                    {isCustom && <span style={{ fontSize: '0.6rem', background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>USER</span>}
                                                    {civitaiTags.includes(word) && <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>CIVITAI</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    {allSuggestions.length === 0 && (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                            No tags registered.
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    onClick={handleCopySelected}
                    style={{ width: '100%', padding: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Copy Selected Prompt ({selectedTags.length})
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {includeLoraPrefix ? 'LoRA prefix included once' : 'No LoRA prefix'}
                </div>
            </div>
        </div>
    );
};
