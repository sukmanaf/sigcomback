'use client';

import { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Navbar from '@/components/Navbar';
import { UserPlus, Edit3, Trash2, Shield, Building2, MapPin, Users, User, X, Save, Loader2 } from 'lucide-react';

interface UserData {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    kode_wilayah: string | null;
    created_at: string;
}

interface Kecamatan {
    d_kd_kec: string;
    d_nm_kec: string;
}

interface Desa {
    d_kd_kel: string;
    d_nm_kel: string;
}

interface Role {
    id: number;
    code: string;
    name: string;
}

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    bapenda: 'Bapenda',
    bpn: 'BPN',
    kecamatan: 'Kecamatan',
    desa: 'Desa',
};

const roleIcons: Record<UserRole, React.ReactNode> = {
    admin: <Shield size={14} />,
    bapenda: <Building2 size={14} />,
    bpn: <MapPin size={14} />,
    kecamatan: <Users size={14} />,
    desa: <User size={14} />,
};

const roleStyles: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700 border border-red-200',
    bapenda: 'bg-blue-100 text-blue-700 border border-blue-200',
    bpn: 'bg-purple-100 text-purple-700 border border-purple-200',
    kecamatan: 'bg-amber-100 text-amber-700 border border-amber-200',
    desa: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

export default function UsersPage() {
    const { user, loading, canManageUsers } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: '' as UserRole | '',
        kode_wilayah: '',
    });
    const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [selectedKecamatan, setSelectedKecamatan] = useState('');
    const [rolesList, setRolesList] = useState<Role[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (!loading && (!user || !canManageUsers)) {
            router.push('/map');
        }
    }, [loading, user, canManageUsers, router]);

    const fetchUsers = async (page: number = currentPage, limit: number = pageSize) => {
        setLoadingUsers(true);
        try {
            const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.data);
                if (data.pagination) {
                    setCurrentPage(data.pagination.page);
                    setTotalPages(data.pagination.totalPages);
                    setTotalUsers(data.pagination.total);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (canManageUsers) {
            fetchUsers(currentPage, pageSize);
        }
    }, [canManageUsers, currentPage, pageSize]);

    const fetchRolesList = async () => {
        try {
            const response = await fetch('/api/roles');
            const data = await response.json();
            if (data.success) {
                setRolesList(data.data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const fetchKecamatanList = async () => {
        try {
            const response = await fetch('/api/kecamatans');
            const data = await response.json();
            if (data.success) {
                setKecamatanList(data.data);
            }
        } catch (error) {
            console.error('Error fetching kecamatans:', error);
        }
    };

    const fetchDesaList = async (kecamatan: string) => {
        try {
            const response = await fetch(`/api/desas/list?kecamatan=${kecamatan}`);
            const data = await response.json();
            if (data.success) {
                setDesaList(data.data);
            }
        } catch (error) {
            console.error('Error fetching desas:', error);
        }
    };

    useEffect(() => {
        fetchRolesList();
        fetchKecamatanList();
    }, []);

    useEffect(() => {
        if (selectedKecamatan) {
            fetchDesaList(selectedKecamatan);
        } else {
            setDesaList([]);
        }
    }, [selectedKecamatan]);

    useEffect(() => {
        if (formData.role !== 'kecamatan' && formData.role !== 'desa') {
            setFormData(prev => ({ ...prev, kode_wilayah: '' }));
            setSelectedKecamatan('');
        } else if (formData.role === 'kecamatan') {
            setSelectedKecamatan('');
            setDesaList([]);
        }
    }, [formData.role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: editingUser ? 'User berhasil diperbarui' : 'User berhasil dibuat',
                    timer: 2000,
                    showConfirmButton: false,
                });
                setShowModal(false);
                resetForm();
                fetchUsers();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: data.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error!', text: 'Terjadi kesalahan' });
        }
    };

    const handleDelete = async (userId: number) => {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Hapus User?',
            text: 'User akan dihapus secara permanen',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
        });
        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'User berhasil dihapus', timer: 2000, showConfirmButton: false });
                fetchUsers();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: data.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error!', text: 'Terjadi kesalahan' });
        }
    };

    const resetForm = () => {
        setFormData({ username: '', password: '', name: '', role: '', kode_wilayah: '' });
        setEditingUser(null);
        setSelectedKecamatan('');
        setDesaList([]);
    };

    const handleEdit = async (u: UserData) => {
        setEditingUser(u);
        setFormData({ username: u.username, password: '', name: u.name, role: u.role, kode_wilayah: u.kode_wilayah || '' });
        if (u.role === 'desa' && u.kode_wilayah) {
            const parts = u.kode_wilayah.split('.');
            if (parts.length >= 3) {
                const kecCode = parts[2];
                setSelectedKecamatan(kecCode);
                await fetchDesaList(kecCode);
            }
        } else {
            setSelectedKecamatan('');
        }
        setShowModal(true);
    };

    if (loading || !canManageUsers) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin text-emerald-600" size={32} />
                        <span className="text-gray-600">Loading...</span>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-emerald-900 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                            User Management
                        </h1>
                        <p className="text-gray-500 mt-1">Kelola pengguna dan hak akses sistem</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        <UserPlus size={20} />
                        Tambah User
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {Object.entries(roleLabels).map(([role, label]) => {
                        const count = users.filter(u => u.role === role).length;
                        return (
                            <div key={role} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${roleStyles[role as UserRole]}`}>
                                        {roleIcons[role as UserRole]}
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                                        <div className="text-xs text-gray-500">{label}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4">
                        <h2 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                            <Users size={20} className="text-emerald-600" />
                            Daftar Pengguna
                            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm rounded-full">{totalUsers} users</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Username</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nama</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Kode Wilayah</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <Loader2 className="animate-spin text-emerald-600" size={24} />
                                                <span className="text-gray-500">Loading data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <Users size={40} className="mx-auto mb-2 text-gray-300" />
                                            <span>Tidak ada data pengguna</span>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm uppercase">
                                                        {u.username.substring(0, 2)}
                                                    </div>
                                                    <span className="text-gray-900 font-medium">{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{u.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${roleStyles[u.role]}`}>
                                                    {roleIcons[u.role]}
                                                    {roleLabels[u.role]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.kode_wilayah ? (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono text-sm">{u.kode_wilayah}</span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Edit User">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    {u.id !== user?.id && (
                                                        <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Hapus User">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {editingUser ? <><Edit3 className="text-blue-600" size={22} />Edit User</> : <><UserPlus className="text-emerald-600" size={22} />Tambah User Baru</>}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Masukkan username" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password {editingUser && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}</label>
                                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Masukkan password" required={!editingUser} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Masukkan nama lengkap" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required>
                                    <option value="">-- Pilih Role --</option>
                                    {rolesList.map((role) => (<option key={role.id} value={role.code}>{role.name}</option>))}
                                </select>
                            </div>
                            {formData.role === 'kecamatan' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kecamatan</label>
                                    <select value={formData.kode_wilayah} onChange={(e) => setFormData({ ...formData, kode_wilayah: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required>
                                        <option value="">-- Pilih Kecamatan --</option>
                                        {kecamatanList.map((kec) => (<option key={kec.d_kd_kec} value={kec.d_kd_kec}>{kec.d_nm_kec} ({kec.d_kd_kec})</option>))}
                                    </select>
                                </div>
                            )}
                            {formData.role === 'desa' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kecamatan</label>
                                        <select value={selectedKecamatan} onChange={(e) => { setSelectedKecamatan(e.target.value); setFormData({ ...formData, kode_wilayah: '' }); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required>
                                            <option value="">-- Pilih Kecamatan --</option>
                                            {kecamatanList.map((kec) => (<option key={kec.d_kd_kec} value={kec.d_kd_kec}>{kec.d_nm_kec}</option>))}
                                        </select>
                                    </div>
                                    {selectedKecamatan && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Desa</label>
                                            <select value={formData.kode_wilayah} onChange={(e) => setFormData({ ...formData, kode_wilayah: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required>
                                                <option value="">-- Pilih Desa --</option>
                                                {desaList.map((desa) => (<option key={desa.d_kd_kel} value={desa.d_kd_kel}>{desa.d_nm_kel} ({desa.d_kd_kel})</option>))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold flex items-center justify-center gap-2">
                                    <Save size={18} />Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
