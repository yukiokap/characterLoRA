import { useState, useEffect, useMemo } from 'react';
import { getCharacters, getLists, getSituations, saveSituations } from '../api';
import { type Character } from '../types';
import { Sparkles, Users, Plus, Copy, Check, List, Heart, Search, X, Save, FolderOpen, Globe, RefreshCw } from 'lucide-react';

interface GeneratorCharacter {
    id: string; // Internal unique ID for the generator list
    name: string;
    basePrompts: string;
    costumePrompts: string;
}

export const PromptGenerator = () => {
    const [allCharacters, setAllCharacters] = useState<Character[]>([]);
    const [favLists, setFavLists] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedList, setSelectedList] = useState<string | null>(null);

    // Generator State
    const [selectedChars, setSelectedChars] = useState<GeneratorCharacter[]>([]);
    const [situationPrompts, setSituationPrompts] = useState('');
    const [globalPrompt, setGlobalPrompt] = useState('');
    const [globalPosition, setGlobalPosition] = useState<'prefix' | 'suffix'>('prefix');
    const [copied, setCopied] = useState(false);
    const [expandedCharIds, setExpandedCharIds] = useState<string[]>([]);
    const [expandedSeries, setExpandedSeries] = useState<string[]>([]);

    // Template State
    const [situationTemplates, setSituationTemplates] = useState<Record<string, string>>({});
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    useEffect(() => {
        fetchData();
        fetchTemplates();

        const handleUpdate = () => fetchData();
        window.addEventListener('character-update', handleUpdate);
        return () => window.removeEventListener('character-update', handleUpdate);
    }, []);

    const fetchData = async () => {
        try {
            const [chars, lists] = await Promise.all([getCharacters(), getLists()]);
            setAllCharacters(chars);
            setFavLists(lists);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const temps = await getSituations();
            setSituationTemplates(temps);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        }
    };

    const handleSaveTemplate = async (nameOverride?: string) => {
        const nameToSave = nameOverride || newTemplateName;
        if (!nameToSave.trim() || !situationPrompts.trim()) return;
        const updated = { ...situationTemplates, [nameToSave.trim()]: situationPrompts };
        await saveSituations(updated);
        setSituationTemplates(updated);
        setNewTemplateName('');
        setShowTemplateModal(false);
    };

    const handleDeleteTemplate = async (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        if (!confirm(`テンプレート "${name}" を削除しますか？`)) return;
        const updated = { ...situationTemplates };
        delete updated[name];
        await saveSituations(updated);
        setSituationTemplates(updated);
    };

    const addCharacterToGenerator = (char: Character, variationIndex: number = 0) => {
        const newChar: GeneratorCharacter = {
            id: Math.random().toString(36).substr(2, 9),
            name: char.name,
            basePrompts: char.basePrompts.join(', '),
            costumePrompts: char.variations?.[variationIndex]?.prompts.join(', ') || ''
        };
        setSelectedChars([...selectedChars, newChar]);
    };

    const toggleCharExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedCharIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSeriesExpand = (series: string) => {
        setExpandedSeries(prev =>
            prev.includes(series) ? prev.filter(s => s !== series) : [...prev, series]
        );
    };

    // Auto-expand search results and initialize series
    useEffect(() => {
        if (searchQuery) {
            const seriesWithMatches = Array.from(new Set(filteredChars.map(c => c.series)));
            setExpandedSeries(prev => Array.from(new Set([...prev, ...seriesWithMatches])));
        }
    }, [searchQuery]);

    useEffect(() => {
        if (allCharacters.length > 0 && expandedSeries.length === 0) {
            const allSeries = Array.from(new Set(allCharacters.map(c => c.series)));
            setExpandedSeries(allSeries);
        }
    }, [allCharacters]);

    const addListToGenerator = (listName: string) => {
        const charsInList = allCharacters.filter(c => c.favoriteLists?.includes(listName));
        const newEntries = charsInList.map(char => ({
            id: Math.random().toString(36).substr(2, 9),
            name: char.name,
            basePrompts: char.basePrompts.join(', '),
            costumePrompts: char.variations?.[0]?.prompts.join(', ') || ''
        }));
        setSelectedChars([...selectedChars, ...newEntries]);
    };

    const addManualCharacter = () => {
        const newChar: GeneratorCharacter = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            basePrompts: '',
            costumePrompts: ''
        };
        setSelectedChars([...selectedChars, newChar]);
    };

    const updateChar = (id: string, field: keyof GeneratorCharacter, value: string) => {
        setSelectedChars(selectedChars.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeChar = (id: string) => {
        setSelectedChars(selectedChars.filter(c => c.id !== id));
    };

    const clearAll = () => {
        if (confirm('リストをクリアしますか？')) {
            setSelectedChars([]);
        }
    };

    const generatedPrompts = useMemo(() => {
        const situationLines = situationPrompts.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (selectedChars.length === 0) return '';

        const results: string[] = [];
        const linesToProcess = situationLines.length > 0 ? situationLines : [''];

        selectedChars.forEach(char => {
            const charCore = [char.basePrompts, char.costumePrompts]
                .map(p => p.trim())
                .filter(p => p !== '')
                .join(', ');

            linesToProcess.forEach(situation => {
                const parts = [char.name.trim(), charCore, situation.trim()]
                    .filter(p => p !== '');

                let combined = parts.join(', ');

                if (globalPrompt.trim()) {
                    if (globalPosition === 'prefix') {
                        combined = globalPrompt.trim() + (combined ? ', ' + combined : '');
                    } else {
                        combined = (combined ? combined + ', ' : '') + globalPrompt.trim();
                    }
                }

                results.push(combined);
            });
        });

        return results.join('\n');
    }, [selectedChars, situationPrompts, globalPrompt, globalPosition]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompts);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredChars = useMemo(() => {
        return allCharacters.filter(c => {
            const name = (c.name || '').toLowerCase();
            const series = (c.series || '').toLowerCase();
            const query = (searchQuery || '').toLowerCase();

            const matchesSearch = name.includes(query) || series.includes(query);
            const matchesList = selectedList ? c.favoriteLists?.includes(selectedList) : true;
            return matchesSearch && matchesList;
        });
    }, [allCharacters, searchQuery, selectedList]);

    return (
        <div className="prompt-generator" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Sidebar: Character Library */}
            <aside style={{ width: '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.3)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                            <Users size={20} color="var(--accent)" /> Character Library
                        </h3>
                        <button
                            onClick={fetchData}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            title="Refresh library"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search characters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: '1rem' }}
                        />
                    </div>
                    {/* Favorite Lists Quick Select */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        <button
                            onClick={() => setSelectedList(null)}
                            style={{
                                padding: '4px 8px', fontSize: '0.75rem',
                                background: selectedList === null ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                            }}
                        >
                            All
                        </button>
                        {favLists.map(list => (
                            <button
                                key={list}
                                onClick={() => setSelectedList(list)}
                                style={{
                                    padding: '4px 8px', fontSize: '0.75rem',
                                    background: selectedList === list ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <Heart size={10} fill={selectedList === list ? 'white' : 'none'} /> {list}
                            </button>
                        ))}
                    </div>
                    {selectedList && (
                        <button
                            onClick={() => addListToGenerator(selectedList)}
                            style={{ width: '100%', marginTop: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                            リスト内の全キャラを追加
                        </button>
                    )}
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {(() => {
                        const grouped: Record<string, Character[]> = {};
                        filteredChars.forEach(c => {
                            if (!grouped[c.series]) grouped[c.series] = [];
                            grouped[c.series].push(c);
                        });

                        return Object.entries(grouped).map(([series, chars]) => {
                            const isSeriesExpanded = expandedSeries.includes(series);
                            return (
                                <div key={series} style={{ marginBottom: '1rem' }}>
                                    <div
                                        onClick={() => toggleSeriesExpand(series)}
                                        style={{
                                            padding: '6px 10px', fontSize: '0.75rem', color: isSeriesExpanded ? 'var(--accent)' : 'var(--text-secondary)',
                                            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
                                            borderBottom: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '8px',
                                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: isSeriesExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <span>{series || 'Unknown Series'} ({chars.length})</span>
                                        <span style={{ fontSize: '0.6rem', transition: 'transform 0.2s', transform: isSeriesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                                    </div>

                                    {isSeriesExpanded && chars.map(char => {
                                        const isExpanded = expandedCharIds.includes(char.id);
                                        return (
                                            <div key={char.id} style={{ marginBottom: '4px' }}>
                                                <div
                                                    className="glass-panel"
                                                    style={{
                                                        padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                                                        alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer',
                                                        border: isExpanded ? '1px solid var(--accent)' : '1px solid transparent'
                                                    }}
                                                    onClick={(e) => toggleCharExpand(char.id, e)}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{char.name}</div>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{char.variations?.length || 0} costumes</div>
                                                    </div>
                                                    <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>{isExpanded ? '▲' : '▼'}</div>
                                                </div>

                                                {isExpanded && (
                                                    <div style={{ padding: '4px 0 4px 12px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '2px solid var(--accent)', marginLeft: '8px', marginTop: '4px' }}>
                                                        {char.variations?.map((v, idx) => (
                                                            <div
                                                                key={idx}
                                                                onClick={() => addCharacterToGenerator(char, idx)}
                                                                className="glass-panel"
                                                                style={{
                                                                    padding: '6px 10px', fontSize: '0.8rem', display: 'flex',
                                                                    justifyContent: 'space-between', alignItems: 'center',
                                                                    background: 'rgba(255,255,255,0.03)', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <span style={{ opacity: 0.9 }}>{v.name || `Costume ${idx + 1}`}</span>
                                                                <Plus size={14} color="var(--accent)" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        });
                    })()}
                    {filteredChars.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '0.85rem' }}>
                            {allCharacters.length === 0 ? 'キャラクターが登録されていません' : '一致するキャラクターが見つかりません'}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                    {/* Left Column: Character List & Global Prompt */}
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Global Prompt Area */}
                        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Globe size={16} color="var(--accent)" /> 共通プロンプト (品質タグなど)
                                </label>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                                    <button
                                        onClick={() => setGlobalPosition('prefix')}
                                        style={{
                                            padding: '3px 10px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: globalPosition === 'prefix' ? 'var(--accent)' : 'transparent', color: 'white'
                                        }}
                                    >
                                        前置
                                    </button>
                                    <button
                                        onClick={() => setGlobalPosition('suffix')}
                                        style={{
                                            padding: '3px 10px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: globalPosition === 'suffix' ? 'var(--accent)' : 'transparent', color: 'white'
                                        }}
                                    >
                                        後置
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={globalPrompt}
                                onChange={(e) => setGlobalPrompt(e.target.value)}
                                placeholder="masterpiece, best quality..."
                                style={{ width: '100%', height: '50px', fontSize: '0.85rem', resize: 'none' }}
                            />
                        </div>

                        {/* Selected Characters List */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <List size={20} color="var(--accent)" /> 1. Characters
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--accent)', color: 'white', padding: '2px 10px', borderRadius: '10px', fontWeight: 600 }}>
                                            {selectedChars.length} Characters
                                        </span>
                                        {generatedPrompts && (
                                            <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 10px', borderRadius: '10px', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                {generatedPrompts.split('\n').filter(l => l !== '').length} Total Prompts
                                            </span>
                                        )}
                                    </div>
                                </h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={addManualCharacter} className="glass-button" style={{ fontSize: '0.8rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Plus size={14} /> New Row
                                    </button>
                                    <button onClick={clearAll} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '10px' }}>
                                {selectedChars.length === 0 ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.3)' }}>
                                        左のライブラリからキャラクターを選択
                                    </div>
                                ) : (
                                    <>
                                        {/* Table Header */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 40px', gap: '15px', padding: '0 15px', marginBottom: '-5px' }}>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, opacity: 0.6 }}>NAME</label>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, opacity: 0.6 }}>BASE</label>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, opacity: 0.6 }}>COSTUME</label>
                                            <div></div>
                                        </div>

                                        {selectedChars.map((char) => (
                                            <div key={char.id} className="glass-panel" style={{ padding: '10px 15px', position: 'relative' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 40px', gap: '15px', alignItems: 'center' }}>
                                                    <input
                                                        value={char.name}
                                                        onChange={(e) => updateChar(char.id, 'name', e.target.value)}
                                                        placeholder="Name"
                                                        style={{ width: '100%', minWidth: 0, fontSize: '0.9rem', padding: '8px', background: 'rgba(0,0,0,0.2)' }}
                                                    />
                                                    <textarea
                                                        value={char.basePrompts}
                                                        onChange={(e) => updateChar(char.id, 'basePrompts', e.target.value)}
                                                        placeholder="traits"
                                                        style={{ width: '100%', minWidth: 0, height: '40px', fontSize: '0.85rem', resize: 'none', padding: '8px', background: 'rgba(0,0,0,0.2)' }}
                                                    />
                                                    <textarea
                                                        value={char.costumePrompts}
                                                        onChange={(e) => updateChar(char.id, 'costumePrompts', e.target.value)}
                                                        placeholder="clothing"
                                                        style={{ width: '100%', minWidth: 0, height: '40px', fontSize: '0.85rem', resize: 'none', padding: '8px', background: 'rgba(0,0,0,0.2)' }}
                                                    />
                                                    <button
                                                        onClick={() => removeChar(char.id)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ff4d4f',
                                                            cursor: 'pointer', padding: '8px', borderRadius: '6px',
                                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Remove"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                            e.currentTarget.style.transform = 'scale(1.1)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Final Combined Output */}
                    <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Copy size={20} color="var(--accent)" /> 2. Output
                                {generatedPrompts && (
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(129, 140, 248, 0.2)', color: '#818cf8', padding: '2px 10px', borderRadius: '10px', fontWeight: 600, border: '1px solid rgba(129, 140, 248, 0.3)', marginLeft: '8px' }}>
                                        {generatedPrompts.split('\n').filter(l => l !== '').length} lines
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={handleCopy}
                                disabled={!generatedPrompts}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                                    background: copied ? '#10b981' : 'var(--accent)', color: 'white', border: 'none',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s', fontSize: '0.85rem'
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Results'}
                            </button>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <textarea
                                readOnly
                                value={generatedPrompts}
                                placeholder="Combined results..."
                                style={{
                                    width: '100%', height: '100%', background: 'transparent', border: 'none',
                                    color: '#94a3b8', padding: '1rem', fontSize: '0.85rem',
                                    resize: 'none', cursor: 'default', fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom: Situation Input & Template Management */}
                <div style={{ height: '220px', display: 'flex', gap: '1.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={20} color="var(--accent)" /> 3. Situation Prompts
                            </h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowTemplateModal(!showTemplateModal)}
                                    className="glass-button"
                                    style={{ fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <FolderOpen size={14} /> Templates
                                </button>
                                <button
                                    onClick={() => {
                                        const name = prompt('テンプレート名を入力してください:');
                                        if (name) handleSaveTemplate(name);
                                    }}
                                    disabled={!situationPrompts.trim()}
                                    className="glass-button"
                                    style={{ fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Save size={14} /> Save
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <textarea
                                value={situationPrompts}
                                onChange={(e) => setSituationPrompts(e.target.value)}
                                placeholder="Example:&#10;sitting on a chair&#10;running in the park..."
                                style={{
                                    width: '100%', height: '100%', borderRadius: '12px', border: '1px solid var(--border)',
                                    background: 'rgba(15, 23, 42, 0.4)', color: 'white', padding: '1rem',
                                    fontSize: '0.9rem', lineHeight: 1.5, resize: 'none', fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    </div>

                    {/* Template List (Small Sidebar style) */}
                    {showTemplateModal && (
                        <div className="glass-panel" style={{ width: '250px', display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>SAVED TEMPLATES</span>
                                <button onClick={() => setShowTemplateModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {Object.keys(situationTemplates).length === 0 ? (
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No saved templates</div>
                                ) : (
                                    Object.entries(situationTemplates).map(([name, content]) => (
                                        <div
                                            key={name}
                                            className="glass-panel"
                                            style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}
                                            onClick={() => setSituationPrompts(content)}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                            <button
                                                onClick={(e) => handleDeleteTemplate(e, name)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
