'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { MessageSquarePlus, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

interface UsulanItem {
    id: number;
    nop: string;
    user_id: number;
    jenis_usulan: string;
    keterangan: string;
    status: string;
    catatan_bapenda: string | null;
    created_at: string;
    updated_at: string;
    user_name: string;
    user_role: string;
    kode_wilayah: string | null;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Menunggu', icon: <Clock size={14} />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'diproses', label: 'Diproses', icon: <AlertCircle size={14} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { value: 'selesai', label: 'Selesai', icon: <CheckCircle2 size={14} />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'ditolak', label: 'Ditolak', icon: <XCircle size={14} />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export default function UsulanPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [usulanList, setUsulanList] = useState<UsulanItem[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [searchNop, setSearchNop] = useState('');

    // Check access - only admin and bapenda can access this page
    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'bapenda'))) {
            router.push('/map');
        }
    }, [loading, user, router]);

    // Fetch usulan
    const fetchUsulan = async () => {
        setLoadingData(true);
        try {
            let url = `/api/usulan?page=${currentPage}&limit=${pageSize}`;
            if (filterStatus) url += `&status=${filterStatus}`;
            if (searchNop) url += `&nop=${searchNop}`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                setUsulanList(result.data);
                setTotalPages(result.pagination.totalPages);
                setTotalItems(result.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching usulan:', error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'bapenda')) {
            fetchUsulan();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, currentPage, pageSize, filterStatus]);

    // Handle status change
    const handleStatusChange = async (id: number, newStatus: string, currentCatatan: string | null) => {
        try {
            // If changing to ditolak, ask for catatan
            let catatan = currentCatatan;
            if (newStatus === 'ditolak' || newStatus === 'selesai') {
                const result = await Swal.fire({
                    title: newStatus === 'ditolak' ? 'Alasan Penolakan' : 'Catatan (Opsional)',
                    input: 'textarea',
                    inputValue: currentCatatan || '',
                    inputPlaceholder: 'Masukkan catatan...',
                    showCancelButton: true,
                    confirmButtonText: 'Simpan',
                    cancelButtonText: 'Batal',
                    confirmButtonColor: '#10b981',
                });

                if (!result.isConfirmed) return;
                catatan = result.value || null;
            }

            const response = await fetch(`/api/usulan/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, catatan_bapenda: catatan }),
            });

            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Status usulan berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false,
                });
                fetchUsulan();
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal!',
                text: error.message || 'Terjadi kesalahan',
            });
        }
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const option = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${option.color}`}>
                {option.icon}
                {option.label}
            </span>
        );
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-lg text-white/80 font-medium">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Navbar />

            <div className="max-w-7xl mx-auto p-6 pt-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                                    <MessageSquarePlus className="w-7 h-7 text-white" />
                                </div>
                                Manajemen Usulan
                            </h1>
                            <p className="text-slate-400">Kelola usulan dari desa dan kecamatan</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {STATUS_OPTIONS.map((status) => {
                        const count = usulanList.filter(u => u.status === status.value).length;
                        return (
                            <div
                                key={status.value}
                                className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer ${filterStatus === status.value ? 'ring-2 ring-emerald-500' : ''}`}
                                onClick={() => setFilterStatus(filterStatus === status.value ? '' : status.value)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${status.color}`}>
                                        {status.icon}
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{count}</div>
                                        <div className="text-xs text-slate-400">{status.label}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchNop}
                                    onChange={(e) => setSearchNop(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchUsulan()}
                                    placeholder="Cari berdasarkan NOP..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="" className="bg-slate-800">Semua Status</option>
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status.value} value={status.value} className="bg-slate-800">
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={fetchUsulan}
                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                                <Filter size={18} />
                                Filter
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-white/10 px-6 py-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquarePlus size={20} className="text-emerald-400" />
                            Daftar Usulan
                            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                                {totalItems} usulan
                            </span>
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">NOP</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Keterangan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Pengaju</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingData ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-slate-400">Loading data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : usulanList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                                            <MessageSquarePlus size={40} className="mx-auto mb-2 opacity-50" />
                                            <span>Tidak ada usulan</span>
                                        </td>
                                    </tr>
                                ) : (
                                    usulanList.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-white font-mono text-sm">{item.nop}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-300 text-sm line-clamp-2 max-w-md" title={item.keterangan}>
                                                    {item.keterangan}
                                                </span>
                                                {item.catatan_bapenda && (
                                                    <p className="text-xs text-slate-500 mt-1 italic">
                                                        Catatan: {item.catatan_bapenda}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-300 text-sm">{item.user_name}</div>
                                                <div className="text-slate-500 text-xs capitalize">{item.user_role}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-400 text-sm">{formatDate(item.created_at)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleStatusChange(item.id, e.target.value, item.catatan_bapenda)}
                                                    className={`px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer ${STATUS_OPTIONS.find(o => o.value === item.status)?.color || ''
                                                        } bg-transparent focus:ring-2 focus:ring-emerald-500`}
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status.value} value={status.value} className="bg-slate-800 text-white">
                                                            {status.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value={10} className="bg-slate-800">10</option>
                                <option value={25} className="bg-slate-800">25</option>
                                <option value={50} className="bg-slate-800">50</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
