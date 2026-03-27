import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import Card from '../ui/Card';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, GripVertical, FileText, Save, RotateCcw } from 'lucide-react';

const DocumentTemplatesSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const templates = settings?.documentTemplates;

    const [clauses, setClauses] = useState<string[]>(templates?.contractClauses || []);
    const [footerNote, setFooterNote] = useState(templates?.contractFooterNote || '');
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Print Settings
    const [marginTop, setMarginTop] = useState(templates?.marginTop || 15);
    const [marginBottom, setMarginBottom] = useState(templates?.marginBottom || 15);
    const [marginLeft, setMarginLeft] = useState(templates?.marginLeft || 15);
    const [marginRight, setMarginRight] = useState(templates?.marginRight || 15);
    const [includeSignatures, setIncludeSignatures] = useState(templates?.includeSignatures !== false);
    const [signatureBlockCount, setSignatureBlockCount] = useState(templates?.signatureBlockCount || 3);

    useEffect(() => {
        setClauses(templates?.contractClauses || []);
        setFooterNote(templates?.contractFooterNote || '');
        setMarginTop(templates?.marginTop || 15);
        setMarginBottom(templates?.marginBottom || 15);
        setMarginLeft(templates?.marginLeft || 15);
        setMarginRight(templates?.marginRight || 15);
        setIncludeSignatures(templates?.includeSignatures !== false);
        setSignatureBlockCount(templates?.signatureBlockCount || 3);
        setIsDirty(false);
    }, [templates]);

    const markDirty = () => setIsDirty(true);

    const handleClauseChange = (idx: number, value: string) => {
        const updated = [...clauses];
        updated[idx] = value;
        setClauses(updated);
        markDirty();
    };

    const handleAddClause = () => {
        setClauses([...clauses, '']);
        markDirty();
    };

    const handleRemoveClause = (idx: number) => {
        setClauses(clauses.filter((_, i) => i !== idx));
        markDirty();
    };

    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const reordered = [...clauses];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(idx, 0, moved);
        setClauses(reordered);
        setDragIdx(idx);
        markDirty();
    };
    const handleDragEnd = () => setDragIdx(null);

    const handleSave = async () => {
        if (isSaving) return;
        const margins = [marginTop, marginBottom, marginLeft, marginRight];
        if (margins.some(m => m < 5 || m > 30)) {
            toast.error('هوامش المستند يجب أن تكون بين 5 و 30 ملم.');
            return;
        }
        setIsSaving(true);
        try {
            await updateSettings({
                documentTemplates: {
                    contractClauses: clauses.filter(c => c.trim()),
                    contractFooterNote: footerNote,
                    marginTop, marginBottom, marginLeft, marginRight,
                    includeSignatures, signatureBlockCount
                }
            });
            toast.success('تم حفظ إعدادات المستندات بنجاح');
            setIsDirty(false);
        } catch {
            toast.error('فشل حفظ إعدادات المستندات.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setClauses(templates?.contractClauses || []);
        setFooterNote(templates?.contractFooterNote || '');
        setIsDirty(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText size={20} />
                    قالب عقد الإيجار — البنود والشروط
                </h3>
                <div className="flex gap-2">
                    {isDirty && (
                        <button onClick={handleReset} className="btn btn-secondary flex items-center gap-2 text-sm">
                            <RotateCcw size={15} /> تراجع
                        </button>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Save size={15} /> {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </div>

            <Card className="p-4">
                <p className="text-xs text-text-muted mb-4">
                    يمكنك تعديل كل بند، إضافة بنود جديدة، حذف بنود، أو إعادة ترتيبها بالسحب. هذه البنود ستظهر في كل نسخة مطبوعة من عقد الإيجار.
                </p>

                <div className="space-y-3">
                    {clauses.map((clause, idx) => (
                        <div
                            key={idx}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex gap-2 items-start bg-background border border-border rounded-lg p-3 transition-opacity ${dragIdx === idx ? 'opacity-50' : ''}`}
                        >
                            <div className="flex flex-col items-center gap-1 pt-1 cursor-grab text-text-muted">
                                <GripVertical size={18} />
                                <span className="text-xs font-bold text-primary">{idx + 1}</span>
                            </div>
                            <textarea
                                value={clause}
                                onChange={e => handleClauseChange(idx, e.target.value)}
                                rows={3}
                                className="flex-1 bg-transparent border-none outline-none resize-y text-sm leading-relaxed"
                                placeholder="اكتب نص البند هنا..."
                                dir="rtl"
                            />
                            <button
                                onClick={() => handleRemoveClause(idx)}
                                className="text-red-400 hover:text-red-600 mt-1 flex-shrink-0"
                                title="حذف البند"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleAddClause}
                    className="mt-4 w-full border-2 border-dashed border-border rounded-lg py-3 text-sm text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> إضافة بند جديد
                </button>
            </Card>

            <Card className="p-4">
                <label className="block font-bold text-sm mb-2">ملاحظة تذييل العقد (اختياري)</label>
                <p className="text-xs text-text-muted mb-2">تظهر هذه الملاحظة أسفل بنود العقد مباشرةً قبل خط التوقيع.</p>
                <textarea
                    value={footerNote}
                    onChange={e => { setFooterNote(e.target.value); markDirty(); }}
                    rows={3}
                    className="w-full border border-border rounded-lg p-3 text-sm bg-background"
                    placeholder="مثال: هذا العقد خاضع لأحكام وتشريعات سلطنة عُمان..."
                    dir="rtl"
                />
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-bold text-sm text-blue-800 mb-2">معاينة ترقيم البنود</h4>
                <div className="space-y-1 text-xs text-blue-700 max-h-48 overflow-y-auto">
                    {clauses.filter(c => c.trim()).map((clause, idx) => (
                        <p key={idx}><strong>{idx + 1}.</strong> {clause.slice(0, 80)}{clause.length > 80 ? '...' : ''}</p>
                    ))}
                    {clauses.filter(c => c.trim()).length === 0 && (
                        <p className="text-text-muted">لا توجد بنود. أضف بنداً أعلاه.</p>
                    )}
                </div>
            </Card>

            {/* Print Layout Settings */}
            <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-bold text-sm text-amber-900 mb-4 flex items-center gap-2">
                    إعدادات تخطيط الطباعة (A4)
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1">الهامش العلوي (ملم)</label>
                        <input 
                            type="number" 
                            min="5" 
                            max="30" 
                            value={marginTop}
                            onChange={(e) => { setMarginTop(Number(e.target.value)); markDirty(); }}
                            className="w-full border border-border rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1">الهامش السفلي (ملم)</label>
                        <input 
                            type="number" 
                            min="5" 
                            max="30" 
                            value={marginBottom}
                            onChange={(e) => { setMarginBottom(Number(e.target.value)); markDirty(); }}
                            className="w-full border border-border rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1">الهامش الأيمن (ملم)</label>
                        <input 
                            type="number" 
                            min="5" 
                            max="30" 
                            value={marginRight}
                            onChange={(e) => { setMarginRight(Number(e.target.value)); markDirty(); }}
                            className="w-full border border-border rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1">الهامش الأيسر (ملم)</label>
                        <input 
                            type="number" 
                            min="5" 
                            max="30" 
                            value={marginLeft}
                            onChange={(e) => { setMarginLeft(Number(e.target.value)); markDirty(); }}
                            className="w-full border border-border rounded px-2 py-1 text-sm"
                        />
                    </div>
                </div>

                <div className="border-t border-amber-200 pt-4">
                    <h4 className="text-sm font-bold mb-3">إعدادات التوقيعات</h4>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={includeSignatures}
                                onChange={(e) => { setIncludeSignatures(e.target.checked); markDirty(); }}
                                className="rounded"
                            />
                            <span className="text-sm">إضافة منطقة التوقيعات في المستندات المطبوعة</span>
                        </label>
                        
                        {includeSignatures && (
                            <div>
                                <label className="block text-xs font-semibold mb-2">عدد مربعات التوقيع</label>
                                <select 
                                    value={signatureBlockCount}
                                    onChange={(e) => { setSignatureBlockCount(Number(e.target.value)); markDirty(); }}
                                    className="w-full border border-border rounded px-2 py-1 text-sm"
                                >
                                    <option value={2}>اثنان (المُصدِر والمستقبِل)</option>
                                    <option value={3}>ثلاثة (المُصدِر والمستقبِل والختم)</option>
                                    <option value={4}>أربعة (مع شاهد إضافي)</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DocumentTemplatesSettings;
