import React from 'react';
import { Copy } from 'lucide-react';
import { LoraCard } from '../LoraCard';
import { type LoraFile, type LoraMeta } from '../../../api';
import { formatSize } from '../utils';

interface DuplicateViewProps {
    duplicateSets: Array<LoraFile[]>;
    meta: LoraMeta;
    favLists: string[];
    cardScale: number;
    selectedPaths: string[];
    onUpdateMeta: (path: string, newMeta: any) => void;
    onShowTags: (file: LoraFile) => void;
    onShowDescription: (file: LoraFile) => void;
    onToggleFav: (file: LoraFile, list: string) => void;
    onDelete: () => void;
    onToggleSelect: (path: string) => void;
    onRegisterCharacter: (file: LoraFile) => void;
}

export const DuplicateView: React.FC<DuplicateViewProps> = ({
    duplicateSets,
    meta,
    favLists,
    cardScale,
    selectedPaths,
    onUpdateMeta,
    onShowTags,
    onShowDescription,
    onToggleFav,
    onDelete,
    onToggleSelect,
    onRegisterCharacter
}) => {
    if (duplicateSets.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                重複したファイルは見つかりませんでした。
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {duplicateSets.map((set, idx) => (
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
                                onUpdateMeta={(newMeta) => onUpdateMeta(file.path, newMeta)}
                                onShowTags={() => onShowTags(file)}
                                onShowDescription={() => onShowDescription(file)}
                                onToggleFav={onToggleFav}
                                onDelete={onDelete}
                                scale={cardScale}
                                showPath={true}
                                isSelected={selectedPaths.includes(file.path)}
                                onToggleSelect={() => onToggleSelect(file.path)}
                                onRegisterCharacter={() => onRegisterCharacter(file)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
