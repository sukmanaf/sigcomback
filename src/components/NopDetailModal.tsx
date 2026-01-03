'use client';

import { useState } from 'react';
import { X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface NopDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    nop: string;
    luas: string;
    images: string[];
}

export default function NopDetailModal({
    isOpen,
    onClose,
    nop,
    luas,
    images,
}: NopDetailModalProps) {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    const handlePrev = () => {
        if (previewIndex !== null && previewIndex > 0) {
            setPreviewIndex(previewIndex - 1);
        }
    };

    const handleNext = () => {
        if (previewIndex !== null && previewIndex < images.length - 1) {
            setPreviewIndex(previewIndex + 1);
        }
    };

    return (
        <>
            {/* Main Modal */}
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold">Detail NOP</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">
                        {/* NOP Info Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    NOP
                                </div>
                                <p className="text-base font-bold text-gray-900 font-mono">{nop}</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                                <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    Luas
                                </div>
                                <p className="text-base font-bold text-gray-900">{luas} m²</p>
                            </div>
                        </div>

                        {/* Images */}
                        {images.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Gambar ({images.length})
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square cursor-pointer group overflow-hidden rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all"
                                            onClick={() => setPreviewIndex(index)}
                                        >
                                            <img
                                                src={img}
                                                alt={`NOP ${nop} - ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {images.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-400 font-medium">Tidak ada gambar</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                        >
                            Tutup
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
                        src={images[previewIndex]}
                        alt={`Preview ${previewIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {previewIndex < images.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-4 text-white hover:text-gray-300"
                        >
                            <ChevronRight size={48} />
                        </button>
                    )}

                    <div className="absolute bottom-4 text-white text-sm">
                        {previewIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </>
    );
}
