import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import {
    getLoraFiles, updateLoraMeta, updateLoraMetaBatch, createLoraFolder,
    getAppConfig, moveLoraNode, moveLoraNodesBatch,
    getLists, saveLists, renameList, deleteList, type LoraFile, type LoraMeta, api
} from '../../../api';
import toast from 'react-hot-toast';
import { normalizePath, isSamePath } from '../utils';

export const useLoraManager = () => {
    const [files, setFiles] = useState<LoraFile[]>([]);
    const [meta, setMeta] = useState<LoraMeta>({});
    const [currentPath, setCurrentPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLoraForTags, setSelectedLoraForTags] = useState<LoraFile | null>(null);
    const [selectedLoraForDescription, setSelectedLoraForDescription] = useState<LoraFile | null>(null);
    const [fetchedDescription, setFetchedDescription] = useState<string | null>(null);
    const [loadingDescription, setLoadingDescription] = useState(false);
    const [fetchedImages, setFetchedImages] = useState<any[]>([]);
    const [sortMode, setSortMode] = useState<'name' | 'custom'>('custom');
    const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number, name: string, isAnalyzing?: boolean } | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [cardScale, setCardScale] = useState(1);
    const deferredCardScale = useDeferredValue(cardScale);
    const [includeSubfolders, setIncludeSubfolders] = useState(false);
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [favLists, setFavLists] = useState<string[]>([]);
    const [selectedFavList, setSelectedFavList] = useState<string | null>(null);
    const [isGrouped, setIsGrouped] = useState(true);
    const loraContainerRef = useRef<HTMLDivElement>(null);

    const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

    const getMetaValue = (p: string) => {
        if (meta[p]) return meta[p];
        const norm = normalizePath(p);
        const key = Object.keys(meta).find(k => normalizePath(k) === norm);
        return key ? meta[key] : null;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [data, lists] = await Promise.all([getLoraFiles(), getLists()]);
            setFiles(data.files || []);
            const normalizedMeta: LoraMeta = {};
            if (data.meta) {
                Object.entries(data.meta).forEach(([k, v]) => {
                    normalizedMeta[normalizePath(k)] = v;
                });
            }
            setMeta(normalizedMeta);
            setFavLists(lists || []);
        } catch (e: any) {
            console.error(e);
            toast.error('LoRAデータの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchWithDelay = () => {
        setLoading(true);
        setTimeout(() => fetchData(), 1000);
    };

    useEffect(() => {
        fetchData();
        getAppConfig().then(c => {
            if (c.pinnedFolders) setPinnedFolders(c.pinnedFolders);
        });
        const refreshHandler = () => fetchData();
        window.addEventListener('lora-update', refreshHandler);
        window.addEventListener('character-update', refreshHandler);
        return () => {
            window.removeEventListener('lora-update', refreshHandler);
            window.removeEventListener('character-update', refreshHandler);
        };
    }, []);

    useEffect(() => {
        const handleBulkMove = async (e: any) => {
            const destPath = e.detail?.destPath;
            if (!destPath) return;
            setSelectedPaths(currentPaths => {
                const pathsToMove = currentPaths.filter(p => !isSamePath(p, destPath));
                if (pathsToMove.length > 0) {
                    moveLoraNodesBatch(pathsToMove, destPath)
                        .then(() => {
                            fetchData();
                            toast.success('移動しました');
                        })
                        .catch((err: any) => toast.error('移動に失敗しました: ' + (err.response?.data?.error || err.message)));
                }
                return [];
            });
        };
        const moveHandler = async (e: any) => {
            const { sourcePath } = e.detail;
            try {
                await moveLoraNode(sourcePath, '');
                handleFetchWithDelay();
            } catch (error: any) {
                toast.error('移動に失敗しました: ' + (error.response?.data?.error || error.message));
            }
        };

        window.addEventListener('lora-bulk-move', handleBulkMove);
        window.addEventListener('lora-move-to-root' as any, moveHandler);
        return () => {
            window.removeEventListener('lora-bulk-move', handleBulkMove);
            window.removeEventListener('lora-move-to-root' as any, moveHandler);
        };
    }, []);

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
        if (!confirm(`リスト「${name}」を削除しますか？\n\n注意：このリストに含まれるLoRAからタグが削除されます。`)) return;
        try {
            const updatedLists = await deleteList(name);
            setFavLists(updatedLists);
            if (selectedFavList === name) setSelectedFavList(null);
            fetchData();
        } catch (e) {
            alert('削除できませんでした。');
        }
    };

    const handleToggleLoraFav = async (file: LoraFile, listName: string) => {
        const normPath = normalizePath(file.path);
        const currentMeta = getMetaValue(normPath) || {};
        const currentLists = currentMeta.favoriteLists || [];
        const isIncluded = currentLists.includes(listName);
        const newLists = isIncluded ? currentLists.filter(l => l !== listName) : [...currentLists, listName];

        // Optimistic update
        setMeta(prev => ({ ...prev, [normPath]: { ...currentMeta, favoriteLists: newLists } }));

        try {
            await updateLoraMeta(normPath, { favoriteLists: newLists });
        } catch (e) {
            // Revert on error
            setMeta(prev => ({ ...prev, [normPath]: currentMeta }));
            alert('お気に入りの更新に失敗しました');
        }
    };

    const handleAddLoraToFavList = async (path: string, listName: string) => {
        const normPath = normalizePath(path);
        const currentMeta = getMetaValue(normPath) || {};
        const currentLists = currentMeta.favoriteLists || [];
        if (!currentLists.includes(listName)) {
            const newLists = [...currentLists, listName];
            setMeta(prev => ({ ...prev, [normPath]: { ...currentMeta, favoriteLists: newLists } }));
            try {
                await updateLoraMeta(normPath, { favoriteLists: newLists });
            } catch (e) {
                setMeta(prev => ({ ...prev, [normPath]: currentMeta }));
            }
        }
    };

    const handleDropOnFavList = async (e: any, listName: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.border = '1px solid transparent';
        const sourcePath = e.dataTransfer.getData('sourcePath');
        const isBulk = e.dataTransfer.getData('isBulk') === 'true';
        if (isBulk && selectedPaths.length > 0) {
            for (const p of selectedPaths) await handleAddLoraToFavList(p, listName);
        } else if (sourcePath) {
            await handleAddLoraToFavList(sourcePath, listName);
        }
    };

    const handleSelectFolder = (path: string, clearFav: boolean = true) => {
        setCurrentPath(path);
        if (clearFav) setSelectedFavList(null);
    };

    const handleRegisterCharacter = async (lora: LoraFile) => {
        const name = prompt('キャラクター名を入力してください', (meta[lora.path]?.alias || lora.name.split('.')[0]));
        if (!name) return;
        try {
            const rawWords = meta[lora.path]?.triggerWords?.split(',').map((w: string) => w.trim()).filter(Boolean) || lora.trainedWords || [];
            let baseTags: string[] = [];
            let variations: any[] = [];
            const appCfg = await getAppConfig();
            if (appCfg.geminiApiKey && confirm('AIを使用してタグの仕分け（基本特徴 vs 衣装）を行いますか？')) {
                setBulkProgress({ current: 0, total: 1, name: lora.name, isAnalyzing: true });
                try {
                    const analysis = await api.post('/loras/analyze-tags', { triggerWords: rawWords });
                    baseTags = analysis.data.base;
                    variations = analysis.data.variations;
                } catch (e) {
                    baseTags = rawWords;
                }
                setBulkProgress(null);
            } else {
                baseTags = rawWords;
            }
            const previewUrl = lora.previewPath ? `/api/loras/image?path=${encodeURIComponent(lora.previewPath)}` : null;
            if (variations.length === 0 && previewUrl) variations = [{ id: `v-${Date.now()}`, name: '通常衣装', prompts: [] }];

            const pathParts = lora.path.split(/[\\\/]/);
            const series = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '未分類';
            const loraTagName = lora.name.replace(/\.[^/.]+$/, "");
            const payload = {
                name, series,
                basePrompts: [`<lora:${loraTagName}:1>`, ...baseTags],
                variations: variations.map(v => ({ ...v, image: previewUrl })),
                notes: `LoRA: ${lora.path}`,
                loras: [{ path: lora.path, weight: 1 }]
            };
            await api.post('/characters', payload);
            window.dispatchEvent(new CustomEvent('character-update'));
            toast.success('キャラクターとして登録しました');
        } catch (e) {
            toast.error('登録に失敗しました');
        }
    };

    const flattenFiles = (nodes: LoraFile[]): LoraFile[] => {
        let result: LoraFile[] = [];
        for (const node of nodes) {
            if (node.type === 'file') result.push(node);
            if (node.children) result.push(...flattenFiles(node.children));
        }
        return result;
    };

    const handleBulkRegisterCharacters = async () => {
        if (selectedPaths.length === 0 || !confirm(`${selectedPaths.length}件のLoRAをキャラクターとして一括登録しますか？`)) return;
        const appCfg = await getAppConfig();
        const useAI = appCfg.geminiApiKey && confirm('AIを使用して全アイテムのタグを自動的に仕分けますか？');
        let successCount = 0;
        setBulkProgress({ current: 0, total: selectedPaths.length, name: '' });
        const allFilesFlat = flattenFiles(files);
        for (let i = 0; i < selectedPaths.length; i++) {
            const path = selectedPaths[i];
            const lora = allFilesFlat.find(f => isSamePath(f.path, path));
            if (!lora) continue;
            setBulkProgress({ current: i + 1, total: selectedPaths.length, name: lora.name, isAnalyzing: false });
            try {
                const rawWords = meta[lora.path]?.triggerWords?.split(',').map((w: string) => w.trim()).filter(Boolean) || lora.trainedWords || [];
                let baseTags = rawWords;
                let variations: any[] = [];
                if (useAI) {
                    setBulkProgress(prev => prev ? { ...prev, isAnalyzing: true } : null);
                    try {
                        const analysis = await api.post('/loras/analyze-tags', { triggerWords: rawWords });
                        baseTags = analysis.data.base;
                        variations = analysis.data.variations;
                    } catch (e) { }
                    setBulkProgress(prev => prev ? { ...prev, isAnalyzing: false } : null);
                }
                const previewUrl = lora.previewPath ? `/api/loras/image?path=${encodeURIComponent(lora.previewPath)}` : null;
                if (variations.length === 0 && previewUrl) variations = [{ id: `v-${Date.now()}-${i}`, name: '通常衣装', prompts: [] }];
                const pathParts = lora.path.split(/[\\\/]/);
                const series = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '未分類';
                const loraTagName = lora.name.replace(/\.[^/.]+$/, "");
                const payload = {
                    name: meta[lora.path]?.alias || lora.name.replace(/\.[^/.]+$/, ""),
                    series, basePrompts: [`<lora:${loraTagName}:1>`, ...baseTags],
                    variations: variations.map(v => ({ ...v, image: previewUrl })),
                    notes: `LoRA: ${lora.path}`,
                    loras: [{ path: lora.path, weight: 1 }]
                };
                await api.post('/characters', payload);
                successCount++;
            } catch (e) { }
        }
        setBulkProgress(null);
        window.dispatchEvent(new CustomEvent('character-update'));
        toast.success(`${successCount}件のキャラクターを登録しました`);
        setSelectedPaths([]);
    };

    const handleCreateFolder = async () => {
        const name = prompt("New Folder Name:");
        if (name) {
            await createLoraFolder(currentPath, name);
            handleFetchWithDelay();
        }
    };

    const findNode = (nodes: LoraFile[], path: string): LoraFile | null => {
        if (path === '') return { type: 'directory', name: 'Root', path: '', children: nodes };
        for (const node of nodes) {
            if (isSamePath(node.path, path)) return node;
            if (node.children) {
                const found = findNode(node.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const handleReorder = async (draggedPath: string, targetPath: string, isBulk: boolean = false) => {
        if (isSamePath(draggedPath, targetPath) || isReordering) return;
        setIsReordering(true);
        try {
            const getParent = (p: string) => p.includes('/') ? p.substring(0, p.lastIndexOf('/')) : (p.includes('\\') ? p.substring(0, p.lastIndexOf('\\')) : '');
            const parent = getParent(draggedPath);
            if (parent !== getParent(targetPath)) {
                setIsReordering(false);
                return;
            }
            const parentNode = findNode(files, parent);
            const siblings = parentNode?.children || files;
            const filesToReorder = siblings.filter(f => f.type === 'file');
            const sortedInFolder = [...filesToReorder].sort((a, b) => {
                const orderA = getMetaValue(a.path)?.order ?? 9999;
                const orderB = getMetaValue(b.path)?.order ?? 9999;
                return (orderA !== orderB) ? orderA - orderB : a.name.localeCompare(b.name);
            });
            const newFiles = [...sortedInFolder];
            if (isBulk && selectedPaths.includes(draggedPath)) {
                const itemsToMove = sortedInFolder.filter(f => selectedPaths.includes(f.path));
                const remainingItems = sortedInFolder.filter(f => !selectedPaths.includes(f.path));
                const targetIdx = remainingItems.findIndex(f => isSamePath(f.path, targetPath));
                if (targetIdx === -1) {
                    const originalTargetIdx = sortedInFolder.findIndex(f => isSamePath(f.path, targetPath));
                    const before = sortedInFolder.filter(f => !selectedPaths.includes(f.path));
                    const insertIdx = before.findIndex(f => sortedInFolder.indexOf(f) > originalTargetIdx);
                    newFiles.length = 0;
                    before.splice(insertIdx === -1 ? before.length : insertIdx, 0, ...itemsToMove);
                    newFiles.push(...before);
                } else {
                    remainingItems.splice(targetIdx, 0, ...itemsToMove);
                    newFiles.length = 0;
                    newFiles.push(...remainingItems);
                }
            } else {
                const dIdx = newFiles.findIndex(f => isSamePath(f.path, draggedPath));
                const tIdx = newFiles.findIndex(f => isSamePath(f.path, targetPath));
                if (dIdx !== -1 && tIdx !== -1) {
                    const [removed] = newFiles.splice(dIdx, 1);
                    newFiles.splice(tIdx, 0, removed);
                }
            }
            const newMeta = { ...meta };
            const updates = newFiles.map((f, index) => {
                const normPath = normalizePath(f.path);
                newMeta[normPath] = { ...(newMeta[normPath] || {}), order: index };
                return { path: normPath, data: { order: index } };
            });
            setMeta(newMeta);
            const res = await updateLoraMetaBatch(updates);
            if (res.success && isBulk) setSelectedPaths([]);
            await fetchData();
        } catch (e) {
            fetchData();
        } finally {
            setIsReordering(false);
        }
    };

    const findDuplicateSets = (allFiles: LoraFile[]): Array<LoraFile[]> => {
        const sets: Record<string, LoraFile[]> = {};
        allFiles.forEach(f => {
            // 1. 拡張子を除去
            // 2. 名末尾の " (1)" や "(2)" を除去
            // 3. 小文字化
            const normalizedName = f.name
                .replace(/\.(safetensors|pt|ckpt)$/i, '')
                .replace(/\s*\(\d+\)$/, '')
                .toLowerCase();

            // 名前（正規化済）とサイズの両方が一致する場合のみを重複とみなす
            // これにより、サイズが同じだけの別モデル（170件の誤検知）を防ぎます
            const key = `${normalizedName}-${f.size || 0}`;

            if (!sets[key]) sets[key] = [];
            sets[key].push(f);
        });
        return Object.values(sets).filter(s => s.length > 1);
    };

    const handleShowDescription = async (file: LoraFile, refresh: boolean = false) => {
        setSelectedLoraForDescription(file);
        if (!refresh) { setFetchedDescription(null); setFetchedImages([]); }
        let modelId: string | number | undefined = file.modelId;
        const fileMeta = getMetaValue(file.path);
        if (fileMeta?.civitaiUrl) {
            const match = fileMeta.civitaiUrl.match(/models\/(\d+)/);
            if (match) modelId = match[1];
        }
        if (modelId) {
            setLoadingDescription(true); setFetchedDescription(""); setFetchedImages([]);
            try {
                const res = await api.get(`/loras/model-description?modelId=${modelId}&loraPath=${encodeURIComponent(file.path)}${refresh ? '&refresh=true' : ''}`);
                if (!refresh && res.data.images?.length > 0) {
                    const urls = res.data.images.map((img: any) => img.url).filter(Boolean);
                    if (urls.length > 0) {
                        setMeta(prev => ({ ...prev, [normalizePath(file.path)]: { ...(prev[normalizePath(file.path)] || {}), civitaiImages: urls } }));
                    }
                }
                setFetchedDescription(res.data.description || "<p>Description not available.</p>");
                setFetchedImages(res.data.images || []);
            } catch (err) {
                setFetchedDescription("<p>Failed to load from Civitai.</p>");
                setFetchedImages([]);
            } finally { setLoadingDescription(false); }
        }
    };

    const currentNode = useMemo(() => findNode(files, currentPath), [files, currentPath]);
    const baseNodes = useMemo(() => currentNode?.children || files, [currentNode, files]);
    const currentFiles = useMemo(() => (includeSubfolders || showDuplicatesOnly) ? flattenFiles(baseNodes) : baseNodes, [includeSubfolders, showDuplicatesOnly, baseNodes]);
    const filteredFiles = useMemo(() => currentFiles.filter(f => {
        const mv = getMetaValue(f.path);
        return f.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedFavList ? mv?.favoriteLists?.includes(selectedFavList) : true);
    }), [currentFiles, searchQuery, selectedFavList, meta]);

    const duplicateSets = useMemo(() => showDuplicatesOnly ? findDuplicateSets(filteredFiles) : [], [showDuplicatesOnly, filteredFiles]);
    const sortedFiles = useMemo(() => [...filteredFiles].sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        if (sortMode === 'custom' && a.type === 'file' && b.type === 'file') {
            const oa = getMetaValue(a.path)?.order ?? 9999;
            const ob = getMetaValue(b.path)?.order ?? 9999;
            if (oa !== ob) return oa - ob;
        }
        return a.name.localeCompare(b.name);
    }), [filteredFiles, sortMode, meta]);

    const groupedFiles = useMemo(() => {
        const groups: Record<string, LoraFile[]> = {};
        sortedFiles.forEach(f => {
            // Use normalized path to determine parent
            const norm = normalizePath(f.path);
            const characters = norm.split('/');
            const parent = characters.length > 1 ? characters.slice(0, -1).join('/') : 'Root';

            if (!groups[parent]) groups[parent] = [];
            groups[parent].push(f);
        });
        return groups;
    }, [sortedFiles]);

    const flatItemsWithHeaders = useMemo(() => {
        if (!includeSubfolders || !isGrouped || showDuplicatesOnly) return [];
        const result: any[] = [];

        // Sort folder paths alphabetically, ensuring 'Root' comes first
        const sortedPaths = Object.keys(groupedFiles).sort((a, b) => {
            if (a === 'Root') return -1;
            if (b === 'Root') return 1;
            return a.localeCompare(b);
        });

        sortedPaths.forEach(path => {
            const items = groupedFiles[path];
            result.push({ type: 'header', folderPath: path, count: items.length });
            items.forEach(file => result.push({ type: 'item', file }));
        });
        return result;
    }, [includeSubfolders, isGrouped, showDuplicatesOnly, groupedFiles]);

    return {
        files, meta, setMeta, currentPath, loading, searchQuery, setSearchQuery,
        selectedLoraForTags, setSelectedLoraForTags, selectedLoraForDescription, setSelectedLoraForDescription,
        fetchedDescription, loadingDescription, fetchedImages, sortMode, setSortMode, bulkProgress, isReordering,
        cardScale, setCardScale, deferredCardScale, includeSubfolders, setIncludeSubfolders,
        showDuplicatesOnly, setShowDuplicatesOnly, selectedPaths, setSelectedPaths, favLists, selectedFavList,
        setSelectedFavList, isGrouped, setIsGrouped, loraContainerRef, pinnedFolders, setPinnedFolders,
        fetchData, handleFetchWithDelay, handleAddList, handleRenameList, handleDeleteList,
        handleToggleLoraFav, handleDropOnFavList, handleSelectFolder, handleRegisterCharacter,
        handleBulkRegisterCharacters, handleCreateFolder, handleReorder, handleShowDescription,
        sortedFiles, duplicateSets, flatItemsWithHeaders
    };
};
