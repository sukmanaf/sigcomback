'use client';

import { useState, useRef } from 'react';
import { X, Upload, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface NopEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NopEditData) => Promise<void>;
    nop: string;
    coordinates: number[][];
    existingImages: string[];
    defaultDesaKode?: string;
}

export interface NopEditData {
    nop: string;
    coordinates: number[][];
    files?: File[];
    deletedImages?: string[];
}

export default function NopEditModal({
    isOpen,
    onClose,
    onSave,
    nop,
    coordinates,
    existingImages,
    defaultDesaKode = '',
}: NopEditModalProps) {
    const [editedNop, setEditedNop] = useState(nop);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter existing images (remove deleted ones)
    const currentImages = existingImages.filter(img => !deletedImages.includes(img));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);

        // Validate image files
        const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length !== selectedFiles.length) {
            setError('Hanya file gambar yang diperbolehkan');
            return;
        }

        setNewFiles(prev => [...prev, ...imageFiles]);
        setError(null);
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const markImageForDeletion = (imagePath: string) => {
        setDeletedImages(prev => [...prev, imagePath]);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            await onSave({
                nop: editedNop,
                coordinates,
                files: newFiles,
                deletedImages,
            });

            // Reset form
            setNewFiles([]);
            setDeletedImages([]);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan perubahan');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get all preview-able images (existing + new)
    const allPreviewImages = [
        ...currentImages,
        ...newFiles.map(f => URL.createObjectURL(f)),
    ];

    const handlePrev = () => {
        if (previewIndex !== null && previewIndex > 0) {
            setPreviewIndex(previewIndex - 1);
        }
    };

    const handleNext = () => {
        if (previewIndex !== null && previewIndex < allPreviewImages.length - 1) {
            setPreviewIndex(previewIndex + 1);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Main Modal */}
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold">Edit NOP</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-red-200">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* NOP Input - Editable */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                NOP
                            </label>
                            <input
                                type="text"
                                value={editedNop}
                                onChange={(e) => setEditedNop(e.target.value)}
                                placeholder="Masukkan 18 digit NOP"
                                minLength={10}
                                maxLength={18}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 font-mono"
                            />
                        </div>

                        {/* Existing Images */}
                        {currentImages.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Gambar Saat Ini ({currentImages.length})
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {currentImages.map((img, index) => (
                                        <div
                                            key={img}
                                            className="relative aspect-square rounded-xl border-2 border-gray-100 overflow-hidden group shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all"
                                        >
                                            <img
                                                src={img}
                                                alt={`Image ${index + 1}`}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => setPreviewIndex(index)}
                                            />
                                            <button
                                                onClick={() => markImageForDeletion(img)}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Upload */}
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Tambah Gambar Baru
                            </div>
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
                                className="flex items-center gap-3 px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all w-full justify-center group"
                            >
                                <div className="w-10 h-10 bg-gray-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors">
                                    <Upload size={20} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-700">Pilih Gambar</p>
                                    <p className="text-xs text-gray-400">JPG, PNG, GIF hingga 10MB</p>
                                </div>
                            </button>

                            {/* New File List */}
                            {newFiles.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {newFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="w-10 h-10 object-cover rounded-lg"
                                                />
                                                <span className="text-sm text-gray-700 truncate font-medium">
                                                    {file.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeNewFile(index)}
                                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors font-medium"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium flex items-center gap-2 shadow-lg shadow-emerald-600/25"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Simpan Perubahan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Preview Lightbox */}
            {previewIndex !== null && (
                <div
                    className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90"
                    onClick={() => setPreviewIndex(null)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewIndex(null); }}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <X size={32} />
                    </button>

                    {previewIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-4 text-white hover:text-gray-300"
                        >
                            <ChevronLeft size={48} />
                        </button>
                    )}

                    <img
                        src={allPreviewImages[previewIndex]}
                        alt={`Preview ${previewIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {previewIndex < allPreviewImages.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-4 text-white hover:text-gray-300"
                        >
                            <ChevronRight size={48} />
                        </button>
                    )}

                    <div className="absolute bottom-4 text-white text-sm">
                        {previewIndex + 1} / {allPreviewImages.length}
                    </div>
                </div>
            )}
        </>
    );
}
