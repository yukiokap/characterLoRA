import React, { forwardRef } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Folder } from 'lucide-react';
import { LoraCard } from '../LoraCard';
import { type LoraFile, type LoraMeta } from '../../../api';
import { isSamePath } from '../utils';

interface LoraGridProps {
    loading: boolean;
    sortedFiles: LoraFile[];
    includeSubfolders: boolean;
    isGrouped: boolean;
    showDuplicatesOnly: boolean;
    flatItemsWithHeaders: any[];
    deferredCardScale: number;
    loraContainerRef: React.RefObject<HTMLDivElement | null>;
    sortMode: string;
    meta: LoraMeta;
    favLists: string[];
    selectedPaths: string[];
    onReorder: (draggedPath: string, targetPath: string, isBulk: boolean, isAfter?: boolean) => void;
    onUpdateMeta: (path: string, newMeta: any) => void;
    onShowTags: (file: LoraFile) => void;
    onShowDescription: (file: LoraFile) => void;
    onToggleFav: (file: LoraFile, list: string) => void;
    onDelete: () => void;
    onToggleSelect: (path: string) => void;
    onRegisterCharacter: (file: LoraFile) => void;
    getMetaValue: (p: string) => any;
}

export const LoraGrid: React.FC<LoraGridProps> = ({
    loading,
    sortedFiles,
    includeSubfolders,
    isGrouped,
    showDuplicatesOnly,
    flatItemsWithHeaders,
    deferredCardScale,
    loraContainerRef,
    sortMode,
    favLists,
    selectedPaths,
    onReorder,
    onUpdateMeta,
    onShowTags,
    onShowDescription,
    onToggleFav,
    onDelete,
    onToggleSelect,
    onRegisterCharacter,
    getMetaValue
}) => {
    const gridComponents = React.useMemo(() => ({
        List: forwardRef(({ style, children, ...props }: any, ref) => (
            <div
                ref={ref}
                {...props}
                style={{
                    ...style,
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fill, minmax(${200 * deferredCardScale}px, 1fr))`,
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
    }), [deferredCardScale]);

    if (loading) return <div>Loading...</div>;
    if (sortedFiles.length === 0) return <div style={{ color: 'var(--text-secondary)' }}>No LoRA files found. Check your directory settings.</div>;
    if (showDuplicatesOnly) return null; // Handled by DuplicateView

    if (includeSubfolders && isGrouped) {
        return (
            <VirtuosoGrid
                style={{ height: '100%' }}
                customScrollParent={loraContainerRef.current || undefined}
                totalCount={flatItemsWithHeaders.length}
                components={gridComponents}
                itemContent={(index) => {
                    const item = flatItemsWithHeaders[index];
                    if (!item) return null;

                    if (item.type === 'header') {
                        return (
                            <div style={{
                                gridColumn: '1 / -1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 0.5rem 0.5rem 0.5rem',
                                marginTop: index === 0 ? 0 : '1.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                marginBottom: '0.5rem',
                                color: 'var(--accent)',
                                fontWeight: 'bold',
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(10px)',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                borderRadius: '4px'
                            }}>
                                <Folder size={16} /> {item.folderPath}
                                <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 'normal' }}>({item.count} files)</span>
                            </div>
                        );
                    }

                    const file = item.file;
                    return (
                        <div
                            onDragOver={sortMode === 'custom' ? (e) => {
                                e.preventDefault();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const midpoint = rect.left + rect.width / 2;
                                if (e.clientX < midpoint) {
                                    e.currentTarget.style.borderLeft = '4px solid var(--accent)';
                                    e.currentTarget.style.borderRight = '2px solid transparent';
                                } else {
                                    e.currentTarget.style.borderRight = '4px solid var(--accent)';
                                    e.currentTarget.style.borderLeft = '2px solid transparent';
                                }
                                e.currentTarget.style.borderRadius = '8px';
                            } : undefined}
                            onDragLeave={(e) => {
                                e.currentTarget.style.borderLeft = '2px solid transparent';
                                e.currentTarget.style.borderRight = '2px solid transparent';
                            }}
                            onDrop={(e: any) => {
                                if (sortMode !== 'custom') return;
                                e.preventDefault();
                                e.stopPropagation();

                                const rect = e.currentTarget.getBoundingClientRect();
                                const midpoint = rect.left + rect.width / 2;
                                const isAfter = e.clientX >= midpoint;

                                e.currentTarget.style.borderLeft = '2px solid transparent';
                                e.currentTarget.style.borderRight = '2px solid transparent';

                                const sourcePath = e.dataTransfer.getData('sourcePath');
                                const isBulk = e.dataTransfer.getData('isBulk') === 'true';
                                if (sourcePath && !isSamePath(sourcePath, file.path)) {
                                    onReorder(sourcePath, file.path, isBulk, isAfter);
                                }
                            }}
                            style={{ borderLeft: '2px solid transparent', borderRight: '2px solid transparent', transition: 'all 0.1s', boxSizing: 'border-box' }}
                        >
                            <LoraCard
                                key={file.path}
                                file={file}
                                meta={getMetaValue(file.path)}
                                favLists={favLists}
                                onUpdateMeta={(m) => onUpdateMeta(file.path, m)}
                                onShowTags={() => onShowTags(file)}
                                onShowDescription={() => onShowDescription(file)}
                                onToggleFav={onToggleFav}
                                onDelete={onDelete}
                                scale={deferredCardScale}
                                showPath={false}
                                isSelected={selectedPaths.includes(file.path)}
                                onToggleSelect={() => onToggleSelect(file.path)}
                                onRegisterCharacter={() => onRegisterCharacter(file)}
                            />
                        </div>
                    );
                }}
            />
        );
    }

    // In non-grouped mode, show both files and folders
    const gridItems = sortedFiles;

    return (
        <VirtuosoGrid
            style={{ height: '100%' }}
            customScrollParent={loraContainerRef.current || undefined}
            totalCount={gridItems.length}
            components={gridComponents}
            itemContent={(index) => {
                const file = gridItems[index];
                if (!file) return null;
                return (
                    <div
                        onDragOver={sortMode === 'custom' ? (e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const midpoint = rect.left + rect.width / 2;
                            if (e.clientX < midpoint) {
                                e.currentTarget.style.borderLeft = '4px solid var(--accent)';
                                e.currentTarget.style.borderRight = '2px solid transparent';
                            } else {
                                e.currentTarget.style.borderRight = '4px solid var(--accent)';
                                e.currentTarget.style.borderLeft = '2px solid transparent';
                            }
                            e.currentTarget.style.borderRadius = '8px';
                        } : undefined}
                        onDragLeave={(e) => {
                            e.currentTarget.style.borderLeft = '2px solid transparent';
                            e.currentTarget.style.borderRight = '2px solid transparent';
                        }}
                        onDrop={(e: any) => {
                            if (sortMode !== 'custom') return;
                            e.preventDefault();
                            e.stopPropagation();

                            const rect = e.currentTarget.getBoundingClientRect();
                            const midpoint = rect.left + rect.width / 2;
                            const isAfter = e.clientX >= midpoint;

                            e.currentTarget.style.borderLeft = '2px solid transparent';
                            e.currentTarget.style.borderRight = '2px solid transparent';

                            const sourcePath = e.dataTransfer.getData('sourcePath');
                            const isBulk = e.dataTransfer.getData('isBulk') === 'true';
                            if (sourcePath && !isSamePath(sourcePath, file.path)) {
                                onReorder(sourcePath, file.path, isBulk, isAfter);
                            }
                        }}
                        style={{ borderLeft: '2px solid transparent', borderRight: '2px solid transparent', transition: 'all 0.1s', boxSizing: 'border-box' }}
                    >
                        <LoraCard
                            key={file.path}
                            file={file}
                            meta={getMetaValue(file.path)}
                            favLists={favLists}
                            onUpdateMeta={(m) => onUpdateMeta(file.path, m)}
                            onShowTags={() => onShowTags(file)}
                            onShowDescription={() => onShowDescription(file)}
                            onToggleFav={onToggleFav}
                            onDelete={onDelete}
                            scale={deferredCardScale}
                            showPath={includeSubfolders}
                            isSelected={selectedPaths.includes(file.path)}
                            selectedCount={selectedPaths.length}
                            onToggleSelect={() => onToggleSelect(file.path)}
                            onRegisterCharacter={() => onRegisterCharacter(file)}
                        />
                    </div>
                );
            }}
        />
    );
};
