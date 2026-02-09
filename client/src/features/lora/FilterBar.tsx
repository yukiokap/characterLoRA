import React from 'react';
import { Plus, X, ZoomOut, ZoomIn, Copy, Globe, List, UserPlus } from 'lucide-react';

interface FilterBarProps {
    currentPath: string;
    onCreateFolder: () => void;
    selectedCount: number;
    onClearSelection: () => void;
    cardScale: number;
    onCardScaleChange: (scale: number) => void;
    sortMode: 'name' | 'custom' | 'mtime';
    onSortModeChange: (mode: 'name' | 'custom' | 'mtime') => void;
    showDuplicatesOnly: boolean;
    onToggleDuplicates: () => void;
    includeSubfolders: boolean;
    onToggleSubfolders: () => void;
    isGrouped: boolean;
    onToggleGrouped: () => void;
    onBulkRegister: () => void;
    itemCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    currentPath,
    onCreateFolder,
    selectedCount,
    onClearSelection,
    cardScale,
    onCardScaleChange,
    sortMode,
    onSortModeChange,
    showDuplicatesOnly,
    onToggleDuplicates,
    includeSubfolders,
    onToggleSubfolders,
    isGrouped,
    onToggleGrouped,
    onBulkRegister,
    itemCount
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1.5rem' }}>
            {/* Left Section: Folder Info & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                    {currentPath ? currentPath.split(/[\\\/]/).pop() : 'Root'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <List size={14} />
                    <span>{itemCount} 個</span>
                </div>
                <button onClick={onCreateFolder} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'white' }}>
                    <Plus size={14} /> 新規フォルダ
                </button>
                {selectedCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', background: 'var(--accent)', borderRadius: '20px', fontSize: '0.85rem' }}>
                        <span>{selectedCount}個 選択中</span>
                        <button onClick={onClearSelection} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'white', display: 'flex' }}>
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>


            {/* Right Section: View Settings & Bulk Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {/* Scale Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                    <ZoomOut size={16} color="var(--text-secondary)" />
                    <input
                        type="range"
                        min="0.3"
                        max="2.5"
                        step="0.1"
                        value={cardScale}
                        onChange={e => onCardScaleChange(parseFloat(e.target.value))}
                        style={{ width: '100px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <ZoomIn size={16} color="var(--text-secondary)" />
                </div>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                    <button
                        onClick={() => onSortModeChange('name')}
                        style={{
                            background: sortMode === 'name' ? 'var(--accent)' : 'transparent',
                            border: 'none', color: 'white', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                    >名前順</button>
                    <button
                        onClick={() => onSortModeChange('mtime')}
                        style={{
                            background: sortMode === 'mtime' ? 'var(--accent)' : 'transparent',
                            border: 'none', color: 'white', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                    >更新順</button>
                    <button
                        onClick={() => onSortModeChange('custom')}
                        style={{
                            background: sortMode === 'custom' ? 'var(--accent)' : 'transparent',
                            border: 'none', color: 'white', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                    >カスタム</button>
                </div>

                <button
                    onClick={onToggleDuplicates}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: showDuplicatesOnly ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                        border: 'none', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', color: 'white',
                        fontSize: '0.85rem', whiteSpace: 'nowrap'
                    }}
                    title="重複ファイルを検索"
                >
                    <Copy size={15} /> 重複
                </button>
                <button
                    onClick={onToggleSubfolders}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: includeSubfolders ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        border: 'none', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', color: 'white',
                        fontSize: '0.85rem', whiteSpace: 'nowrap'
                    }}
                    title="すべてのサブフォルダを含める"
                >
                    <Globe size={15} /> すべて
                </button>
                <button
                    onClick={onToggleGrouped}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: isGrouped ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        border: 'none', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', color: 'white',
                        fontSize: '0.85rem', whiteSpace: 'nowrap'
                    }}
                >
                    <List size={15} /> {isGrouped ? "グループ" : "フラット"}
                </button>

                {selectedCount > 0 && (
                    <button
                        onClick={onBulkRegister}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'var(--accent)', color: 'white',
                            border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px',
                            cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        <UserPlus size={18} /> 一括登録 ({selectedCount})
                    </button>
                )}
            </div>
        </div>
    );
};
