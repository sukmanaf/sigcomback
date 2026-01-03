'use client';

import { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Navbar from '@/components/Navbar';
import { UserPlus, Edit3, Trash2, Shield, Building2, MapPin, Users, User, X, Save } from 'lucide-react';

interface User {
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
    admin: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30',
    bapenda: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30',
    bpn: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30',
    kecamatan: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30',
    desa: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30',
};

export default function UsersPage() {
    const { user, loading, canManageUsers } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
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
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Redirect if not admin
    useEffect(() => {
        if (!loading && (!user || !canManageUsers)) {
            router.push('/map');
        }
    }, [loading, user, canManageUsers, router]);

    // Fetch users with pagination
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManageUsers, currentPage, pageSize]);

    // Fetch roles list
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

    // Fetch kecamatan list
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

    // Fetch desa list based on kecamatan
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

    // Fetch roles and kecamatan on mount
    useEffect(() => {
        fetchRolesList();
        fetchKecamatanList();
    }, []);

    // Fetch desa when kecamatan changes (for desa role)
    useEffect(() => {
        if (selectedKecamatan) {
            fetchDesaList(selectedKecamatan);
        } else {
            setDesaList([]);
        }
    }, [selectedKecamatan]);

    // Reset kode_wilayah when role changes
    useEffect(() => {
        if (formData.role !== 'kecamatan' && formData.role !== 'desa') {
            setFormData(prev => ({ ...prev, kode_wilayah: '' }));
            setSelectedKecamatan('');
        } else if (formData.role === 'kecamatan') {
            setSelectedKecamatan('');
            setDesaList([]);
        }
    }, [formData.role]);

    // Handle form submit
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
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: data.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: 'Terjadi kesalahan',
            });
        }
    };

    // Handle delete
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
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'User berhasil dihapus',
                    timer: 2000,
                    showConfirmButton: false,
                });
                fetchUsers();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: data.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: 'Terjadi kesalahan',
            });
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            name: '',
            role: '',
            kode_wilayah: '',
        });
        setEditingUser(null);
        setSelectedKecamatan('');
        setDesaList([]);
    };

    // Open edit modal
    const handleEdit = async (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            name: user.name,
            role: user.role,
            kode_wilayah: user.kode_wilayah || '',
        });

        // For desa role, extract kecamatan code from desa code and fetch desa list
        if (user.role === 'desa' && user.kode_wilayah) {
            // Desa code format: 35.75.XXX.YYY - extract XXX
            const parts = user.kode_wilayah.split('.');
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
            {/* Navbar */}
            <Navbar />

            {/* Content */}
            <div className="max-w-7xl mx-auto p-6 pt-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                                User Management
                            </h1>
                            <p className="text-slate-400 text-sm sm:text-base">Kelola pengguna dan hak akses sistem</p>
                        </div>
                        <button
                            onClick={() => {
                                resetForm();
                                setShowModal(true);
                            }}
                            className="group flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                        >
                            <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
                            Tambah User
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    {Object.entries(roleLabels).map(([role, label]) => {
                        const count = users.filter(u => u.role === role).length;
                        return (
                            <div key={role} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${roleStyles[role as UserRole]}`}>
                                        {roleIcons[role as UserRole]}
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{count}</div>
                                        <div className="text-xs text-slate-400">{label}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-white/10 px-6 py-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users size={20} className="text-emerald-400" />
                            Daftar Pengguna
                            <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                                {totalUsers} users
                            </span>
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nama</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kode Wilayah</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-slate-400">Loading data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users size={40} className="text-slate-600" />
                                                <span>Tidak ada data pengguna</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u, index) => (
                                        <tr
                                            key={u.id}
                                            className="hover:bg-white/5 transition-colors duration-200 group"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-semibold text-sm uppercase shadow-lg">
                                                        {u.username.substring(0, 2)}
                                                    </div>
                                                    <span className="text-white font-medium">{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{u.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${roleStyles[u.role]}`}>
                                                    {roleIcons[u.role]}
                                                    {roleLabels[u.role]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.kode_wilayah ? (
                                                    <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded font-mono text-sm">
                                                        {u.kode_wilayah}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(u)}
                                                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all duration-200 hover:scale-110"
                                                        title="Edit User"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    {u.id !== user?.id && (
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200 hover:scale-110"
                                                            title="Hapus User"
                                                        >
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

                    {/* Pagination Controls */}
                    <div className="border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value={5} className="bg-slate-800">5</option>
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
                            {/* Prev Button */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                Prev
                            </button>

                            {/* Page Numbers */}
                            {(() => {
                                const pages: (number | string)[] = [];
                                const showEllipsisStart = currentPage > 4;
                                const showEllipsisEnd = currentPage < totalPages - 3;

                                // Always show first page
                                pages.push(1);

                                if (showEllipsisStart) {
                                    pages.push('...');
                                }

                                // Show pages around current page
                                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                                    if (!pages.includes(i)) {
                                        pages.push(i);
                                    }
                                }

                                if (showEllipsisEnd) {
                                    pages.push('...');
                                }

                                // Always show last page if more than 1 page
                                if (totalPages > 1 && !pages.includes(totalPages)) {
                                    pages.push(totalPages);
                                }

                                return pages.map((page, idx) =>
                                    page === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-slate-500">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page as number)}
                                            className={`min-w-[36px] px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${currentPage === page
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                );
                            })()}

                            {/* Next Button */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
                >
                    <div
                        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingUser ? (
                                    <>
                                        <Edit3 className="text-blue-400" size={22} />
                                        Edit User
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="text-emerald-400" size={22} />
                                        Tambah User Baru
                                    </>
                                )}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                    placeholder="Masukkan username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password {editingUser && <span className="text-slate-500 font-normal">(kosongkan jika tidak diubah)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                    placeholder="Masukkan password"
                                    required={!editingUser}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                    placeholder="Masukkan nama lengkap"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                    required
                                >
                                    <option value="" className="bg-slate-800">-- Pilih Role --</option>
                                    {rolesList.map((role) => (
                                        <option key={role.id} value={role.code} className="bg-slate-800">
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Kecamatan Dropdown - for kecamatan role */}
                            {formData.role === 'kecamatan' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Pilih Kecamatan
                                    </label>
                                    <select
                                        value={formData.kode_wilayah}
                                        onChange={(e) => setFormData({ ...formData, kode_wilayah: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                        required
                                    >
                                        <option value="" className="bg-slate-800">-- Pilih Kecamatan --</option>
                                        {kecamatanList.map((kec) => (
                                            <option key={kec.d_kd_kec} value={kec.d_kd_kec} className="bg-slate-800">
                                                {kec.d_nm_kec} ({kec.d_kd_kec})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Kecamatan + Desa Dropdown - for desa role */}
                            {formData.role === 'desa' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Pilih Kecamatan
                                        </label>
                                        <select
                                            value={selectedKecamatan}
                                            onChange={(e) => {
                                                setSelectedKecamatan(e.target.value);
                                                setFormData({ ...formData, kode_wilayah: '' });
                                            }}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                            required
                                        >
                                            <option value="" className="bg-slate-800">-- Pilih Kecamatan --</option>
                                            {kecamatanList.map((kec) => (
                                                <option key={kec.d_kd_kec} value={kec.d_kd_kec} className="bg-slate-800">
                                                    {kec.d_nm_kec}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedKecamatan && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Pilih Desa
                                            </label>
                                            <select
                                                value={formData.kode_wilayah}
                                                onChange={(e) => setFormData({ ...formData, kode_wilayah: e.target.value })}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                                                required
                                            >
                                                <option value="" className="bg-slate-800">-- Pilih Desa --</option>
                                                {desaList.map((desa) => (
                                                    <option key={desa.d_kd_kel} value={desa.d_kd_kel} className="bg-slate-800">
                                                        {desa.d_nm_kel} ({desa.d_kd_kel})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 border border-white/10 text-slate-300 rounded-xl hover:bg-white/5 transition-all duration-200 font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
