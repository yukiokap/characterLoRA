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

    // Check if in any favorite list
    const isInAnyList = (character.favoriteLists?.length ?? 0) > 0;

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
        }, 300);
    };

    const toggleFavMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowFavMenu(!showFavMenu);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flex: 1,
                minHeight: '450px', // Fixed minimum height for consistency
                maxHeight: '450px',  // Fixed maximum height for consistency
                zIndex: showFavMenu ? 100 : 1
            }}
        >

            <div style={{ position: 'relative', background: '#000', flex: '0 0 auto', borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }}>
                {/* Image Area */}
                <div style={{ width: '100%', aspectRatio: '3/4', position: 'relative', overflow: 'hidden', borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }}>
                    {currentVar.image ? (
                        <img src={currentVar.image} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <span style={{ fontSize: '3rem' }}>?</span>
                        </div>
                    )}

                    {/* Character Name & Series Overlay (Bottom) */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
                        padding: '2rem 1rem 0.75rem 1rem'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'white',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            {character.name}
                        </h3>
                        <div style={{ marginTop: '0.25rem' }}>
                            <span className="badge" style={{
                                background: 'rgba(168, 85, 247, 0.3)',
                                color: '#e9d5ff',
                                fontSize: '0.75rem'
                            }}>
                                {character.series}
                            </span>
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    {variations.length > 1 && (
                        <>
                            <button
                                onClick={prevVar}
                                style={{
                                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                    padding: '8px', color: 'white', cursor: 'pointer'
                                }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={nextVar}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                    padding: '8px', color: 'white', cursor: 'pointer'
                                }}
                            >
                                <ChevronRight size={20} />
                            </button>

                            {/* Dots Indicator */}
                            <div style={{ position: 'absolute', top: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                {variations.map((_, i) => (
                                    <div key={i} style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: i === activeVarIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                        transition: 'background 0.3s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }} />
                                ))}
                            </div>
                        </>
                    )}
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
                            onClick={toggleFavMenu}
                            style={{
                                padding: '6px',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '50%',
                                color: isInAnyList ? '#ef4444' : 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <Heart size={16} fill={isInAnyList ? "currentColor" : "none"} />
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
                                                e.stopPropagation();
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
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white' }}
                    >
                        {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                    </button>
                    <button
                        onClick={() => onEdit(character)}
                        title="編集"
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white' }}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(character.id)}
                        title="削除"
                        style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.8)', borderRadius: '50%', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Variations List - Scrollable */}
            <div style={{
                padding: '0.75rem 1rem',
                flex: '1 1 auto',
                overflowY: 'auto',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                maxHeight: '120px', // Limit height for scrolling
                borderBottomLeftRadius: '11px',
                borderBottomRightRadius: '11px'
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    衣装バリエーション ({variations.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {variations.map((variant, idx) => (
                        <div
                            key={idx}
                            onClick={() => onVarChange(idx)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                background: idx === activeVarIndex ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: idx === activeVarIndex ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => {
                                if (idx !== activeVarIndex) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (idx !== activeVarIndex) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }
                            }}
                        >
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: idx === activeVarIndex ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                flexShrink: 0
                            }} />
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: idx === activeVarIndex ? 'white' : 'var(--text-secondary)'
                            }}>
                                {variant.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
