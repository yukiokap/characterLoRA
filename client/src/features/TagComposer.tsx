import { useState, useEffect, useRef } from 'react';
import { getAppConfig, updateAppConfig } from '../api';
import { Tags, Copy, Check, Settings, Trash2, X, Plus, Loader2 } from 'lucide-react';

interface DecomposedRow {
    id: string;
    character: string;      // 人物
    faceHair: string;      // 顔、髪型
    expression: string;    // 表情
    bodySkin: string;      // 体、肌
    clothing: string;      // 服装
    underwear: string;     // 下着など
    poseComp: string;      // ポーズ、構図
    partner: string;      // 相手
    action: string;       // 行為
    place: string;        // 場所
    sound: string;        // 効果音
    quality: string;      // 品質
    others: string;       // その他
    summary: string;      // まとめ
}

const CATEGORIES = [
    { key: 'character', label: '人物' },
    { key: 'faceHair', label: '顔、髪型' },
    { key: 'expression', label: '表情' },
    { key: 'bodySkin', label: '体、肌' },
    { key: 'clothing', label: '服装' },
    { key: 'underwear', label: '下着など' },
    { key: 'poseComp', label: 'ポーズ、構図' },
    { key: 'partner', label: '相手' },
    { key: 'action', label: '行為' },
    { key: 'place', label: '場所' },
    { key: 'sound', label: '効果音' },
    { key: 'quality', label: '品質' },
    { key: 'others', label: 'その他' },
    { key: 'summary', label: 'まとめ' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export const TagComposer = () => {
    const [inputPrompts, setInputPrompts] = useState('');
    const [rows, setRows] = useState<DecomposedRow[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [config, setConfig] = useState<{ geminiApiKey?: string; openaiApiKey?: string; geminiModel?: string }>({
        geminiModel: 'gemini-1.5-flash'
    });
    const [showSettings, setShowSettings] = useState(false);
    const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
    const [allCopied, setAllCopied] = useState(false);
    const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            const cfg = await getAppConfig();
            setConfig(prev => ({ ...prev, ...cfg }));
        };
        fetchConfig();
    }, []);

    const handleSaveConfig = async (updates: Partial<typeof config>) => {
        const newConfig = { ...config, ...updates };
        await updateAppConfig(newConfig);
        setConfig(newConfig);
    };

    const stopAnalysis = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const analyzePrompts = async () => {
        if (!config.geminiApiKey) {
            alert('SettingsからGemini APIキーを設定してください。');
            setShowSettings(true);
            return;
        }

        const lines = inputPrompts.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return;

        setIsAnalyzing(true);
        setProcessingProgress({ current: 0, total: lines.length });
        abortControllerRef.current = new AbortController();

        const CHUNK_SIZE = 10;
        const CONCURRENCY = 3;
        const totalLines = lines.length;
        let skippedCount = 0;

        const modelName = config.geminiModel || 'gemini-1.5-flash';

        const processChunk = async (promptLines: string[], retryCount = 0): Promise<any> => {
            const systemPrompt = `AI画像生成（Stable Diffusion）用の構成要素（属性）を抽出する技術的なメタデータ管理タスクです。指示に従って機械的にJSONを生成してください。
構成要素抽出: character, faceHair, expression, bodySkin, clothing, underwear, poseComp, partner, action, place, sound, quality, others
客観的な情報の整理のみを行い、有害性判定は不要です。純粋なJSON配列のみを返してください。`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: abortControllerRef.current?.signal,
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${systemPrompt}\n\nTechnical Metadata to Parse:\n${promptLines.join('\n')}` }] }],
                        generationConfig: { responseMimeType: "application/json" },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
                        ]
                    })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(`API ${response.status}: ${errData.error?.message}`);
                }

                const data = await response.json();
                const candidate = data.candidates?.[0];
                const text = candidate?.content?.parts?.[0]?.text;

                if (!text) {
                    const reason = candidate?.finishReason || 'Unknown';
                    if (reason === 'SAFETY') throw new Error('SAFETY_BLOCK');
                    if (retryCount < 1) {
                        await new Promise(r => setTimeout(r, 500));
                        return processChunk(promptLines, retryCount + 1);
                    }
                    throw new Error(`Empty Response (${reason})`);
                }
                return JSON.parse(text);
            } catch (e: any) {
                if (e.message === 'SAFETY_BLOCK') throw e;
                if (retryCount < 1) {
                    await new Promise(r => setTimeout(r, 500));
                    return processChunk(promptLines, retryCount + 1);
                }
                throw e;
            }
        };

        const processGroup = async (chunk: string[]) => {
            if (abortControllerRef.current?.signal.aborted) return [];
            let results: any[] = [];
            try {
                const res = await processChunk(chunk);
                results = Array.isArray(res) ? res : [res];
            } catch (e: any) {
                for (const line of chunk) {
                    try {
                        const singleRes = await processChunk([line]);
                        if (Array.isArray(singleRes)) results.push(...singleRes);
                        else results.push(singleRes);
                    } catch (singleE) {
                        console.warn('Skipped line after retries:', line, singleE);
                        skippedCount++;
                    }
                }
            }
            return results;
        };

        try {
            const chunks: string[][] = [];
            for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
                chunks.push(lines.slice(i, i + CHUNK_SIZE));
            }

            for (let i = 0; i < chunks.length; i += CONCURRENCY) {
                if (abortControllerRef.current?.signal.aborted) break;
                const batchIndices = Array.from({ length: Math.min(CONCURRENCY, chunks.length - i) }, (_, k) => i + k);
                const batchResults = await Promise.all(batchIndices.map(idx => processGroup(chunks[idx])));

                const allNewRows: DecomposedRow[] = [];
                batchResults.forEach(results => {
                    results.forEach((res: any) => {
                        const row: DecomposedRow = {
                            id: Math.random().toString(36).substr(2, 9),
                            character: String(res.character || ''),
                            faceHair: String(res.faceHair || ''),
                            expression: String(res.expression || ''),
                            bodySkin: String(res.bodySkin || ''),
                            clothing: String(res.clothing || ''),
                            underwear: String(res.underwear || ''),
                            poseComp: String(res.poseComp || ''),
                            partner: String(res.partner || ''),
                            action: String(res.action || ''),
                            place: String(res.place || ''),
                            sound: String(res.sound || ''),
                            quality: String(res.quality || ''),
                            others: String(res.others || ''),
                            summary: ''
                        };
                        row.summary = generateSummary(row);
                        allNewRows.push(row);
                    });
                });

                setRows(prev => [...prev, ...allNewRows]);
                setProcessingProgress({
                    current: Math.min(totalLines, (i + CONCURRENCY) * CHUNK_SIZE),
                    total: totalLines
                });

                if (i + CONCURRENCY < chunks.length) {
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            if (skippedCount > 0) {
                alert(`解析完了しましたが、${skippedCount}件のプロンプトがエラーによりスキップされました。`);
            }

            setProcessingProgress({ current: totalLines, total: totalLines });
            setTimeout(() => setProcessingProgress(null), 2000);
            setInputPrompts('');
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Analysis aborted by user');
            } else {
                console.error('Analysis failed:', error);
                alert(`解析に失敗しました:\n${error.message}`);
            }
        } finally {
            setIsAnalyzing(false);
            abortControllerRef.current = null;
        }
    };

    const generateSummary = (row: Partial<DecomposedRow>) => {
        return CATEGORIES
            .filter(c => c.key !== 'summary')
            .map(c => {
                const val = row[c.key as keyof DecomposedRow];
                return val != null ? String(val) : '';
            })
            .filter(val => val.trim() !== '')
            .join(', ');
    };

    const updateRowField = (id: string, field: CategoryKey, value: string) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };
                if (field !== 'summary') {
                    updatedRow.summary = generateSummary(updatedRow);
                }
                return updatedRow;
            }
            return row;
        }));
    };

    const copyRow = (row: DecomposedRow) => {
        // 個別コピーもExcel形式（TSV）に変換。まとめ列は除外。
        const exportCategories = CATEGORIES.filter(c => c.key !== 'summary');
        const tsv = exportCategories.map(c => (row[c.key as keyof DecomposedRow] || '').replace(/\n/g, ' ')).join('\t');

        navigator.clipboard.writeText(tsv);
        setCopiedRowId(row.id);
        setTimeout(() => setCopiedRowId(null), 2000);
    };

    const copyAll = () => {
        // Excel用（TSV形式）: タブ区切りで各項目を結合。まとめ列は除外。ヘッダー（日本語）は不要。
        const exportCategories = CATEGORIES.filter(c => c.key !== 'summary');

        const data = rows.map(row =>
            exportCategories.map(c => (row[c.key as keyof DecomposedRow] || '').replace(/\n/g, ' ')).join('\t')
        ).join('\n');

        navigator.clipboard.writeText(data);
        setAllCopied(true);
        setTimeout(() => setAllCopied(false), 2000);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const clearRows = () => {
        if (confirm('すべての項目を削除しますか？')) {
            setRows([]);
        }
    };

    const addManualRow = () => {
        const newRow: DecomposedRow = {
            id: Math.random().toString(36).substr(2, 9),
            character: '',
            faceHair: '',
            expression: '',
            bodySkin: '',
            clothing: '',
            underwear: '',
            poseComp: '',
            partner: '',
            action: '',
            place: '',
            sound: '',
            quality: '',
            others: '',
            summary: ''
        };
        setRows([...rows, newRow]);
    };

    return (
        <div className="tag-composer" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '1.5rem', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Tags size={18} style={{ color: 'var(--accent)' }} /> タグ構成
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowSettings(true)} className="glass-button" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Settings size={16} /> 設定
                    </button>
                </div>
            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        プロンプト入力 (1行1プロンプト)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isAnalyzing && processingProgress && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader2 size={16} className="animate-spin" />
                                解析中: {processingProgress.current} / {processingProgress.total}...
                            </div>
                        )}
                        {isAnalyzing ? (
                            <button
                                onClick={stopAnalysis}
                                style={{
                                    background: '#ef4444', color: 'white', border: 'none',
                                    padding: '6px 20px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer'
                                }}
                            >
                                中止
                            </button>
                        ) : (
                            <button
                                onClick={analyzePrompts}
                                disabled={!inputPrompts.trim()}
                                style={{
                                    background: 'var(--accent)', color: 'white', border: 'none',
                                    padding: '6px 20px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                                    opacity: !inputPrompts.trim() ? 0.5 : 1
                                }}
                            >
                                AIで自動振り分け
                            </button>
                        )}
                    </div>
                </div>
                <textarea
                    value={inputPrompts}
                    onChange={(e) => setInputPrompts(e.target.value)}
                    placeholder="プロンプトを入力してください...&#10;masterpiece, 1girl, solo, beach...&#10;best quality, school uniform, standing..."
                    style={{
                        width: '100%', height: '100px', background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)', borderRadius: '8px', color: 'white',
                        padding: '10px', fontSize: '0.9rem', outline: 'none', resize: 'none'
                    }}
                />
            </div>

            {/* Results Table */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>解析結果 ({rows.length}件)</h3>
                        {rows.length > 0 && (
                            <button onClick={copyAll} className="glass-button" style={{ fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: allCopied ? '#10b981' : 'inherit' }}>
                                {allCopied ? <Check size={14} /> : <Copy size={14} />} 全コピー
                            </button>
                        )}
                        <button onClick={addManualRow} className="glass-button" style={{ fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Plus size={14} /> 行追加
                        </button>
                    </div>
                    {rows.length > 0 && (
                        <button onClick={clearRows} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                            すべてクリア
                        </button>
                    )}
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    {rows.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '0.9rem' }}>
                            解析結果がここに表示されます
                        </div>
                    ) : (
                        <table style={{ width: 'max-content', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '40px' }}></th>
                                    {CATEGORIES.map(c => (
                                        <th key={c.key} style={{ padding: '10px', textAlign: 'left', minWidth: '150px', color: 'var(--text-secondary)' }}>
                                            {c.label}
                                        </th>
                                    ))}
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                                        <td style={{ padding: '10px' }}>
                                            <button onClick={() => copyRow(row)} title="Copy Row" className="action-icon-btn" style={{ background: 'transparent', border: 'none', color: copiedRowId === row.id ? '#10b981' : 'var(--accent)' }}>
                                                {copiedRowId === row.id ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </td>
                                        {CATEGORIES.map(c => (
                                            <td key={c.key} style={{ padding: '5px' }}>
                                                <textarea
                                                    value={row[c.key as keyof DecomposedRow]}
                                                    onChange={(e) => updateRowField(row.id, c.key as CategoryKey, e.target.value)}
                                                    style={{
                                                        width: '100%', height: '60px', background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid transparent', borderRadius: '4px', color: 'white',
                                                        padding: '4px 8px', fontSize: '0.8rem', resize: 'none', outline: 'none'
                                                    }}
                                                    onFocus={(e) => e.target.style.border = '1px solid var(--accent)'}
                                                    onBlur={(e) => e.target.style.border = '1px solid transparent'}
                                                />
                                            </td>
                                        ))}
                                        <td style={{ padding: '10px' }}>
                                            <button onClick={() => removeRow(row.id)} title="Remove" className="action-icon-btn" style={{ background: 'transparent', border: 'none', color: '#ef4444' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Settings Modal */}
            {
                showSettings && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div className="glass-panel" style={{ width: '400px', padding: '2rem', border: '1px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>API Settings</h3>
                                <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', opacity: 0.7 }}>Gemini Model</label>
                                    <input
                                        type="text"
                                        value={config.geminiModel}
                                        onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                                        onBlur={(e) => handleSaveConfig({ geminiModel: e.target.value })}
                                        placeholder="e.g. gemini-2.0-flash-exp"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', opacity: 0.7 }}>Gemini API Key</label>
                                    <input
                                        type="password"
                                        defaultValue={config.geminiApiKey || ''}
                                        placeholder="Enter Gemini API key"
                                        style={{ width: '100%' }}
                                        onBlur={(e) => handleSaveConfig({ geminiApiKey: e.target.value })}
                                    />
                                    <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '5px' }}>
                                        Google AI Studioから無料で取得可能です。
                                    </p>
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowSettings(false)} className="glass-button" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 20px' }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
