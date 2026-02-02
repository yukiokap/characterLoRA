import React, { useState } from 'react';
import type { Character } from '../types';
import { Edit2, Trash2, Copy, Check, ChevronLeft, ChevronRight, Heart, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    character: Character;
    favLists: string[];
    activeVarIndex: number;
    onVarChange: (index: number) => void;
    onToggleFav: (char: Character, list: string) => void;
    onEdit: (char: Character) => void;
    onDelete: (id: string) => void;
    dragHandleProps?: any;
}

export const CharacterCard: React.FC<Props> = ({ character, favLists, activeVarIndex, onVarChange, onToggleFav, onEdit, onDelete, dragHandleProps }) => {
    const [copied, setCopied] = useState(false);
    const [showFavMenu, setShowFavMenu] = useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const variations = character.variations || [];
    const currentVar = variations[activeVarIndex] || variations[0] || { name: 'Default', image: null, prompts: [] };

    // Default Fav List
    const defaultFav = "お気に入り";
    const isDefaultFav = character.favoriteLists?.includes(defaultFav);

    // Safety check
    if (!currentVar) return null;

    const handleCopy = () => {
        const base = character.basePrompts || [];
        const variant = currentVar.prompts || [];
        const combined = [...base, ...variant];
        const text = combined.join(', ');

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const nextVar = (e: React.MouseEvent) => {
        e.stopPropagation();
        onVarChange((activeVarIndex + 1) % variations.length);
    };

    const prevVar = (e: React.MouseEvent) => {
        e.stopPropagation();
        onVarChange((activeVarIndex - 1 + variations.length) % variations.length);
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ position: 'relative', background: '#000' }}>

                {/* Image Area */}
                <div style={{ width: '100%', aspectRatio: '3/4', position: 'relative' }}>
                    {currentVar.image ? (
                        <img src={currentVar.image} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <span style={{ fontSize: '3rem' }}>?</span>
                        </div>
                    )}

                    {/* Navigation Arrows */}
                    {variations.length > 1 && (
                        <>
                            <button
                                onClick={prevVar}
                                style={{
                                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                    padding: '8px', color: 'white'
                                }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={nextVar}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                    padding: '8px', color: 'white'
                                }}
                            >
                                <ChevronRight size={20} />
                            </button>

                            {/* Dots Indicator */}
                            <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                {variations.map((_, i) => (
                                    <div key={i} style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: i === activeVarIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                        transition: 'background 0.3s'
                                    }} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Variation Name Badge */}
                    <div style={{
                        position: 'absolute', bottom: '10px', left: '10px',
                        background: 'rgba(0,0,0,0.7)', color: 'white',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                        backdropFilter: 'blur(4px)'
                    }}>
                        {currentVar.name}
                    </div>
                </div>

                {/* Top Buttons (Edit/Delete/Copy) */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                    {/* Drag Handle */}
                    {dragHandleProps && (
                        <div
                            {...dragHandleProps}
                            style={{
                                padding: '6px',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '50%',
                                color: 'rgba(255,255,255,0.7)',
                                cursor: 'grab',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <GripHorizontal size={16} />
                        </div>
                    )}

                    {/* Heart / Fav Button */}
                    <div
                        style={{ position: 'relative' }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <button
                            onClick={() => onToggleFav(character, defaultFav)}
                            style={{
                                padding: '6px',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '50%',
                                color: isDefaultFav ? '#ef4444' : 'white'
                            }}
                        >
                            <Heart size={16} fill={isDefaultFav ? "currentColor" : "none"} />
                        </button>

                        {showFavMenu && (
                            <div
                                style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: '5px',
                                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px', padding: '0.5rem', zIndex: 10,
                                    width: '140px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                }}
                            >
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>リストに追加</div>
                                {favLists.map(list => {
                                    const isActive = character.favoriteLists?.includes(list);
                                    return (
                                        <div
                                            key={list}
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevent modal close etc
                                                onToggleFav(character, list);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '4px', cursor: 'pointer', fontSize: '0.85rem',
                                                color: isActive ? '#fca5a5' : 'white'
                                            }}
                                        >
                                            <Heart size={12} fill={isActive ? "currentColor" : "none"} /> {list}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleCopy}
                        title="プロンプトをコピー"
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%' }}
                    >
                        {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                    </button>
                    <button
                        onClick={() => onEdit(character)}
                        title="編集"
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%' }}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(character.id)}
                        title="削除"
                        style={{ padding: '6px', background: 'rgba(220, 38, 38, 0.8)', borderRadius: '50%', color: 'white' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Info Area */}
            <div style={{ padding: '1rem', flex: 1 }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{character.name}</h3>
                <div style={{ marginBottom: '0.5rem' }}>
                    <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>
                        {character.series}
                    </span>
                </div>

                {/* Show combined tags preview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {/* Base tags in one color */}
                    {character.basePrompts?.slice(0, 3).map((tag, i) => (
                        <span key={`base-${i}`} className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc' }}>
                            {tag}
                        </span>
                    ))}
                    {/* Variation tags in another */}
                    {currentVar.prompts?.slice(0, 3).map((tag, i) => (
                        <span key={`var-${i}`} className="badge">
                            {tag}
                        </span>
                    ))}

                    {(character.basePrompts?.length || 0) + (currentVar.prompts?.length || 0) > 6 && (
                        <span className="badge" style={{ background: 'transparent', color: '#94a3b8' }}>
                            ...
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
