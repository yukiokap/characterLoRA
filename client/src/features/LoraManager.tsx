import { updateAppConfig } from '../api';
import { normalizePath } from './lora/utils';
import { TagSidebar } from './lora/TagSidebar';
import { DescriptionModal } from './lora/DescriptionModal';
import { BulkProgress } from './lora/BulkProgress';
import { FilterBar } from './lora/FilterBar';
import { Sidebar } from './lora/Sidebar';
import { LoraGrid } from './lora/components/LoraGrid';
import { DuplicateView } from './lora/components/DuplicateView';
import { useLoraManager } from './lora/hooks/useLoraManager';

export const LoraManager = () => {
    const {
        files, meta, setMeta, currentPath, loading, searchQuery, setSearchQuery,
        selectedLoraForTags, setSelectedLoraForTags, selectedLoraForDescription, setSelectedLoraForDescription,
        fetchedDescription, loadingDescription, fetchedImages, sortMode, setSortMode, bulkProgress, isReordering,
        cardScale, setCardScale, deferredCardScale, includeSubfolders, setIncludeSubfolders,
        showDuplicatesOnly, setShowDuplicatesOnly, selectedPaths, setSelectedPaths, favLists, selectedFavList,
        setSelectedFavList, isGrouped, setIsGrouped, loraContainerRef, pinnedFolders, setPinnedFolders,
        handleFetchWithDelay, handleAddList, handleRenameList, handleDeleteList,
        handleToggleLoraFav, handleDropOnFavList, handleSelectFolder, handleRegisterCharacter,
        handleBulkRegisterCharacters, handleCreateFolder, handleReorder, handleShowDescription,
        sortedFiles, duplicateSets, flatItemsWithHeaders
    } = useLoraManager();

    const getMetaValue = (p: string) => {
        if (meta[p]) return meta[p];
        const norm = normalizePath(p);
        const key = Object.keys(meta).find(k => normalizePath(k) === norm);
        return key ? meta[key] : null;
    };

    return (
        <div className="layout" style={{ height: '100%', display: 'flex', position: 'relative' }}>
            <Sidebar
                files={files}
                currentPath={currentPath}
                onSelectFolder={handleSelectFolder}
                pinnedFolders={pinnedFolders}
                onTogglePin={async (path) => {
                    const isPinned = pinnedFolders.includes(path);
                    const newPinned = isPinned ? pinnedFolders.filter(p => p !== path) : [...pinnedFolders, path];
                    await updateAppConfig({ pinnedFolders: newPinned });
                    setPinnedFolders(newPinned);
                }}
                selectedCount={selectedPaths.length}
                onUpdate={handleFetchWithDelay}
                favLists={favLists}
                selectedFavList={selectedFavList}
                onSelectFavList={(list) => {
                    setSelectedFavList(list);
                    if (list) {
                        handleSelectFolder('', false);
                        setIncludeSubfolders(true);
                    }
                }}
                onAddList={handleAddList}
                onRenameList={handleRenameList}
                onDeleteList={handleDeleteList}
                onDropOnFavList={handleDropOnFavList}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
            />

            <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <FilterBar
                    currentPath={currentPath}
                    onCreateFolder={handleCreateFolder}
                    selectedCount={selectedPaths.length}
                    onClearSelection={() => setSelectedPaths([])}
                    cardScale={cardScale}
                    onCardScaleChange={setCardScale}
                    sortMode={sortMode}
                    onSortModeChange={setSortMode}
                    showDuplicatesOnly={showDuplicatesOnly}
                    onToggleDuplicates={() => {
                        setShowDuplicatesOnly(!showDuplicatesOnly);
                        if (!showDuplicatesOnly) setIncludeSubfolders(true);
                    }}
                    includeSubfolders={includeSubfolders}
                    onToggleSubfolders={() => {
                        setIncludeSubfolders(!includeSubfolders);
                        if (!includeSubfolders) setShowDuplicatesOnly(false);
                    }}
                    isGrouped={isGrouped}
                    onToggleGrouped={() => setIsGrouped(!isGrouped)}
                    onBulkRegister={handleBulkRegisterCharacters}
                    itemCount={sortedFiles.filter(f => f.type === 'file').length}
                />
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 2rem 2rem 2rem' }} ref={loraContainerRef}>
                    {showDuplicatesOnly ? (
                        <DuplicateView
                            duplicateSets={duplicateSets}
                            meta={meta}
                            favLists={favLists}
                            cardScale={cardScale}
                            selectedPaths={selectedPaths}
                            onUpdateMeta={(path, m) => setMeta(prev => ({ ...prev, [path]: m }))}
                            onShowTags={setSelectedLoraForTags}
                            onShowDescription={handleShowDescription}
                            onToggleFav={handleToggleLoraFav}
                            onDelete={handleFetchWithDelay}
                            onToggleSelect={(path) => setSelectedPaths(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])}
                            onRegisterCharacter={handleRegisterCharacter}
                        />
                    ) : (
                        <LoraGrid
                            loading={loading}
                            sortedFiles={sortedFiles}
                            includeSubfolders={includeSubfolders}
                            isGrouped={isGrouped}
                            showDuplicatesOnly={showDuplicatesOnly}
                            flatItemsWithHeaders={flatItemsWithHeaders}
                            deferredCardScale={deferredCardScale}
                            loraContainerRef={loraContainerRef}
                            sortMode={sortMode}
                            meta={meta}
                            favLists={favLists}
                            selectedPaths={selectedPaths}
                            onReorder={handleReorder}
                            onUpdateMeta={(path, m) => setMeta(prev => ({ ...prev, [normalizePath(path)]: m }))}
                            onShowTags={setSelectedLoraForTags}
                            onShowDescription={handleShowDescription}
                            onToggleFav={handleToggleLoraFav}
                            onDelete={handleFetchWithDelay}
                            onToggleSelect={(path) => setSelectedPaths(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])}
                            onRegisterCharacter={handleRegisterCharacter}
                            getMetaValue={getMetaValue}
                        />
                    )}
                </div>
            </main>

            <DescriptionModal
                file={selectedLoraForDescription}
                meta={meta[selectedLoraForDescription?.path || '']}
                loading={loadingDescription}
                images={fetchedImages}
                description={fetchedDescription}
                onClose={() => setSelectedLoraForDescription(null)}
                onRefresh={() => handleShowDescription(selectedLoraForDescription!, true)}
            />

            {isReordering && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
                    <div className="glass-panel" style={{ padding: '1rem 2rem' }}>Updating Order...</div>
                </div>
            )}

            {selectedLoraForTags && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setSelectedLoraForTags(null)}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} />
                    <div onClick={e => e.stopPropagation()}>
                        <TagSidebar
                            file={selectedLoraForTags}
                            meta={meta[normalizePath(selectedLoraForTags.path)]}
                            onUpdateMeta={(newMeta) => setMeta(prev => ({ ...prev, [normalizePath(selectedLoraForTags.path)]: newMeta }))}
                            onClose={() => setSelectedLoraForTags(null)}
                        />
                    </div>
                </div>
            )}

            <BulkProgress progress={bulkProgress} />
        </div>
    );
};
