'use client';

import { useState, useEffect } from 'react';
import { X, Building2, FileText, Loader2, MessageSquarePlus, Send, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface NopInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    nop: string;
    userRole?: string;
    userId?: number;
}

interface ObjekPajak {
    TAHUN_PAJAK: string;
    NOP: string;
    LETAK_OP: string;
    WAJIB_PAJAK: string;
    STATUS: string;
    PEKERJAAN: string;
    NPWP: string;
    ALAMAT: string;
    LUAS_TANAH: string;
    KODE_ZNT: string;
    JENIS_TANAH: string;
    JUMLAH_BANGUNAN: string;
    NJOP_BUMI: string;
    NJOP_BANGUNAN: string;
    PBB: string;
}

interface Bangunan {
    NO_BNG: string;
    NOP: string;
    JUMLAH_BANGUNAN: string;
    BANGUNAN_KE: string;
    PENGGUNAAN_BANGUNAN: string;
    LUAS_BANGUNAN: string;
    JUMLAH_LANTAI: string;
    TAHUN_DIBANGUN: string;
    TAHUN_RENOVASI: string | null;
    KONTRUKSI: string;
    ATAP: string;
    DINDING: string;
    LANTAI: string;
    LANGIT_LANGIT: string;
    KONDISI: string;
}

interface NopData {
    INFORMASI_RINCI_OBJEK_PAJAK: ObjekPajak[];
    INFORMASI_BANGUNAN: Bangunan[];
}

interface UsulanItem {
    id: number;
    nop: string;
    jenis_usulan: string;
    keterangan: string;
    status: string;
    catatan_bapenda: string | null;
    created_at: string;
}



const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: { label: 'Menunggu', icon: <Clock size={14} />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    diproses: { label: 'Diproses', icon: <AlertCircle size={14} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    selesai: { label: 'Selesai', icon: <CheckCircle2 size={14} />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    ditolak: { label: 'Ditolak', icon: <XCircle size={14} />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function NopInfoModal({ isOpen, onClose, nop, userRole, userId }: NopInfoModalProps) {
    const [activeTab, setActiveTab] = useState<'objek' | 'bangunan' | 'usulan'>('objek');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<NopData | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedBangunan, setSelectedBangunan] = useState<string>('');

    const [usulanList, setUsulanList] = useState<UsulanItem[]>([]);
    const [loadingUsulan, setLoadingUsulan] = useState(false);
    const [submittingUsulan, setSubmittingUsulan] = useState(false);
    const [keterangan, setKeterangan] = useState('');

    // Check if user can submit usulan
    const canSubmitUsulan = userRole === 'desa' || userRole === 'kecamatan';

    useEffect(() => {
        if (!isOpen || !nop) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/nops/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nop }),
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message || 'Data tidak ditemukan');
                }

                setData(result.data);

                // Set default selections
                if (result.data?.INFORMASI_RINCI_OBJEK_PAJAK?.length > 0) {
                    setSelectedYear(result.data.INFORMASI_RINCI_OBJEK_PAJAK[0].TAHUN_PAJAK);
                }
                if (result.data?.INFORMASI_BANGUNAN?.length > 0) {
                    setSelectedBangunan(result.data.INFORMASI_BANGUNAN[0].NO_BNG);
                }
            } catch (err: any) {
                setError(err.message || 'Gagal mengambil data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, nop]);

    // Fetch usulan when tab is switched to usulan
    useEffect(() => {
        if (!isOpen || !nop || activeTab !== 'usulan') return;

        const fetchUsulan = async () => {
            setLoadingUsulan(true);
            try {
                const response = await fetch(`/api/usulan?nop=${nop}`, {
                    credentials: 'include',
                });
                const result = await response.json();
                if (result.success) {
                    setUsulanList(result.data);
                }
            } catch (err) {
                console.error('Error fetching usulan:', err);
            } finally {
                setLoadingUsulan(false);
            }
        };

        fetchUsulan();
    }, [isOpen, nop, activeTab]);

    const handleSubmitUsulan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keterangan.trim()) return;

        setSubmittingUsulan(true);
        try {
            const response = await fetch('/api/usulan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nop, jenis_usulan: 'Usulan', keterangan }),
            });

            const result = await response.json();
            if (result.success) {
                // Reset form
                setKeterangan('');
                // Show success message
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Usulan berhasil dikirim',
                    timer: 2000,
                    showConfirmButton: false,
                });
                // Refresh list
                const refreshResponse = await fetch(`/api/usulan?nop=${nop}`, {
                    credentials: 'include',
                });
                const refreshResult = await refreshResponse.json();
                if (refreshResult.success) {
                    setUsulanList(refreshResult.data);
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: result.message || 'Gagal mengirim usulan',
                });
            }
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: err.message || 'Gagal mengirim usulan',
            });
        } finally {
            setSubmittingUsulan(false);
        }
    };

    if (!isOpen) return null;

    const selectedObjek = data?.INFORMASI_RINCI_OBJEK_PAJAK?.find(
        (o) => o.TAHUN_PAJAK === selectedYear
    );
    const selectedBangunanData = data?.INFORMASI_BANGUNAN?.find(
        (b) => b.NO_BNG === selectedBangunan
    );

    const formatCurrency = (value: string) => {
        const num = parseInt(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Informasi Objek Pajak</h2>
                            <p className="text-emerald-100 text-sm font-mono">{nop}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 shrink-0">
                    <button
                        onClick={() => setActiveTab('objek')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'objek'
                            ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <FileText size={16} />
                        Objek Pajak
                    </button>
                    <button
                        onClick={() => setActiveTab('bangunan')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'bangunan'
                            ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Building2 size={16} />
                        Bangunan
                    </button>
                    {/* Usulan tab - only show for desa/kecamatan */}
                    {canSubmitUsulan && (
                        <button
                            onClick={() => setActiveTab('usulan')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'usulan'
                                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <MessageSquarePlus size={16} />
                            Usulan
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading && activeTab !== 'usulan' && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <span className="ml-3 text-gray-600">Memuat data...</span>
                        </div>
                    )}

                    {error && activeTab !== 'usulan' && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-red-200">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {!loading && !error && data && (
                        <>
                            {/* Tab: Objek Pajak */}
                            {activeTab === 'objek' && (
                                <div className="space-y-4">
                                    {/* Year Dropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">Tahun Pajak</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        >
                                            {data.INFORMASI_RINCI_OBJEK_PAJAK?.map((o) => (
                                                <option key={o.TAHUN_PAJAK} value={o.TAHUN_PAJAK}>
                                                    {o.TAHUN_PAJAK}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedObjek && (
                                        <div className="grid grid-cols-4 gap-3">
                                            <InfoCard label="Wajib Pajak" value={selectedObjek.WAJIB_PAJAK} span={2} />
                                            <InfoCard label="Status" value={selectedObjek.STATUS} span={2} />
                                            <InfoCard label="Letak OP" value={selectedObjek.LETAK_OP} span={4} />
                                            <InfoCard label="Alamat" value={selectedObjek.ALAMAT} span={4} />
                                            <InfoCard label="Luas Tanah" value={selectedObjek.LUAS_TANAH} span={2} />
                                            <InfoCard label="Jenis Tanah" value={selectedObjek.JENIS_TANAH} span={2} />
                                            <InfoCard label="Kode ZNT" value={selectedObjek.KODE_ZNT} />
                                            <InfoCard label="Jumlah Bangunan" value={selectedObjek.JUMLAH_BANGUNAN} />
                                            <InfoCard label="NPWP" value={selectedObjek.NPWP} span={2} />
                                            <InfoCard label="NJOP Bumi" value={formatCurrency(selectedObjek.NJOP_BUMI)} highlight span={2} />
                                            <InfoCard label="NJOP Bangunan" value={formatCurrency(selectedObjek.NJOP_BANGUNAN)} highlight span={2} />
                                            <InfoCard label="PBB" value={formatCurrency(selectedObjek.PBB)} highlight span={4} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Bangunan */}
                            {activeTab === 'bangunan' && (
                                <div className="space-y-4">
                                    {data.INFORMASI_BANGUNAN?.length > 0 ? (
                                        <>
                                            {/* Bangunan Dropdown */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-2">Nomor Bangunan</label>
                                                <select
                                                    value={selectedBangunan}
                                                    onChange={(e) => setSelectedBangunan(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                >
                                                    {data.INFORMASI_BANGUNAN?.map((b) => (
                                                        <option key={b.NO_BNG} value={b.NO_BNG}>
                                                            Bangunan {b.BANGUNAN_KE} - {b.PENGGUNAAN_BANGUNAN}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedBangunanData && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <InfoCard label="Penggunaan" value={selectedBangunanData.PENGGUNAAN_BANGUNAN} span={2} />
                                                    <InfoCard label="Luas Bangunan" value={selectedBangunanData.LUAS_BANGUNAN} />
                                                    <InfoCard label="Jumlah Lantai" value={selectedBangunanData.JUMLAH_LANTAI} />
                                                    <InfoCard label="Tahun Dibangun" value={selectedBangunanData.TAHUN_DIBANGUN} />
                                                    <InfoCard label="Tahun Renovasi" value={selectedBangunanData.TAHUN_RENOVASI || '-'} />
                                                    <InfoCard label="Konstruksi" value={selectedBangunanData.KONTRUKSI} />
                                                    <InfoCard label="Atap" value={selectedBangunanData.ATAP} />
                                                    <InfoCard label="Dinding" value={selectedBangunanData.DINDING} />
                                                    <InfoCard label="Lantai" value={selectedBangunanData.LANTAI} />
                                                    <InfoCard label="Langit-langit" value={selectedBangunanData.LANGIT_LANGIT} />
                                                    <InfoCard label="Kondisi" value={selectedBangunanData.KONDISI} />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>Tidak ada data bangunan</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'usulan' && canSubmitUsulan && (
                                <div className="space-y-6">
                                    {/* Form Submit Usulan */}
                                    <form onSubmit={handleSubmitUsulan} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <MessageSquarePlus size={16} className="text-emerald-600" />
                                            Ajukan Usulan Baru
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Keterangan Usulan</label>
                                                <textarea
                                                    value={keterangan}
                                                    onChange={(e) => setKeterangan(e.target.value)}
                                                    placeholder="Jelaskan detail usulan Anda..."
                                                    rows={4}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={submittingUsulan || !keterangan.trim()}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {submittingUsulan ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                                Kirim Usulan
                                            </button>
                                        </div>
                                    </form>

                                    {/* List Usulan */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Riwayat Usulan</h3>
                                        {loadingUsulan ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                            </div>
                                        ) : usulanList.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <MessageSquarePlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Belum ada usulan untuk NOP ini</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {usulanList.map((item) => {
                                                    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                                                    return (
                                                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                                <div className="flex-1">
                                                                    <span className="text-sm font-medium text-gray-900">{item.jenis_usulan}</span>
                                                                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.created_at)}</p>
                                                                </div>
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                                                    {statusConfig.icon}
                                                                    {statusConfig.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600">{item.keterangan}</p>
                                                            {item.catatan_bapenda && (
                                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                                    <p className="text-xs text-gray-500">Catatan Bapenda:</p>
                                                                    <p className="text-sm text-gray-700">{item.catatan_bapenda}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Usulan tab content when data is not needed */}
                    {activeTab === 'usulan' && canSubmitUsulan && (loading || error) && (
                        <div className="space-y-6">
                            {/* Form and list for usulan - can work independently of NOP data */}
                            <form onSubmit={handleSubmitUsulan} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageSquarePlus size={16} className="text-emerald-600" />
                                    Ajukan Usulan Baru
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Keterangan Usulan</label>
                                        <textarea
                                            value={keterangan}
                                            onChange={(e) => setKeterangan(e.target.value)}
                                            placeholder="Jelaskan detail usulan Anda..."
                                            rows={4}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingUsulan || !keterangan.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {submittingUsulan ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        Kirim Usulan
                                    </button>
                                </div>
                            </form>

                            {/* List Usulan */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Riwayat Usulan</h3>
                                {loadingUsulan ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                    </div>
                                ) : usulanList.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <MessageSquarePlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Belum ada usulan untuk NOP ini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {usulanList.map((item) => {
                                            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                                            return (
                                                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium text-gray-900">{item.jenis_usulan}</span>
                                                            <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.created_at)}</p>
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                                            {statusConfig.icon}
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{item.keterangan}</p>
                                                    {item.catatan_bapenda && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <p className="text-xs text-gray-500">Catatan Bapenda:</p>
                                                            <p className="text-sm text-gray-700">{item.catatan_bapenda}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper component for info cards
function InfoCard({ label, value, span = 1, highlight = false }: { label: string; value: string; span?: number; highlight?: boolean }) {
    return (
        <div className={`${span === 2 ? 'col-span-2' : span === 4 ? 'col-span-4' : ''} ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'} rounded-lg p-3 border`}>
            <p className={`text-xs ${highlight ? 'text-emerald-600' : 'text-gray-500'} mb-1`}>{label}</p>
            <p className={`text-sm font-semibold ${highlight ? 'text-emerald-900' : 'text-gray-900'}`}>{value || '-'}</p>
        </div>
    );
}
