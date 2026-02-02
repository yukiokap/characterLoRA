import axios from 'axios';
import type { Character } from './types';

export const api = axios.create({
    baseURL: '/api'
});

export const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
};

export const getCharacters = async () => {
    const res = await api.get<Character[]>('/characters');
    return res.data;
};

export const createCharacter = async (character: Partial<Character>) => {
    const res = await api.post<Character>('/characters', character);
    return res.data;
};

export const updateCharacter = async (id: string, character: Partial<Character>) => {
    const res = await api.put<Character>(`/characters/${id}`, character);
    return res.data;
};

export const deleteCharacter = async (id: string) => {
    await api.delete(`/characters/${id}`);
};

export const getLists = async () => {
    const res = await api.get<string[]>('/lists');
    return res.data;
};

export const saveLists = async (lists: string[]) => {
    const res = await api.post<string[]>('/lists', { lists });
    return res.data;
};

export const reorderCharacters = async (characters: Character[]) => {
    await api.put('/characters/order', { characters });
};

export const renameList = async (oldName: string, newName: string) => {
    const res = await api.put<{ lists: string[] }>(`/lists/${encodeURIComponent(oldName)}`, { newName });
    return res.data.lists;
};

export const deleteList = async (name: string) => {
    const res = await api.delete<{ lists: string[] }>(`/lists/${encodeURIComponent(name)}`);
    return res.data.lists;
};


// --- LoRA Types & APIs ---

export interface LoraFile {
    type: 'file' | 'directory';
    name: string;
    path: string; // relative path
    size?: number;
    children?: LoraFile[];
    previewPath?: string;
    civitaiUrl?: string;
    trainedWords?: string[];
    mtime?: string | Date;
    modelId?: number;
    localVersionId?: number;
    civitaiImages?: string[];
    description?: string;
}

export interface LoraMeta {
    [path: string]: {
        triggerWords?: string;
        notes?: string;
        favorite?: boolean;
        civitaiUrl?: string;
        order?: number;
        customTags?: string[];
        favoriteLists?: string[];
        tagImages?: Record<string, string>;
    };
}

export interface AppConfig {
    loraDir: string;
}

export const getAppConfig = async () => {
    const res = await api.get<AppConfig>('/config');
    return res.data;
};

export const updateAppConfig = async (config: Partial<AppConfig>) => {
    const res = await api.put<AppConfig>('/config', config);
    return res.data;
};

export const getLoraFiles = async () => {
    const res = await api.get<{ files: LoraFile[], meta: LoraMeta, rootDir: string }>('/loras/files');
    return res.data;
};

export const updateLoraMeta = async (path: string, data: any) => {
    const res = await api.put('/loras/meta', { path, data });
    return res.data;
};

export const updateLoraMetaBatch = async (updates: { path: string, data: any }[]) => {
    const res = await api.post('/loras/meta/batch', { updates });
    return res.data;
};

export const createLoraFolder = async (parentPath: string, name: string) => {
    const res = await api.post('/loras/folder', { parentPath, name });
    return res.data;
};

export const renameLoraNode = async (currentPath: string, newName: string) => {
    const res = await api.put('/loras/rename', { currentPath, newName });
    return res.data;
};

export const deleteLoraNode = async (targetPath: string) => {
    const res = await api.delete('/loras/delete', { data: { targetPath } });
    return res.data;
};

export const moveLoraNode = async (sourcePath: string, destPath: string) => {
    const res = await api.post('/loras/move', { sourcePath, destPath });
    return res.data;
};

export const moveLoraNodesBatch = async (sourcePaths: string[], destPath: string) => {
    const res = await api.post('/loras/move-batch', { sourcePaths, destPath });
    return res.data;
};

export const uploadLoraPreview = async (loraPath: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('loraPath', loraPath);
    const res = await api.post('/loras/upload-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const uploadLoraTagImage = async (loraPath: string, tagName: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('loraPath', loraPath);
    formData.append('tagName', tagName);
    const res = await api.post<{ success: true, imagePath: string }>('/loras/upload-tag-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};
export const getSituations = async () => {
    const res = await api.get<Record<string, string>>('/situations');
    return res.data;
};

export const saveSituations = async (templates: Record<string, string>) => {
    const res = await api.post('/situations', templates);
    return res.data;
};
