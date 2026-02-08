import React, { useState } from 'react';
import { Folder, Heart, Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { type LoraFile } from '../../api';
import { isSamePath } from './utils';
import { FolderTreeItem } from './FolderTreeItem';

interface SidebarProps {
    files: LoraFile[];
    currentPath: string;
    onSelectFolder: (path: string) => void;
    pinnedFolders: string[];
    onTogglePin: (path: string) => void;
    selectedCount: number;
    onUpdate: () => void;
    favLists: string[];
    selectedFavList: string | null;
    onSelectFavList: (list: string | null) => void;
    onAddList: () => void;
    onRenameList: (list: string) => void;
    onDeleteList: (list: string) => void;
    onDropOnFavList: (e: React.DragEvent<any>, list: string) => void | Promise<void>;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    files,
    currentPath,
    onSelectFolder,
    pinnedFolders,
    onTogglePin,
    selectedCount,
    onUpdate,
    favLists,
    selectedFavList,
    onSelectFavList,
    onAddList,
    onRenameList,
    onDeleteList,
    onDropOnFavList,
    searchQuery,
    onSearchQueryChange,
}) => {
    const [hoveredList, setHoveredList] = useState<string | null>(null);

    return (
        <aside className="sidebar" style={{ width: '250px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.7 }} />
                <input
                    type="text"
                    placeholder="LoRAを検索..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.6rem 2.8rem 0.6rem 2.8rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border)',
                        color: 'white'
                    }}
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchQueryChange('')}
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Favorites Virtual Folders moved to top for consistency */}
            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={14} style={{ verticalAlign: 'middle' }} /> お気に入りフォルダ
                    </div>
                    <button onClick={onAddList} style={{ background: 'transparent', padding: '2px', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="リスト追加">
                        <Plus size={14} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowX: 'hidden' }}>
                    {favLists.map(list => (
                        <div
                            key={list}
                            onMouseEnter={() => setHoveredList(list)}
                            onMouseLeave={() => setHoveredList(null)}
                            className="sidebar-item-row"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.border = '1px dashed #fca5a5';
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.border = 'none';
                            }}
                            onDrop={(e) => onDropOnFavList(e, list)}
                            style={{ position: 'relative', borderRadius: '6px' }}
                        >
                            <button
                                onClick={() => onSelectFavList(selectedFavList === list ? null : list)}
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

                            {list !== 'お気に入り' && (
                                <div className="hover-actions-container" style={{
                                    position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(30, 41, 59, 0.9)', padding: '2px', borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRenameList(list); }}
                                        className="action-icon-btn" title="名前変更"
                                    >
                                        <Edit2 size={12} style={{ color: 'var(--text-secondary)' }} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteList(list); }}
                                        className="action-icon-btn" title="削除"
                                    >
                                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {favLists.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.5, padding: '0.5rem 0.8rem' }}>
                            リストがありません
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem' }}>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Folder size={14} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
                    Folders
                </h2>
            </div>

            <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                {pinnedFolders.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            PINNED
                        </div>
                        {pinnedFolders.map(path => {
                            const folderName = path.split(/[\\\/]/).pop() || path;
                            return (
                                <div
                                    key={path}
                                    onClick={() => onSelectFolder(path)}
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
                    onClick={() => onSelectFolder('')}
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
                                    (window as any).dispatchEvent(new CustomEvent('lora-move-to-root', { detail: { sourcePath } }));
                                }
                            } catch (error: any) { }
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
                    {selectedCount > 0 && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Move ${selectedCount} items to Root?`)) {
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
                        onSelect={onSelectFolder}
                        currentPath={selectedFavList ? "__FILTERED__" : currentPath}
                        onUpdate={onUpdate}
                        selectedCount={selectedCount}
                        pinnedFolders={pinnedFolders}
                        onTogglePin={onTogglePin}
                    />
                ))}
            </div>
        </aside>
    );
};
