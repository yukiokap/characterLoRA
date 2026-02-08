import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Pin, Edit2, Trash2 } from 'lucide-react';
import { renameLoraNode, deleteLoraNode, moveLoraNode, type LoraFile } from '../../api';
import { isSamePath } from './utils';

interface FolderTreeItemProps {
    item: LoraFile;
    level?: number;
    onSelect: (path: string) => void;
    currentPath: string;
    onUpdate: () => void;
    selectedCount?: number;
    pinnedFolders?: string[];
    onTogglePin?: (path: string) => void;
}

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
    item, level = 0, onSelect, currentPath, onUpdate, selectedCount = 0, pinnedFolders = [], onTogglePin
}) => {
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
        <div style={{ paddingLeft: '8px' }}>
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
                    padding: '4px', cursor: 'pointer', borderRadius: '4px',
                    background: isSamePath(item.path, currentPath) ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: isSamePath(item.path, currentPath) ? '#7dd3fc' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap', position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', color: 'white', padding: '0 4px', fontSize: '0.85rem', width: '100px', flex: 1 }}
                    />
                ) : (
                    <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</span>
                )}

                <div className="folder-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '2px', flexShrink: 0 }}>
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
                            移動
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
                                <Pin size={12} style={{ color: isPinned ? 'var(--accent)' : 'inherit', transform: isPinned ? 'none' : 'rotate(45deg)', transition: 'transform 0.2s' }} />
                            </button>
                            <button onClick={handleRename} style={{ padding: '2px', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                                <Edit2 size={12} />
                            </button>
                            <button onClick={handleDelete} style={{ padding: '2px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="削除">
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
