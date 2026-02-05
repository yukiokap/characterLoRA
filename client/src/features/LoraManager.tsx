import React, { useEffect, useState, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { getLoraFiles, updateLoraMeta, updateLoraMetaBatch, createLoraFolder, getAppConfig, updateAppConfig, renameLoraNode, deleteLoraNode, moveLoraNode, moveLoraNodesBatch, uploadLoraPreview, getLists, saveLists, renameList, deleteList, uploadLoraTagImage, type LoraFile, type LoraMeta, api } from '../api';
import { Search, Folder, Settings, Heart, ChevronRight, ChevronDown, Copy, Plus, Globe, List, X, Edit2, Trash2, ZoomIn, ZoomOut, ChevronLeft, Info, RefreshCw } from 'lucide-react';

const normalizePath = (p: string) => p.replace(/\\/g, '/');

const isSamePath = (p1: string, p2: string) => {
    if (!p1 || !p2) return false;
    return normalizePath(p1).toLowerCase() === normalizePath(p2).toLowerCase();
};

const FolderTreeItem = ({ item, level = 0, onSelect, currentPath, onUpdate, selectedCount = 0, pinnedFolders = [], onTogglePin }: { item: LoraFile, level?: number, onSelect: (path: string) => void, currentPath: string, onUpdate: () => void, selectedCount?: number, pinnedFolders?: string[], onTogglePin?: (path: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(item.name);
    const isPinned = pinnedFolders.includes(item.path);

    const togglePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTogglePin?.(item.path);
    };

    if (item.type !== 'directory') return null;

    const handleRename = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isEditing) {
            try {
                await renameLoraNode(item.path, newName);
                onUpdate();
                setIsEditing(false);
            } catch (err: any) {
                alert('Rename failed: ' + (err.response?.data?.error || err.message));
            }
        } else {
            setIsEditing(true);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete folder "${item.name}" and all its contents?`)) {
            try {
                await deleteLoraNode(item.path);
                onUpdate();
            } catch (err: any) {
                alert('Delete failed: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    return (
        <div style={{ marginLeft: `${level * 12}px` }}>
            <div
                onClick={() => onSelect(item.path)}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('sourcePath', item.path);
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)';
                }}
                onDragLeave={(e) => {
                    e.currentTarget.style.background = isSamePath(item.path, currentPath) ? 'rgba(56, 189, 248, 0.2)' : 'transparent';
                }}
                onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.background = isSamePath(item.path, currentPath) ? 'rgba(56, 189, 248, 0.2)' : 'transparent';

                    const sourcePath = e.dataTransfer.getData('sourcePath');
                    const isBulk = e.dataTransfer.getData('isBulk') === 'true';

                    if (sourcePath && !isSamePath(sourcePath, item.path)) {
                        try {
                            if (isBulk) {
                                (window as any).dispatchEvent(new CustomEvent('lora-bulk-move', { detail: { destPath: item.path } }));
                            } else {
                                // Confirmation for folder move to prevent accidents
                                if (confirm(`Move "${sourcePath.split(/[\\\/]/).pop()}" to "${item.name}"?`)) {
                                    await moveLoraNode(sourcePath, item.path);
                                    onUpdate();
                                }
                            }
                        } catch (err: any) {
                            alert('Move failed: ' + (err.response?.data?.error || err.message));
                        }
                    }
                }}
                style={{
                    padding: '4px', cursor: 'grab', borderRadius: '4px',
                    background: isSamePath(item.path, currentPath) ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: isSamePath(item.path, currentPath) ? '#7dd3fc' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap', position: 'relative'
                }}
            >
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} style={{ display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <Folder size={14} style={{ flexShrink: 0 }} />
                {isEditing ? (
                    <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onBlur={() => setIsEditing(false)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(e as any)}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', color: 'white', padding: '0 4px', fontSize: '0.85rem', width: '100px' }}
                    />
                ) : (
                    <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                )}

                <div className="folder-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    {selectedCount > 0 ? (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Move ${selectedCount} items to "${item.name}"?`)) {
                                    try {
                                        (window as any).dispatchEvent(new CustomEvent('lora-bulk-move', { detail: { destPath: item.path } }));
                                    } catch (err) { }
                                }
                            }}
                            style={{
                                background: 'var(--accent)', color: 'white', border: 'none',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem'
                            }}
                        >
                            ここに移動
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={togglePin}
                                style={{
                                    padding: '2px', background: 'transparent', border: 'none',
                                    color: isPinned ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                                title={isPinned ? "ピン留め解除" : "ピン留め"}
                            >
                                <Settings size={12} style={{ color: isPinned ? 'var(--accent)' : 'inherit' }} />
                            </button>
                            <button onClick={handleRename} style={{ padding: '2px', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                                <Edit2 size={12} />
                            </button>
                            <button onClick={handleDelete} style={{ padding: '2px', background: 'transparent', border: 'none', color: '#ff4d4d' }}>
                                <Trash2 size={12} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            {isOpen && item.children && (
                <div>
                    {item.children.map(child => (
                        <FolderTreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onSelect={onSelect}
                            currentPath={currentPath}
                            onUpdate={onUpdate}
                            selectedCount={selectedCount}
                            pinnedFolders={pinnedFolders}
                            onTogglePin={onTogglePin}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const TagSidebar = ({ file, meta, onUpdateMeta, onClose }: { file: LoraFile, meta: any, onUpdateMeta: (newMeta: any) => void, onClose: () => void }) => {
    const [filter, setFilter] = useState('');
    const [strength, setStrength] = useState(1.0);
    const [newTag, setNewTag] = useState('');
    const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
    const [editingTagValue, setEditingTagValue] = useState('');
    const [localTriggerWords, setLocalTriggerWords] = useState(meta?.triggerWords || '');
    const [includeLoraPrefix, setIncludeLoraPrefix] = useState(true);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const previewUrl = file.previewPath ? `/api/loras/image?path=${encodeURIComponent(file.previewPath)}&t=${file.mtime ? new Date(file.mtime).getTime() : ''}` : null;

    const civitaiTags = file.trainedWords || [];
    const customTags = meta?.customTags || [];

    // Combine and remove duplicates
    const allSuggestions = Array.from(new Set([...civitaiTags, ...customTags]));

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
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
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
                                                    {file.trainedWords?.includes(word) && <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>CIVITAI</span>}
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

const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const mib = bytes / (1024 * 1024);
    return mib.toFixed(2) + ' MiB';
};

const LoraCard = ({ file, meta, favLists = [], onUpdateMeta, onShowTags, onShowDescription, onToggleFav, onDelete, scale = 1, showPath = false, isSelected = false, onToggleSelect, selectedCount = 0 }: { file: LoraFile, meta: any, favLists?: string[], onUpdateMeta: (newMeta: any) => void, onShowTags: () => void, onShowDescription: () => void, onToggleFav: (file: LoraFile, list: string) => void, onDelete: () => void, scale?: number, showPath?: boolean, isSelected?: boolean, onToggleSelect?: () => void, selectedCount?: number }) => {
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
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const defaultFav = "お気に入り";
    const isDefaultFav = meta?.favoriteLists?.includes(defaultFav);

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

    const allImages = React.useMemo(() => {
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

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFav(file, defaultFav);
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowFavMenu(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setShowFavMenu(false);
        }, 150);
    };

    const copyPrompt = () => {
        const name = file.name.replace(/\.(safetensors|pt|ckpt)$/i, '');
        const prompt = `<lora:${name}:1> ${triggerWords}`;
        navigator.clipboard.writeText(prompt);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`WARNING: Are you sure you want to delete "${file.name}"?\nThis cannot be undone.`)) {
            try {
                await deleteLoraNode(file.path);
                onDelete();
            } catch (error: any) {
                alert('Delete failed: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const isNew = file.mtime ? (new Date().getTime() - new Date(file.mtime).getTime()) < (72 * 60 * 60 * 1000) : false;

    useEffect(() => {
        // Reset image index when switching models or folders
        setActiveImgIdx(0);
    }, [file.path]);

    useEffect(() => {
        // Background prefetch: if data is missing, fetch it silently
        // This makes arrows appear automatically without opening the modal
        if (file.modelId && allImages.length <= 1 && !meta?.civitaiImages) {
            // We use a silent fetch that only updates the meta
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
                display: 'flex', flexDirection: 'column', height: `${320 * scale}px`, cursor: 'grab',
                position: 'relative', overflow: 'hidden', padding: 0, border: 'none'
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
            {/* Main Image Layer */}
            <div
                onDragOver={(e) => {
                    // Check if the drag contains external files (not internal LoRA cards)
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
                                onDelete(); // Trigger a refresh using our existing handler
                            } catch (err: any) {
                                alert('Upload failed: ' + err.message);
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

            {/* Navigation Arrows */}
            {allImages.length > 1 && (
                <div className="nav-arrows" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
                    <button
                        onClick={prevImg}
                        className="nav-arrow-btn"
                        style={{
                            position: 'absolute', left: '8px', top: '60%', transform: 'translateY(-50%)',
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 100%)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            width: '44px', height: '44px',
                            color: 'white',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                    >
                        <ChevronLeft size={32} strokeWidth={3} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>‹</span>
                    </button>
                    <button
                        onClick={nextImg}
                        className="nav-arrow-btn"
                        style={{
                            position: 'absolute', right: '8px', top: '60%', transform: 'translateY(-50%)',
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 100%)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            width: '44px', height: '44px',
                            color: 'white',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                    >
                        <ChevronRight size={32} strokeWidth={3} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>›</span>
                    </button>

                    {/* Dots Indicator */}
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

            {/* Favorite Toggle */}
            <div
                style={{ position: 'absolute', top: '42px', left: '10px', zIndex: 60 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    onClick={toggleFavorite}
                    style={{
                        background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                        width: '24px', height: '24px',
                        padding: 0, color: isDefaultFav ? '#ef4444' : 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <Heart size={14} fill={isDefaultFav ? '#ef4444' : 'none'} />
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


            {/* Top Left Tags - 2 rows */}
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

            {/* Selection Checkbox */}
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

            {/* Top Right Actions */}
            <div className="card-actions" style={{ zIndex: 110 }}>
                {effectiveCivitaiUrl && (
                    <a href={effectiveCivitaiUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="action-btn" title="Civitaiで開く" style={{ color: '#fff' }}>
                        <Globe size={18} strokeWidth={2.5} />
                    </a>
                )}
                <button onClick={(e) => { e.stopPropagation(); onShowTags(); }} title="タグ一覧を表示" className="action-btn" style={{ color: '#fff' }}>
                    <List size={18} strokeWidth={2.5} />
                </button>
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

            {/* Bottom Info Overlay */}
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

export const LoraManager = () => {
    const [files, setFiles] = useState<LoraFile[]>([]);
    const [meta, setMeta] = useState<LoraMeta>({});
    const [currentPath, setCurrentPath] = useState(''); // relative path of selected folder
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [selectedLoraForTags, setSelectedLoraForTags] = useState<LoraFile | null>(null);
    const [selectedLoraForDescription, setSelectedLoraForDescription] = useState<LoraFile | null>(null);
    const [fetchedDescription, setFetchedDescription] = useState<string | null>(null);
    const [loadingDescription, setLoadingDescription] = useState(false);
    const [fetchedImages, setFetchedImages] = useState<any[]>([]);
    const [sortMode, setSortMode] = useState<'name' | 'custom'>('custom');
    const [isReordering, setIsReordering] = useState(false);
    const [cardScale, setCardScale] = useState(1);
    const [includeSubfolders, setIncludeSubfolders] = useState(false);
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [favLists, setFavLists] = useState<string[]>([]);
    const [selectedFavList, setSelectedFavList] = useState<string | null>(null);
    const [hoveredList, setHoveredList] = useState<string | null>(null);
    const [isGrouped, setIsGrouped] = useState(true);

    const loraContainerRef = React.useRef<HTMLDivElement>(null);

    // Config State
    const [configDir, setConfigDir] = useState('');
    const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

    const getMetaValue = (p: string) => {
        if (meta[p]) return meta[p];
        const norm = normalizePath(p);
        const key = Object.keys(meta).find(k => normalizePath(k) === norm);
        return key ? meta[key] : null;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [data, lists] = await Promise.all([getLoraFiles(), getLists()]);
            setFiles(data.files || []);

            // Normalize meta keys to forward slashes
            const normalizedMeta: LoraMeta = {};
            if (data.meta) {
                Object.entries(data.meta).forEach(([k, v]) => {
                    normalizedMeta[normalizePath(k)] = v;
                });
            }
            setMeta(normalizedMeta);

            setConfigDir(data.rootDir || '');
            setFavLists(lists || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchWithDelay = () => {
        setLoading(true);
        setTimeout(() => fetchData(), 1000);
    };

    useEffect(() => {
        fetchData();
        getAppConfig().then(c => {
            if (c.loraDir) setConfigDir(c.loraDir);
            if (c.pinnedFolders) setPinnedFolders(c.pinnedFolders);
        });
    }, []);

    // Separate effect for bulk move event listener
    useEffect(() => {
        const handleBulkMove = async (e: any) => {
            const destPath = e.detail?.destPath;
            if (!destPath) return;

            // Use functional setState to get current value
            setSelectedPaths(currentPaths => {
                const pathsToMove = currentPaths.filter(p => !isSamePath(p, destPath));
                if (pathsToMove.length > 0) {
                    // Perform the move asynchronously
                    moveLoraNodesBatch(pathsToMove, destPath)
                        .then(() => {
                            fetchData();
                        })
                        .catch((err: any) => {
                            alert('Bulk move failed: ' + (err.response?.data?.error || err.message));
                        });
                }
                return []; // Clear selection
            });
        };

        window.addEventListener('lora-bulk-move', handleBulkMove);
        return () => window.removeEventListener('lora-bulk-move', handleBulkMove);
    }, []);

    const handleSaveConfig = async () => {
        await updateAppConfig({ loraDir: configDir });
        setShowConfig(false);
        fetchData();
    };

    const handleAddList = async () => {
        const name = prompt("新しいリスト名:");
        if (name && !favLists.includes(name)) {
            const newLists = [...favLists, name];
            await saveLists(newLists);
            setFavLists(newLists);
        }
    };

    const handleRenameList = async (oldName: string) => {
        const newName = prompt(`「${oldName}」の新しい名前を入力してください`, oldName);
        if (newName && newName !== oldName && !favLists.includes(newName)) {
            const updatedLists = await renameList(oldName, newName);
            setFavLists(updatedLists);
            if (selectedFavList === oldName) setSelectedFavList(newName);
            fetchData();
        }
    };

    const handleDeleteList = async (name: string) => {
        if (!confirm(`リスト「${name}」を削除しますか？\n\n注意：このリストに含まれるLoRAからタグが削除されます。`)) return;
        try {
            const updatedLists = await deleteList(name);
            setFavLists(updatedLists);
            if (selectedFavList === name) setSelectedFavList(null);
            fetchData();
        } catch (e) {
            alert('削除できませんでした。');
        }
    };

    const handleToggleLoraFav = async (file: LoraFile, listName: string) => {
        const normPath = normalizePath(file.path);
        const currentMeta = getMetaValue(normPath) || {};
        const currentLists = currentMeta.favoriteLists || [];
        const isIncluded = currentLists.includes(listName);
        const newLists = isIncluded
            ? currentLists.filter(l => l !== listName)
            : [...currentLists, listName];

        await updateLoraMeta(normPath, { favoriteLists: newLists });
        setMeta(prev => ({
            ...prev,
            [normPath]: { ...currentMeta, favoriteLists: newLists }
        }));
    };

    const handleAddLoraToFavList = async (path: string, listName: string) => {
        const normPath = normalizePath(path);
        const currentMeta = getMetaValue(normPath) || {};
        const currentLists = currentMeta.favoriteLists || [];
        if (!currentLists.includes(listName)) {
            const newLists = [...currentLists, listName];
            await updateLoraMeta(normPath, { favoriteLists: newLists });
            setMeta(prev => ({
                ...prev,
                [normPath]: { ...currentMeta, favoriteLists: newLists }
            }));
        }
    };

    const handleDropOnFavList = async (e: React.DragEvent<HTMLDivElement>, listName: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.border = '1px solid transparent'; // match initial state

        const sourcePath = e.dataTransfer.getData('sourcePath');
        const isBulk = e.dataTransfer.getData('isBulk') === 'true';

        if (isBulk && selectedPaths.length > 0) {
            // Bulk add
            for (const p of selectedPaths) {
                await handleAddLoraToFavList(p, listName);
            }
        } else if (sourcePath) {
            // Single add
            await handleAddLoraToFavList(sourcePath, listName);
        }
    };

    const handleSelectFolder = (path: string) => {
        setCurrentPath(path);
        setSelectedFavList(null);
    };

    const handleCreateFolder = async () => {
        const name = prompt("New Folder Name:");
        if (name) {
            await createLoraFolder(currentPath, name);
            handleFetchWithDelay();
        }
    };

    const handleReorder = async (draggedPath: string, targetPath: string, isBulk: boolean = false) => {
        if (isSamePath(draggedPath, targetPath) || isReordering) return;

        setIsReordering(true);
        try {
            const getParent = (p: string) => p.includes('/') ? p.substring(0, p.lastIndexOf('/')) : (p.includes('\\') ? p.substring(0, p.lastIndexOf('\\')) : '');
            const parent = getParent(draggedPath);
            const targetParent = getParent(targetPath);

            if (parent !== targetParent) {
                console.warn('Cannot reorder across folders');
                setIsReordering(false);
                return;
            }

            const parentNode = findNode(files, parent);
            const siblings = parentNode?.children || files;
            const filesToReorder = siblings.filter(f => f.type === 'file');

            const sortedInFolder = [...filesToReorder].sort((a, b) => {
                const orderA = getMetaValue(a.path)?.order ?? 9999;
                const orderB = getMetaValue(b.path)?.order ?? 9999;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });

            const newFiles = [...sortedInFolder];

            if (isBulk && selectedPaths.includes(draggedPath)) {
                // Bulk Reorder
                const itemsToMove = sortedInFolder.filter(f => selectedPaths.includes(f.path));
                const remainingItems = sortedInFolder.filter(f => !selectedPaths.includes(f.path));

                const targetIndexInRemaining = remainingItems.findIndex(f => isSamePath(f.path, targetPath));
                if (targetIndexInRemaining === -1) { // Target itself was selected?
                    // If target is selected, it's already in itemsToMove.
                    // This case is tricky, but let's just use the original index of the target
                    const originalTargetIndex = sortedInFolder.findIndex(f => isSamePath(f.path, targetPath));
                    newFiles.length = 0;
                    // Simplified: just move them to where the target was
                    const before = sortedInFolder.filter(f => !selectedPaths.includes(f.path));
                    const targetIdx = before.findIndex(f => sortedInFolder.indexOf(f) > originalTargetIndex);
                    const actualInsertIdx = targetIdx === -1 ? before.length : targetIdx;
                    before.splice(actualInsertIdx, 0, ...itemsToMove);
                    newFiles.push(...before);
                } else {
                    remainingItems.splice(targetIndexInRemaining, 0, ...itemsToMove);
                    newFiles.length = 0;
                    newFiles.push(...remainingItems);
                }
            } else {
                // Single Reorder
                const draggedIndex = newFiles.findIndex(f => isSamePath(f.path, draggedPath));
                const targetIndex = newFiles.findIndex(f => isSamePath(f.path, targetPath));
                if (draggedIndex !== -1 && targetIndex !== -1) {
                    const [removed] = newFiles.splice(draggedIndex, 1);
                    newFiles.splice(targetIndex, 0, removed);
                }
            }

            // 1. Optimistic Update
            const newMeta = { ...meta };
            const updates = newFiles.map((f, index) => {
                const normPath = normalizePath(f.path);
                newMeta[normPath] = { ...(newMeta[normPath] || {}), order: index };
                return { path: normPath, data: { order: index } };
            });
            setMeta(newMeta);

            // 2. Persist
            const response = await updateLoraMetaBatch(updates);
            if (response.success) {
                if (isBulk) setSelectedPaths([]); // Clear selection after bulk move
            }

            await fetchData();
        } catch (e) {
            console.error('Failed to update order', e);
            fetchData();
        } finally {
            setIsReordering(false);
        }
    };

    // Flatten files for current view if needed, or filter by currentPath
    // Since `files` is recursive, we need to find the node corresponding to `currentPath`
    // Or if `currentPath` is empty (root), show top level.

    const findNode = (nodes: LoraFile[], path: string): LoraFile | null => {
        if (path === '') return { type: 'directory', name: 'Root', path: '', children: nodes };
        for (const node of nodes) {
            if (isSamePath(node.path, path)) return node;
            if (node.children) {
                const found = findNode(node.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const flattenFiles = (nodes: LoraFile[]): LoraFile[] => {
        let result: LoraFile[] = [];
        for (const node of nodes) {
            if (node.type === 'file') {
                result.push(node);
            }
            if (node.children) {
                result.push(...flattenFiles(node.children));
            }
        }
        return result;
    };

    const findDuplicateSets = (allFiles: LoraFile[]): Array<LoraFile[]> => {
        const sets: Record<string, LoraFile[]> = {};
        allFiles.forEach(f => {
            // Key by name and size
            const key = `${f.name}-${f.size}`;
            if (!sets[key]) sets[key] = [];
            sets[key].push(f);
        });
        // Return only sets with more than 1 file
        return Object.values(sets).filter(s => s.length > 1);
    };

    const handleShowDescription = async (file: LoraFile, refresh: boolean = false) => {
        setSelectedLoraForDescription(file);
        if (!refresh) {
            setFetchedDescription(null);
            setFetchedImages([]);
        }

        // Try to get modelId
        let modelId: string | number | undefined = file.modelId;
        const fileMeta = getMetaValue(file.path);
        if (fileMeta?.civitaiUrl) {
            const match = fileMeta.civitaiUrl.match(/models\/(\d+)/);
            if (match) modelId = match[1];
        }

        if (modelId) {
            setLoadingDescription(true);
            setFetchedDescription("");
            setFetchedImages([]);
            try {
                const res = await api.get(`/loras/model-description?modelId=${modelId}&loraPath=${encodeURIComponent(file.path)}${refresh ? '&refresh=true' : ''}`);

                // If it was a default fetch (not refresh) and we found images, we need to update the global meta
                // so the LoraCard picks up the arrows immediately without a full page refresh
                if (!refresh && res.data.images && res.data.images.length > 0) {
                    const images = res.data.images.map((img: any) => img.url).filter(Boolean);
                    if (images.length > 0) {
                        setMeta(prev => ({
                            ...prev,
                            [normalizePath(file.path)]: {
                                ...(prev[normalizePath(file.path)] || {}),
                                civitaiImages: images
                            }
                        }));
                    }
                }

                if (res.data.description) {
                    setFetchedDescription(res.data.description);
                } else {
                    setFetchedDescription("<p style='text-align:center;padding:2rem;'>Description not available for this model.</p>");
                }

                if (res.data.images && res.data.images.length > 0) {
                    setFetchedImages(res.data.images);
                } else {
                    setFetchedImages([]);
                }
            } catch (err) {
                console.error("Failed to fetch description", err);
                setFetchedDescription("<p style='text-align:center;padding:2rem;color:#ef4444;'>Failed to load from Civitai. The model may have been deleted.</p>");
                setFetchedImages([]);
                if (refresh) alert("failed to update from Civitai. The model might have been deleted.");
            } finally {
                setLoadingDescription(false);
            }
        }
    };

    const handleMoveBulk = async (destPath: string) => {
        if (selectedPaths.length === 0) return;
        try {
            await moveLoraNodesBatch(selectedPaths, destPath);
            setSelectedPaths([]);
            handleFetchWithDelay();
        } catch (err: any) {
            alert('Bulk move failed: ' + (err.response?.data?.error || err.message));
        }
    };

    useEffect(() => {
        const handler = (e: any) => handleMoveBulk(e.detail.destPath);
        window.addEventListener('lora-bulk-move' as any, handler);
        return () => window.removeEventListener('lora-bulk-move' as any, handler);
    }, [selectedPaths]);

    const currentNode = findNode(files, currentPath);
    const baseNodes = currentNode?.children || files;
    const currentFiles = (includeSubfolders || showDuplicatesOnly) ? flattenFiles(baseNodes) : baseNodes;

    const filteredFiles = currentFiles.filter(f => {
        const fileMeta = getMetaValue(f.path);
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFavList = selectedFavList ? fileMeta?.favoriteLists?.includes(selectedFavList) : true;
        return matchesSearch && matchesFavList;
    });

    const duplicateSets = showDuplicatesOnly ? findDuplicateSets(filteredFiles) : [];

    const sortedFiles = [...filteredFiles].sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;

        // When including subfolders, primary sort is by folder path to enable grouping
        if (includeSubfolders) {
            const pathA = a.path.includes('/') ? a.path.substring(0, a.path.lastIndexOf('/')) : '';
            const pathB = b.path.includes('/') ? b.path.substring(0, b.path.lastIndexOf('/')) : '';
            if (pathA !== pathB) return pathA.localeCompare(pathB);
        }

        // Within the same folder (or root), apply selected sort mode
        if (sortMode === 'custom' && a.type === 'file' && b.type === 'file') {
            const orderA = getMetaValue(a.path)?.order ?? 9999;
            const orderB = getMetaValue(b.path)?.order ?? 9999;
            if (orderA !== orderB) return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
    });

    // Group files by folder if in recursive mode
    const groupedFiles: Record<string, LoraFile[]> = {};
    if (includeSubfolders) {
        sortedFiles.forEach(f => {
            if (f.type !== 'file') return;
            const path = f.path.split(/[\\\/]/).slice(0, -1).join('/') || 'Root';
            if (!groupedFiles[path]) groupedFiles[path] = [];
            groupedFiles[path].push(f);
        });
    }

    const gridComponents = useMemo(() => ({
        List: React.forwardRef(({ style, children, ...props }: any, ref) => (
            <div
                ref={ref}
                {...props}
                style={{
                    ...style,
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fill, minmax(${200 * cardScale}px, 1fr))`,
                    gap: '1.5rem',
                    padding: '1rem'
                }}
            >
                {children}
            </div>
        )),
        Item: ({ children, ...props }: any) => (
            <div {...props}>
                {children}
            </div>
        )
    }), [cardScale]);

    const flatFiles = useMemo(() => sortedFiles.filter(f => f.type === 'file'), [sortedFiles]);

    return (
        <div className="layout" style={{ height: '100%', display: 'flex', position: 'relative' }}>
            <aside className="sidebar" style={{ width: '250px', flexShrink: 0 }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Folders</h2>
                    <button onClick={() => setShowConfig(!showConfig)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <Settings size={16} />
                    </button>
                </div>

                {showConfig && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>LoRA Root Dir</div>
                        <input
                            type="text"
                            value={configDir}
                            onChange={(e) => setConfigDir(e.target.value)}
                            style={{ width: '100%', fontSize: '0.8rem', padding: '4px', marginBottom: '4px' }}
                        />
                        <button onClick={handleSaveConfig} style={{ width: '100%', background: 'var(--accent)', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '0.8rem' }}>
                            Update Path
                        </button>
                    </div>
                )}

                <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                    {pinnedFolders.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Settings size={12} style={{ color: 'var(--accent)' }} /> PINNED
                            </div>
                            {pinnedFolders.map(path => {
                                const folderName = path.split(/[\\\/]/).pop() || path;
                                return (
                                    <div
                                        key={path}
                                        onClick={() => setCurrentPath(path)}
                                        style={{
                                            padding: '4px 8px', cursor: 'pointer', borderRadius: '4px',
                                            background: isSamePath(path, currentPath) ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                                            color: isSamePath(path, currentPath) ? '#7dd3fc' : 'var(--text-secondary)',
                                            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
                                            marginBottom: '2px'
                                        }}
                                    >
                                        <Folder size={14} style={{ color: 'var(--accent)' }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderName}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div
                        onClick={() => handleSelectFolder('')}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)';
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.background = currentPath === '' ? 'rgba(56, 189, 248, 0.2)' : 'transparent';
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.style.background = currentPath === '' ? 'rgba(56, 189, 248, 0.2)' : 'transparent';
                            const sourcePath = e.dataTransfer.getData('sourcePath');
                            const isBulk = e.dataTransfer.getData('isBulk') === 'true';

                            if (sourcePath && !isSamePath(sourcePath, '')) {
                                try {
                                    if (isBulk) {
                                        (window as any).dispatchEvent(new CustomEvent('lora-bulk-move', { detail: { destPath: '' } }));
                                    } else if (confirm(`Move "${sourcePath.split(/[\\\/]/).pop()}" to Root?`)) {
                                        await moveLoraNode(sourcePath, '');
                                        handleFetchWithDelay();
                                    }
                                } catch (error: any) {
                                    alert('Move failed: ' + (error.response?.data?.error || error.message));
                                }
                            }
                        }}
                        style={{
                            padding: '4px', cursor: 'pointer', borderRadius: '4px',
                            background: currentPath === '' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: (currentPath === '' && !selectedFavList) ? '#7dd3fc' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            whiteSpace: 'nowrap', position: 'relative'
                        }}
                    >
                        <Folder size={14} /> Root
                        {selectedPaths.length > 0 && (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Move ${selectedPaths.length} items to Root?`)) {
                                        (window as any).dispatchEvent(new CustomEvent('lora-bulk-move', { detail: { destPath: '' } }));
                                    }
                                }}
                                style={{
                                    marginLeft: 'auto', background: 'var(--accent)',
                                    color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px',
                                    fontSize: '0.7rem'
                                }}
                            >
                                ここに移動
                            </button>
                        )}
                    </div>
                    {files.map(file => (
                        <FolderTreeItem
                            key={file.path}
                            item={file}
                            onSelect={handleSelectFolder}
                            currentPath={selectedFavList ? "__FILTERED__" : currentPath}
                            onUpdate={handleFetchWithDelay}
                            selectedCount={selectedPaths.length}
                            pinnedFolders={pinnedFolders}
                            onTogglePin={async (path) => {
                                const isPinned = pinnedFolders.includes(path);
                                const newPinned = isPinned
                                    ? pinnedFolders.filter(p => p !== path)
                                    : [...pinnedFolders, path];
                                await updateAppConfig({ pinnedFolders: newPinned });
                                setPinnedFolders(newPinned);
                            }}
                        />
                    ))}
                </div>

                {/* Favorites Virtual Folders */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart size={14} /> お気に入りフォルダ
                        </div>
                        <button onClick={handleAddList} style={{ background: 'transparent', padding: '2px', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="リスト追加">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowX: 'hidden' }}>
                        {favLists.map(list => (
                            <div
                                key={list}
                                onMouseEnter={() => setHoveredList(list)}
                                onMouseLeave={() => setHoveredList(null)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.border = '1px dashed #fca5a5';
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.border = 'none';
                                }}
                                onDrop={(e) => handleDropOnFavList(e, list)}
                                style={{ position: 'relative', borderRadius: '6px', border: '1px solid transparent' }}
                            >
                                <button
                                    onClick={() => {
                                        const newList = selectedFavList === list ? null : list;
                                        setSelectedFavList(newList);
                                        if (newList) {
                                            setCurrentPath('');
                                            // When selecting a favorite list, we often want to see items from all subfolders
                                            setIncludeSubfolders(true);
                                        }
                                    }}
                                    style={{
                                        textAlign: 'left', background: selectedFavList === list ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                        border: 'none', padding: '0.5rem', borderRadius: '6px',
                                        color: selectedFavList === list ? '#fca5a5' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <Heart size={14} fill={selectedFavList === list ? "currentColor" : "none"} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list}</span>
                                </button>

                                {hoveredList === list && list !== 'お気に入り' && (
                                    <div style={{
                                        position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                        display: 'flex', gap: '4px', background: 'rgba(30, 41, 59, 0.9)', padding: '2px', borderRadius: '4px',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRenameList(list); }}
                                            style={{ padding: '2px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="名前変更"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list); }}
                                            style={{ padding: '2px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="削除"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {favLists.length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.5, textAlign: 'center', padding: '0.5rem' }}>
                                リストがありません
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            {currentPath ? currentPath.split('\\').pop() : 'Root'}
                        </h2>
                        <button onClick={handleCreateFolder} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}>
                            <Plus size={14} /> New Folder
                        </button>
                        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="再読み込み">
                            <RefreshCw size={14} />
                        </button>
                        {selectedPaths.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px', padding: '4px 12px', background: 'var(--accent)', borderRadius: '20px', fontSize: '0.85rem' }}>
                                <span>{selectedPaths.length}個 選択中</span>
                                <button onClick={() => setSelectedPaths([])} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'white', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Scale Slider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                            <ZoomOut size={16} color="var(--text-secondary)" />
                            <input
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.1"
                                value={cardScale}
                                onChange={e => setCardScale(parseFloat(e.target.value))}
                                style={{ width: '120px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                            <ZoomIn size={16} color="var(--text-secondary)" />
                        </div>

                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                            <button
                                onClick={() => setSortMode('name')}
                                style={{
                                    background: sortMode === 'name' ? 'var(--accent)' : 'transparent',
                                    border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >Name</button>
                            <button
                                onClick={() => setSortMode('custom')}
                                style={{
                                    background: sortMode === 'custom' ? 'var(--accent)' : 'transparent',
                                    border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >Custom</button>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    setShowDuplicatesOnly(!showDuplicatesOnly);
                                    if (!showDuplicatesOnly) setIncludeSubfolders(true);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    background: showDuplicatesOnly ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                                    border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', color: 'white',
                                    fontSize: '0.8rem', whiteSpace: 'nowrap'
                                }}
                                title="Find duplicate files (same name and size)"
                            >
                                <Copy size={14} /> 重複チェック
                            </button>
                            <button
                                onClick={() => {
                                    setIncludeSubfolders(!includeSubfolders);
                                    if (includeSubfolders) setShowDuplicatesOnly(false);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    background: includeSubfolders ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', color: 'white',
                                    fontSize: '0.8rem', whiteSpace: 'nowrap'
                                }}
                                title="Include all files from subfolders"
                            >
                                <Globe size={14} /> すべて表示
                            </button>
                            <button
                                onClick={() => setIsGrouped(!isGrouped)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    background: isGrouped ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', color: 'white',
                                    fontSize: '0.8rem', whiteSpace: 'nowrap'
                                }}
                                title={isGrouped ? "フォルダ分けを解除" : "フォルダごとに表示"}
                            >
                                <List size={14} /> {isGrouped ? "グループ表示" : "フラット表示"}
                            </button>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search LoRAs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '2rem', width: '250px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 2rem 2rem 2rem' }} ref={loraContainerRef}>
                    {loading ? (
                        <div>Loading...</div>
                    ) : sortedFiles.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)' }}>No LoRA files found. Check your directory settings.</div>
                    ) : showDuplicatesOnly ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                            {duplicateSets.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                    重複したファイルは見つかりませんでした。
                                </div>
                            ) : duplicateSets.map((set, idx) => (
                                <div key={idx} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Copy size={18} /> 重複セット {idx + 1}: {set[0].name}
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({formatSize(set[0].size)})</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            同じ内容のファイルが {set.length} 箇所に見つかりました
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(auto-fill, minmax(${200 * cardScale}px, 1fr))`,
                                        gap: '1.5rem'
                                    }}>
                                        {set.map(file => (
                                            <LoraCard
                                                key={file.path}
                                                file={file}
                                                meta={meta[file.path]}
                                                favLists={favLists}
                                                onUpdateMeta={(newMeta) => setMeta(prev => ({ ...prev, [file.path]: newMeta }))}
                                                onShowTags={() => setSelectedLoraForTags(file)}
                                                onShowDescription={() => handleShowDescription(file)}
                                                onToggleFav={handleToggleLoraFav}
                                                onDelete={handleFetchWithDelay}
                                                scale={cardScale}
                                                showPath={true}
                                                isSelected={selectedPaths.includes(file.path)}
                                                onToggleSelect={() => setSelectedPaths(prev => prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path])}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (includeSubfolders && isGrouped) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {Object.entries(groupedFiles).map(([folderPath, groupFiles]) => (
                                <div key={folderPath}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        marginBottom: '1rem', color: 'var(--accent)', fontWeight: 'bold'
                                    }}>
                                        <Folder size={16} /> {folderPath}
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 'normal' }}>({groupFiles.length} files)</span>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(auto-fill, minmax(${200 * cardScale}px, 1fr))`,
                                        gap: '1.5rem'
                                    }}>
                                        {groupFiles.map(file => (
                                            <div
                                                key={file.path}
                                                onDragOver={sortMode === 'custom' ? (e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.border = '2px solid var(--accent)';
                                                    e.currentTarget.style.borderRadius = '8px';
                                                } : undefined}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.border = '2px solid transparent';
                                                }}
                                                onDrop={(e) => {
                                                    if (sortMode !== 'custom') return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.border = '2px solid transparent';
                                                    const sourcePath = e.dataTransfer.getData('sourcePath');
                                                    const isBulk = e.dataTransfer.getData('isBulk') === 'true';
                                                    if (sourcePath && !isSamePath(sourcePath, file.path)) {
                                                        handleReorder(sourcePath, file.path, isBulk);
                                                    }
                                                }}
                                                style={{ border: '2px solid transparent', transition: 'all 0.2s' }}
                                            >
                                                <LoraCard
                                                    key={file.path}
                                                    file={file}
                                                    meta={getMetaValue(file.path)}
                                                    favLists={favLists}
                                                    onUpdateMeta={(newMeta) => setMeta(prev => ({ ...prev, [normalizePath(file.path)]: newMeta }))}
                                                    onShowTags={() => setSelectedLoraForTags(file)}
                                                    onShowDescription={() => handleShowDescription(file)}
                                                    onToggleFav={handleToggleLoraFav}
                                                    onDelete={handleFetchWithDelay}
                                                    scale={cardScale}
                                                    showPath={false} // Path is shown in header now
                                                    isSelected={selectedPaths.includes(file.path)}
                                                    onToggleSelect={() => setSelectedPaths(prev => prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path])}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <VirtuosoGrid
                            style={{ height: '100%' }}
                            customScrollParent={loraContainerRef.current || undefined}
                            totalCount={flatFiles.length}
                            components={gridComponents}
                            itemContent={(index) => {
                                const file = flatFiles[index];
                                if (!file) return null;
                                return (
                                    <div
                                        onDragOver={sortMode === 'custom' ? (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.border = '2px solid var(--accent)';
                                            e.currentTarget.style.borderRadius = '8px';
                                        } : undefined}
                                        onDragLeave={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.border = '2px solid transparent';
                                        }}
                                        onDrop={(e) => {
                                            if (sortMode !== 'custom') return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.border = '2px solid transparent';
                                            const sourcePath = e.dataTransfer.getData('sourcePath');
                                            const isBulk = e.dataTransfer.getData('isBulk') === 'true';
                                            if (sourcePath && !isSamePath(sourcePath, file.path)) {
                                                handleReorder(sourcePath, file.path, isBulk);
                                            }
                                        }}
                                        style={{ border: '2px solid transparent', transition: 'all 0.2s' }}
                                    >
                                        <LoraCard
                                            key={file.path}
                                            file={file}
                                            meta={getMetaValue(file.path)}
                                            favLists={favLists}
                                            onUpdateMeta={(newMeta) => setMeta(prev => ({ ...prev, [normalizePath(file.path)]: newMeta }))}
                                            onShowTags={() => setSelectedLoraForTags(file)}
                                            onShowDescription={() => handleShowDescription(file)}
                                            onToggleFav={handleToggleLoraFav}
                                            onDelete={handleFetchWithDelay}
                                            scale={cardScale}
                                            showPath={includeSubfolders}
                                            isSelected={selectedPaths.includes(file.path)}
                                            selectedCount={selectedPaths.length}
                                            onToggleSelect={() => setSelectedPaths(prev => prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path])}
                                        />
                                    </div>
                                );
                            }}
                        />
                    )}
                </div>
            </main>

            {/* Description Modal */}
            {selectedLoraForDescription && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '2rem'
                }} onClick={() => setSelectedLoraForDescription(null)}>
                    <div className="glass-panel" style={{
                        maxWidth: '800px', width: '100%', maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', padding: '2rem',
                        position: 'relative', overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedLoraForDescription(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X />
                        </button>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info color="var(--accent)" /> モデルの説明
                                {selectedLoraForDescription?.modelId && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>(ID: {selectedLoraForDescription.modelId})</span>}
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleShowDescription(selectedLoraForDescription, true)}
                                    disabled={loadingDescription}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                        padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
                                        fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <RefreshCw size={14} className={loadingDescription ? 'spin' : ''} /> 最新版を確認
                                </button>
                                {(selectedLoraForDescription?.civitaiUrl || meta[selectedLoraForDescription?.path || '']?.civitaiUrl) && (
                                    <a
                                        href={meta[selectedLoraForDescription?.path || '']?.civitaiUrl || selectedLoraForDescription?.civitaiUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Globe size={14} /> Civitaiで見る
                                    </a>
                                )}
                            </div>
                        </h2>
                        {!loadingDescription && fetchedImages.length > 0 && (
                            <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Sample Images (Click to copy prompt)</div>
                                <div style={{ display: 'flex', gap: '1.2rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'thin' }}>
                                    {fetchedImages.map((img, idx) => (
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const prompt = img.meta?.prompt || '';
                                                if (prompt) {
                                                    navigator.clipboard.writeText(prompt);
                                                    alert('Prompt copied!');
                                                }
                                            }}
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
                                __html: loadingDescription
                                    ? '<div style="display:flex;justify-content:center;padding:2rem;">Loading description from Civitai...</div>'
                                    : (fetchedDescription || selectedLoraForDescription.description || '<div style="text-align:center;padding:2rem;color:#64748b;">No description available for this model.</div>')
                            }}
                        />
                    </div>
                </div>
            )}

            {isReordering && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(2px)'
                }}>
                    <div className="glass-panel" style={{ padding: '1rem 2rem' }}>Updating Order...</div>
                </div>
            )}

            {selectedLoraForTags && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setSelectedLoraForTags(null)}>
                    {/* Overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} />
                    <div onClick={e => e.stopPropagation()}>
                        <TagSidebar
                            file={selectedLoraForTags}
                            meta={meta[normalizePath(selectedLoraForTags.path)]}
                            onUpdateMeta={(newMeta) => setMeta(prev => ({ ...prev, [normalizePath(selectedLoraForTags.path)]: newMeta }))}
                            onClose={() => setSelectedLoraForTags(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
