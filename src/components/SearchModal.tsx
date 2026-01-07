'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearchResult: (nop: string, desaKode: string) => void;
    userRole?: string;
    userKodeWilayah?: string | null;
}

type SearchType = 'nop' | 'nama' | 'alamat';

interface SearchResult {
    NAMA: string;
    ALAMAT: string;
    NOP: string;
}

export default function SearchModal({
    isOpen,
    onClose,
    onSearchResult,
    userRole,
    userKodeWilayah,
}: SearchModalProps) {
    const [searchType, setSearchType] = useState<SearchType>('nop');
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchValue('');
            setResults([]);
            setHasSearched(false);
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Check if NOP is in user's jurisdiction
    const isNopInJurisdiction = (nop: string): boolean => {
        // Full access roles
        if (!userRole || ['admin', 'bapenda', 'bpn'].includes(userRole)) {
            return true;
        }

        if (!userKodeWilayah) return false;

        // Clean NOP
        const cleanNop = nop.replace(/[.\-]/g, '');

        if (userRole === 'kecamatan') {
            // Kecamatan: first 7 digits must match
            return cleanNop.substring(0, 7) === userKodeWilayah.substring(0, 7);
        } else if (userRole === 'desa') {
            // Desa: first 10 digits must match
            return cleanNop.substring(0, 10) === userKodeWilayah.substring(0, 10);
        }

        return true;
    };

    // Handle NOP search directly
    const handleNopSearch = async () => {
        if (!searchValue.trim()) return;

        setIsLoading(true);
        setResults([]);
        setHasSearched(true);

        try {
            const response = await fetch(`/api/nops/search?nop=${encodeURIComponent(searchValue.trim())}`);
            const data = await response.json();

            if (!data.success) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tidak Ditemukan',
                    text: 'NOP tidak ditemukan dalam database',
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            // Check jurisdiction
            if (!isNopInJurisdiction(data.data.d_nop)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Akses Terbatas',
                    text: 'NOP tidak ditemukan di wilayah Anda',
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            // Success - trigger callback
            onSearchResult(data.data.d_nop, data.data.d_kd_kel);
            onClose();

        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Terjadi kesalahan saat mencari NOP',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Nama/Alamat search
    const handleNameAddressSearch = async () => {
        if (!searchValue.trim()) return;

        setIsLoading(true);
        setResults([]);
        setHasSearched(true);

        try {
            const response = await fetch('/api/search/op', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: searchType,
                    value: searchValue.trim(),
                }),
            });
            const data = await response.json();

            if (!data.success || !data.data || data.data.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Tidak Ditemukan',
                    text: `Data tidak ditemukan untuk ${searchType === 'nama' ? 'nama' : 'alamat'} "${searchValue}"`,
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            // Filter results based on jurisdiction
            const filteredResults = data.data.filter((item: SearchResult) => isNopInJurisdiction(item.NOP));

            if (filteredResults.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Tidak Ditemukan',
                    text: 'Tidak ada data yang ditemukan di wilayah Anda',
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            setResults(filteredResults);

        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Terjadi kesalahan saat mencari',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle search submit
    const handleSearch = () => {
        if (searchType === 'nop') {
            handleNopSearch();
        } else {
            handleNameAddressSearch();
        }
    };

    // Handle result item click
    const handleResultClick = async (item: SearchResult) => {
        // Clean NOP
        const cleanNop = item.NOP.replace(/[.\-]/g, '');
        const desaKode = cleanNop.substring(0, 10);

        // Check if NOP exists in local database
        setIsLoading(true);
        try {
            const response = await fetch(`/api/nops/search?nop=${encodeURIComponent(cleanNop)}`);
            const data = await response.json();

            if (!data.success) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tidak Ditemukan',
                    text: 'Polygon NOP tidak ditemukan dalam database peta',
                    confirmButtonColor: '#10b981',
                });
                return;
            }

            onSearchResult(data.data.d_nop, data.data.d_kd_kel);
            onClose();

        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Terjadi kesalahan',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-[2000]">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in slide-in-from-top duration-200"
            >
                {/* Header */}
                <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Search size={20} />
                        Pencarian Objek Pajak
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {/* Radio Buttons */}
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="searchType"
                                value="nop"
                                checked={searchType === 'nop'}
                                onChange={() => {
                                    setSearchType('nop');
                                    setResults([]);
                                    setHasSearched(false);
                                }}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-gray-700 font-medium">NOP</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="searchType"
                                value="nama"
                                checked={searchType === 'nama'}
                                onChange={() => {
                                    setSearchType('nama');
                                    setResults([]);
                                    setHasSearched(false);
                                }}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-gray-700 font-medium">Nama</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="searchType"
                                value="alamat"
                                checked={searchType === 'alamat'}
                                onChange={() => {
                                    setSearchType('alamat');
                                    setResults([]);
                                    setHasSearched(false);
                                }}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-gray-700 font-medium">Alamat</span>
                        </label>
                    </div>

                    {/* Search Input */}
                    <div className="flex gap-2 mb-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                searchType === 'nop'
                                    ? 'Masukkan NOP (contoh: 357504000801300120)'
                                    : searchType === 'nama'
                                        ? 'Masukkan nama wajib pajak'
                                        : 'Masukkan alamat objek pajak'
                            }
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !searchValue.trim()}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Search size={18} />
                            )}
                            Cari
                        </button>
                    </div>

                    {/* Results List (for Nama/Alamat search) */}
                    {results.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">
                                    📋 Hasil Pencarian
                                </span>
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white font-medium">
                                    {results.length} data
                                </span>
                            </div>
                            {/* Results list */}
                            <div className="max-h-96 overflow-y-auto bg-gray-50/50">
                                {results.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleResultClick(item)}
                                        className="w-full text-left px-4 py-3 bg-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-white border-b border-gray-100 last:border-b-0 transition-all duration-200 group"
                                        disabled={isLoading}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                <span className="text-white text-lg">👤</span>
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Name */}
                                                <div className="text-sm font-bold text-gray-800 truncate group-hover:text-emerald-700 transition-colors">
                                                    {item.NAMA}
                                                </div>
                                                {/* Address */}
                                                <div className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                                                    <span className="shrink-0">📍</span>
                                                    <span className="line-clamp-2">{item.ALAMAT}</span>
                                                </div>
                                                {/* NOP with formatted display */}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">NOP</span>
                                                    <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                                                        {item.NOP.replace(/(\d{2})(\d{2})(\d{3})(\d{3})(\d{4})(\d{4})/, '$1.$2.$3.$4.$5-$6')}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Arrow indicator */}
                                            <div className="text-gray-300 group-hover:text-emerald-500 transition-colors self-center">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No results message */}
                    {hasSearched && results.length === 0 && searchType !== 'nop' && !isLoading && (
                        <div className="text-center py-8 text-gray-400">
                            <div className="text-4xl mb-2">🔍</div>
                            <div className="font-medium">Tidak ada hasil ditemukan</div>
                            <div className="text-xs mt-1">Coba kata kunci lain</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
