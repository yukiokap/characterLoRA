import React, { useState, useEffect } from 'react';
import type { Character, Variation } from '../types';
import { uploadImage } from '../api';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    character?: Character | null;
    onSave: (char: Partial<Character>) => Promise<void>;
    onCancel: () => void;
}

export const CharacterForm: React.FC<Props> = ({ character, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [series, setSeries] = useState('');
    const [notes, setNotes] = useState('');
    const [basePrompts, setBasePrompts] = useState('');
    const [variations, setVariations] = useState<Variation[]>([]);
    const [activeVarIndex, setActiveVarIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (character) {
            setName(character.name);
            setSeries(character.series);
            setNotes(character.notes);
            setBasePrompts(character.basePrompts.join(', '));
            setVariations(character.variations);
            if (character.variations.length > 0) setActiveVarIndex(0);
        } else {
            // Default initial state for new character
            setVariations([{
                id: uuidv4(),
                name: '基本衣装',
                image: null,
                prompts: []
            }]);
        }
    }, [character]);

    const handleUpload = async (file: File, varIndex: number) => {
        setLoading(true);
        try {
            const url = await uploadImage(file);
            const newVars = [...variations];
            newVars[varIndex] = { ...newVars[varIndex], image: url };
            setVariations(newVars);
        } catch (err) {
            console.error("Upload failed", err);
            alert("画像のアップロードに失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, varIndex: number) => {
        if (e.target.files && e.target.files[0]) {
            await handleUpload(e.target.files[0], varIndex);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleUpload(e.dataTransfer.files[0], activeVarIndex);
        }
    };

    const addVariation = () => {
        setVariations([...variations, {
            id: uuidv4(),
            name: `衣装 ${variations.length + 1}`,
            image: null,
            prompts: []
        }]);
        setActiveVarIndex(variations.length);
    };

    const removeVariation = (index: number) => {
        if (variations.length <= 1) return;
        const newVars = variations.filter((_, i) => i !== index);
        setVariations(newVars);
        setActiveVarIndex(Math.max(0, activeVarIndex - 1));
    };

    const updateVariation = (index: number, field: keyof Variation, value: any) => {
        const newVars = [...variations];

        if (field === 'prompts') {
            const list = (value as string).split(/[,\n]/).map(p => p.trim()).filter(Boolean);
            newVars[index] = { ...newVars[index], prompts: list };
        } else {
            newVars[index] = { ...newVars[index], [field]: value };
        }
        setVariations(newVars);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const charData: Partial<Character> = {
            name,
            series: series || '未分類',
            notes,
            basePrompts: basePrompts.split(/[,\n]/).map(p => p.trim()).filter(Boolean),
            variations
        };

        try {
            await onSave(charData);
            onCancel();
        } catch (err) {
            console.error(err);
            alert('保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const currentVar = variations[activeVarIndex] || variations[0];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
            <div className="glass-panel" style={{ width: '95%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0 }}>{character ? 'キャラクター編集' : '新規キャラクター'}</h2>
                    <button onClick={onCancel} style={{ padding: '0.5rem', background: 'transparent' }}><X /></button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* Left: General Info */}
                    <div style={{ width: '300px', padding: '1.5rem', borderRight: '1px solid var(--card-border)', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label>名前 (Name)</label>
                                <input value={name} onChange={e => setName(e.target.value)} required placeholder="例: 初音ミク" />
                            </div>
                            <div>
                                <label>作品名・シリーズ (Series)</label>
                                <input value={series} onChange={e => setSeries(e.target.value)} list="series-list" placeholder="例: ボーカロイド" />
                                <datalist id="series-list">
                                    <option value="オリジナル" />
                                    <option value="アニメ" />
                                    <option value="ゲーム" />
                                </datalist>
                            </div>
                            <div>
                                <label>共通プロンプト (Base Prompts)</label>
                                <textarea
                                    value={basePrompts}
                                    onChange={e => setBasePrompts(e.target.value)}
                                    rows={6}
                                    placeholder="全衣装で共通する特徴 (髪色、目の色など)"
                                />
                                <small style={{ color: 'var(--text-secondary)' }}>※ここに書いたタグは全ての衣装で有効になります</small>
                            </div>
                            <div>
                                <label>メモ (Notes)</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Variations */}
                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {variations.map((v, i) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVarIndex(i)}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        background: activeVarIndex === i ? 'var(--accent)' : 'var(--bg-secondary)',
                                        color: activeVarIndex === i ? '#fff' : 'var(--text-primary)',
                                        border: '1px solid var(--card-border)'
                                    }}
                                >
                                    {v.name || '名称未設定'}
                                </button>
                            ))}
                            <button onClick={addVariation} style={{ background: 'transparent', border: '1px dashed var(--text-secondary)' }}>
                                <Plus size={16} /> 追加
                            </button>
                        </div>

                        {currentVar && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0 }}>現在の衣装設定</h3>
                                    {variations.length > 1 && (
                                        <button onClick={() => removeVariation(activeVarIndex)} className="btn-danger" style={{ padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}>
                                            <Trash2 size={14} style={{ marginRight: '4px' }} /> 削除
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem' }}>

                                    {/* Image Upload */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            style={{
                                                width: '100%', height: '250px',
                                                background: dragActive ? 'rgba(56, 189, 248, 0.2)' : '#000',
                                                border: dragActive ? '2px dashed #38bdf8' : '1px solid var(--card-border)',
                                                borderRadius: '8px', overflow: 'hidden',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s', position: 'relative'
                                            }}
                                        >
                                            {dragActive && (
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.5)', zIndex: 10, pointerEvents: 'none'
                                                }}>
                                                    <span style={{ color: 'white', fontWeight: 'bold' }}>ドロップしてアップロード</span>
                                                </div>
                                            )}
                                            {currentVar.image ? (
                                                <img src={currentVar.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)' }}>No Image (Drop Here)</span>
                                            )}
                                        </div>
                                        <label className="btn-primary" style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
                                            <Upload size={16} style={{ marginRight: '5px' }} /> 画像を変更
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, activeVarIndex)} hidden />
                                        </label>
                                    </div>

                                    {/* Variation Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label>衣装・バリエーション名</label>
                                            <input
                                                value={currentVar.name}
                                                onChange={e => updateVariation(activeVarIndex, 'name', e.target.value)}
                                                placeholder="例: 夏服、メイド服"
                                            />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <label>この衣装専用のプロンプト</label>
                                            <textarea
                                                style={{ flex: 1, minHeight: '150px' }}
                                                value={currentVar.prompts.join(', ')}
                                                onChange={e => updateVariation(activeVarIndex, 'prompts', e.target.value)}
                                                placeholder="例: school uniform, red ribbon, ..."
                                            />
                                        </div>
                                    </div>

                                </div>

                            </div>
                        )}

                    </div>

                </div>

                {/* Footer */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={onCancel}>キャンセル</button>
                    <button type="button" onClick={handleSubmit} className="btn-primary" disabled={loading}>
                        {loading ? '保存中...' : '保存'}
                    </button>
                </div>

            </div>
        </div>
    );
};
