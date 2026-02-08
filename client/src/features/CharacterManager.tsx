import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import { getCharacters, createCharacter, updateCharacter, deleteCharacter, getLists, saveLists, reorderCharacters, renameList, deleteList } from '../api';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterForm } from '../components/CharacterForm';
import { Search, Plus, Filter, Folder, Hash, Heart, Copy, ZoomIn, ZoomOut, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';
import { type Character } from '../types';
import { arrayMove } from '@dnd-kit/sortable';

const gridComponents = {
    List: forwardRef(({ style, children, ...props }: any, ref: any) => (
        <div
            ref={ref}
            {...props}
            style={{
                ...style,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(var(--card-width, 200px), 1fr))',
                gap: '1.5rem',
                padding: '1rem',
            }}
        >
            {children}
        </div>
    )),
    Item: ({ children, ...props }: any) => (
        <div {...props} style={{ display: 'flex' }}>
            {children}
        </div>
    )
};

export const CharacterManager = () => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
    const [cardScale, setCardScale] = useState(1);
    const [activeVariations, setActiveVariations] = useState<Record<string, number>>({});
    const [favLists, setFavLists] = useState<string[]>([]);
    const [selectedFavList, setSelectedFavList] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChar, setEditingChar] = useState<Character | null>(null);

    const [hoveredList, setHoveredList] = useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const getActiveVarIndex = (charId: string) => activeVariations[charId] || 0;

    const handleVarChange = (charId: string, index: number) => {
        setActiveVariations(prev => ({ ...prev, [charId]: index }));
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [chars, lists] = await Promise.all([getCharacters(), getLists()]);
            setCharacters(chars);
            setFavLists(lists);
            setError(null);
        } catch (e: any) {
            console.error("Failed to fetch data", e);
            setError("データの読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const refreshHandler = () => fetchData();
        window.addEventListener('character-update', refreshHandler);
        return () => window.removeEventListener('character-update', refreshHandler);
    }, []);

    const fetchCharacters = async () => {
        const data = await getCharacters();
        setCharacters(data);
    };

    const seriesList = useMemo(() => {
        const s = new Set(characters.map(c => c.series).filter(Boolean));
        return Array.from(s).sort();
    }, [characters]);

    const filteredCharacters = useMemo(() => {
        return characters.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            const basePromptsMatch = c.basePrompts ? c.basePrompts.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())) : false;
            const varPromptsMatch = c.variations ? c.variations.some(v => v.prompts && v.prompts.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))) : false;
            const matchesSearch = nameMatch || basePromptsMatch || varPromptsMatch;
            const matchesSeries = selectedSeries ? c.series === selectedSeries : true;
            const matchesFav = selectedFavList ? c.favoriteLists?.includes(selectedFavList) : true;
            return matchesSearch && matchesSeries && matchesFav;
        });
    }, [characters, searchQuery, selectedSeries, selectedFavList]);

    const handleAdd = () => {
        setEditingChar(null);
        setIsModalOpen(true);
    };

    const handleEdit = (char: Character) => {
        setEditingChar(char);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('本当に削除しますか？')) {
            await deleteCharacter(id);
            fetchData();
        }
    };

    const handleSave = async (charData: Partial<Character>) => {
        if (editingChar) {
            await updateCharacter(editingChar.id, charData);
        } else {
            await createCharacter(charData);
        }
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
        if (!confirm(`リスト「${name}」を削除しますか？\n\n【注意！】\nこのリストに含まれているキャラクターから「${name}」タグが削除されます（キャラクター自体は消えません）。この操作は元に戻せません。`)) {
            return;
        }
        try {
            const updatedLists = await deleteList(name);
            setFavLists(updatedLists);
            if (selectedFavList === name) setSelectedFavList(null);
            fetchData();
        } catch (e) {
            alert('削除できませんでした。デフォルトのリストは削除できない場合があります。');
        }
    };

    const toggleFavList = async (char: Character, listName: string) => {
        const currentLists = char.favoriteLists || [];
        const isIncluded = currentLists.includes(listName);
        const newLists = isIncluded
            ? currentLists.filter(l => l !== listName)
            : [...currentLists, listName];

        // Optimistic update for UI feel
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, favoriteLists: newLists } : c));

        try {
            await updateCharacter(char.id, { favoriteLists: newLists });
            // Fully refresh to ensure consistency
            fetchData();
        } catch (e) {
            fetchData(); // Rollback/Refresh on error
            alert('お気に入りの更新に失敗しました');
        }
    };

    return (
        // Removed "layout" class since App will provide layout container OR specific styles
        // Actually keep "layout" class structure but maybe adjust if App wraps it
        <div className="layout" style={{ height: '100%' }}>
            {/* Sidebar */}
            <aside className="sidebar">

                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.7 }} />
                    <input
                        type="text"
                        placeholder="キャラクターを検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                            onClick={() => setSearchQuery('')}
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

                <div style={{ display: 'flex', flexDirection: 'column', flex: selectedFavList ? 1 : 'none', minHeight: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Heart size={14} style={{ verticalAlign: 'middle' }} /> お気に入り
                        </div>
                        <button onClick={handleAddList} style={{ background: 'transparent', padding: '2px', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="リスト追加">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {favLists.map(list => (
                            <div
                                key={list}
                                onMouseEnter={() => setHoveredList(list)}
                                onMouseLeave={() => setHoveredList(null)}
                                className="sidebar-item-row"
                                style={{ position: 'relative', borderRadius: '6px' }}
                            >
                                <button
                                    onClick={() => {
                                        const isSelecting = selectedFavList !== list;
                                        setSelectedFavList(isSelecting ? list : null);
                                        if (isSelecting) setSelectedSeries(null); // Clear series when selecting a list
                                    }}
                                    style={{
                                        textAlign: 'left', background: selectedFavList === list ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                        border: 'none', padding: '0.5rem', borderRadius: '6px',
                                        color: selectedFavList === list ? '#fca5a5' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Heart size={14} fill={selectedFavList === list ? "currentColor" : "none"} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list}</span>
                                </button>

                                {/* Actions (always visible but subtle) */}
                                {list !== 'お気に入り' && (
                                    <div className="hover-actions-container" style={{
                                        position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                        background: '#1e293b', padding: '2px', borderRadius: '4px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRenameList(list); }}
                                            className="action-icon-btn" title="名前変更"
                                        >
                                            <Edit2 size={12} style={{ color: '#94a3b8' }} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list); }}
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

                <div style={{ display: 'flex', flexDirection: 'column', flex: selectedSeries ? 1 : 1, minHeight: 0, overflowY: 'auto', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Filter size={14} style={{ verticalAlign: 'middle' }} /> 作品・シリーズ
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <button
                            onClick={() => { setSelectedSeries(null); setSelectedFavList(null); }}
                            style={{
                                textAlign: 'left', background: (selectedSeries === null && selectedFavList === null) ? 'var(--accent-glow)' : 'transparent',
                                border: 'none', padding: '0.5rem', borderRadius: '6px',
                                color: (selectedSeries === null && selectedFavList === null) ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            すべて
                        </button>
                        {seriesList.map(series => (
                            <button
                                key={series}
                                onClick={() => {
                                    setSelectedSeries(selectedSeries === series ? null : series);
                                    if (selectedSeries !== series) setSelectedFavList(null); // Clear fav
                                }}
                                style={{
                                    textAlign: 'left', background: selectedSeries === series ? 'var(--accent-glow)' : 'transparent',
                                    border: 'none', padding: '0.5rem', borderRadius: '6px',
                                    color: selectedSeries === series ? 'white' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <Folder size={14} /> {series}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <Hash size={14} /> 合計 {characters.length} キャラクター
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content" ref={containerRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {/* Left Section: Title & Copy */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            {selectedFavList ? `♥ ${selectedFavList}` : selectedSeries || 'すべてのキャラクター'}
                        </h2>
                        {filteredCharacters.length > 0 && (
                            <button
                                onClick={() => {
                                    const allPrompts = filteredCharacters.map(c => {
                                        const base = c.basePrompts || [];
                                        const index = getActiveVarIndex(c.id);
                                        const targetVar = c.variations?.[index] || c.variations?.[0];
                                        const variant = targetVar?.prompts || [];
                                        return [...base, ...variant].join(', ');
                                    }).join('\n');

                                    navigator.clipboard.writeText(allPrompts);
                                    alert(`${filteredCharacters.length} キャラクター分のプロンプトをコピーしました！`);
                                }}
                                title="表示中の全キャラのプロンプトをコピー"
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <Copy size={14} /> 全コピー
                            </button>
                        )}
                    </div>

                    {/* Right Section: View Settings & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                            <ZoomOut size={14} color="var(--text-secondary)" />
                            <input
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.1"
                                value={cardScale}
                                onChange={e => setCardScale(parseFloat(e.target.value))}
                                style={{ width: '80px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                            <ZoomIn size={14} color="var(--text-secondary)" />
                        </div>

                        <button className="btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
                            <Plus size={18} /> 新規追加
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 size={32} className="animate-spin" style={{ opacity: 0.5 }} />
                        <span>読み込み中...</span>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>
                        <p>{error}</p>
                        <button onClick={fetchCharacters} className="btn-primary" style={{ marginTop: '1rem' }}>再試行</button>
                    </div>
                ) : filteredCharacters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p>キャラクターが見つかりません</p>
                    </div>
                ) : (
                    <div style={{ flex: 1, paddingBottom: '4rem', '--card-width': `${200 * cardScale}px` } as any}>
                        <VirtuosoGrid
                            style={{ height: '100%' }}
                            customScrollParent={containerRef.current || undefined}
                            totalCount={filteredCharacters.length}
                            components={gridComponents}
                            itemContent={(index) => {
                                const char = filteredCharacters[index];
                                if (!char) return null;
                                return (
                                    <div
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('charId', char.id);
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = '2px solid var(--accent)';
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.style.border = '2px solid transparent';
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.border = '2px solid transparent';
                                            const draggedId = e.dataTransfer.getData('charId');
                                            if (draggedId && draggedId !== char.id) {
                                                const oldIndex = characters.findIndex(c => c.id === draggedId);
                                                const newIndex = characters.findIndex(c => c.id === char.id);
                                                if (oldIndex !== -1 && newIndex !== -1) {
                                                    const newOrder = arrayMove([...characters], oldIndex, newIndex);
                                                    setCharacters(newOrder);
                                                    await reorderCharacters(newOrder);
                                                }
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            border: '2px solid transparent',
                                            borderRadius: '12px',
                                            transition: 'border 0.2s'
                                        }}
                                    >
                                        <CharacterCard
                                            character={char}
                                            favLists={favLists}
                                            activeVarIndex={getActiveVarIndex(char.id)}
                                            onVarChange={(idx: number) => handleVarChange(char.id, idx)}
                                            onToggleFav={toggleFavList}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}

                {isModalOpen && (
                    <CharacterForm
                        character={editingChar}
                        onSave={handleSave}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </main>
        </div>
    ); // End of component
};
