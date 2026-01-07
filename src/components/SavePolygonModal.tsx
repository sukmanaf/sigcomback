'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';

interface SavePolygonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SavePolygonData) => Promise<void>;
    coordinates: number[][];
    defaultDesaKode?: string;
}

export interface SavePolygonData {
    type: 'nop' | 'blok' | 'bangunan';
    nop: string;
    coordinates: number[][];
    files?: File[];
}

export default function SavePolygonModal({
    isOpen,
    onClose,
    onSave,
    coordinates,
    defaultDesaKode = '',
}: SavePolygonModalProps) {
    const [type, setType] = useState<'nop' | 'blok' | 'bangunan'>('nop');
    const [nop, setNop] = useState(defaultDesaKode);
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pre-fill NOP with kd_desa when modal opens or defaultDesaKode changes
    useEffect(() => {
        if (isOpen) {
            setNop(defaultDesaKode);
            setType('nop');
            setFiles([]);
            setError(null);
        }
    }, [isOpen, defaultDesaKode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);

        // Validate image files
        const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length !== selectedFiles.length) {
            setError('Hanya file gambar yang diperbolehkan');
            return;
        }

        setFiles(prev => [...prev, ...imageFiles]);
        setError(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        setError(null);

        if (type === 'nop') {
            if (!nop) {
                setError('NOP harus diisi');
                return false;
            }
            if (!nop.startsWith(defaultDesaKode)) {
                setError(`NOP harus diawali dengan kode desa: ${defaultDesaKode}`);
                return false;
            }
        }

        if (type === 'blok') {
            if (!nop) {
                setError('Kode Blok harus diisi');
                return false;
            }
            if (!nop.startsWith(defaultDesaKode)) {
                setError(`Kode Blok harus diawali dengan kode desa: ${defaultDesaKode}`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await onSave({
                type,
                nop,
                coordinates,
                files: type === 'nop' ? files : undefined,
            });

            // Reset form
            setType('nop');
            setNop(defaultDesaKode);
            setFiles([]);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan polygon');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Simpan Polygon</h2>
                    <button onClick={onClose} className="hover:bg-emerald-500 p-1 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jenis Polygon
                        </label>
                        <div className="flex gap-4">
                            {['nop', 'blok', 'bangunan'].map((t) => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value={t}
                                        checked={type === t}
                                        onChange={(e) => setType(e.target.value as typeof type)}
                                        className="w-4 h-4 text-emerald-600"
                                    />
                                    <span className="text-sm text-gray-700 capitalize">{t === 'nop' ? 'NOP' : t === 'blok' ? 'Blok' : 'Bangunan'}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* NOP/Blok Code Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {type === 'nop' ? 'NOP' : type === 'blok' ? 'Kode Blok' : 'NOP Bangunan'}
                        </label>
                        <input
                            type="text"
                            value={nop}
                            onChange={(e) => setNop(e.target.value)}
                            placeholder={type === 'nop' ? 'Masukkan 18 digit NOP' : 'Masukkan kode'}
                            minLength={10}
                            maxLength={18}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                        />
                    </div>

                    {/* File Upload - Only for NOP */}
                    {type === 'nop' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Gambar (Opsional)
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 transition-colors w-full justify-center"
                            >
                                <Upload size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-600">Pilih Gambar</span>
                            </button>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="text-sm text-gray-700 truncate flex-1">
                                                {file.name}
                                            </span>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
