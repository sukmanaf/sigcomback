'use client';

import Navbar from '@/components/Navbar';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Trash2, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const router = useRouter();
  const { user, canManageUsers } = useAuth();
  const [appName, setAppName] = useState('');
  const [appNameShort, setAppNameShort] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin access
  useEffect(() => {
    if (user !== null && !canManageUsers) {
      router.push('/map');
    }
  }, [user, canManageUsers, router]);

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
          setAppName(data.data.app_name || '');
          setAppNameShort(data.data.app_name_short || 'SmartMap');
          setInstitutionName(data.data.institution_name || '');
          setAppLogo(data.data.app_logo || null);
          setPreviewLogo(data.data.app_logo || null);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setPreviewLogo(null);
    setAppLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let logoPath = appLogo;

      // Upload new logo if selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const uploadRes = await fetch('/api/settings/logo', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          logoPath = uploadData.data.path;
        } else {
          throw new Error(uploadData.message);
        }
      } else if (previewLogo === null && appLogo !== null) {
        // Logo was removed, delete it
        await fetch('/api/settings/logo', { method: 'DELETE' });
        logoPath = null;
      }

      // Save settings
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName,
          app_name_short: appNameShort,
          institution_name: institutionName,
          app_logo: logoPath,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAppLogo(logoPath);
        setLogoFile(null);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Pengaturan berhasil disimpan',
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          window.location.reload();
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: error.message || 'Gagal menyimpan pengaturan',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !canManageUsers) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Memeriksa akses...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-6">Pengaturan Aplikasi</h1>

          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* App Name Section */}
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Identitas Aplikasi</h2>

                <div className="space-y-6">
                  {/* App Name Short Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Singkatan
                    </label>
                    <input
                      type="text"
                      value={appNameShort}
                      onChange={(e) => setAppNameShort(e.target.value)}
                      placeholder="Contoh: SmartMap"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 transition-all"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Nama singkatan ditampilkan di navbar dan sebagai judul utama.
                    </p>
                  </div>

                  {/* App Name Full Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="Contoh: Sistem Informasi Geografis Pendapatan Daerah"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 transition-all"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Nama lengkap ditampilkan di bawah nama singkatan pada halaman login.
                    </p>
                  </div>

                  {/* Institution Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Instansi
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Contoh: BAPENDA Kota Pasuruan"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 transition-all"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Nama instansi ditampilkan di bawah tombol login (dengan tahun otomatis).
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo Aplikasi</h2>

                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                      {previewLogo ? (
                        <img
                          src={previewLogo}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon size={32} className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <Upload size={18} />
                      Upload Logo
                    </button>

                    {previewLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors ml-2"
                      >
                        <Trash2 size={18} />
                        Hapus
                      </button>
                    )}

                    <p className="text-sm text-gray-500">
                      Format: JPG, PNG, GIF, WEBP, SVG. Maksimal 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`mx-6 mt-4 p-4 rounded-lg ${message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                  {message.text}
                </div>
              )}

              {/* Actions */}
              <div className="p-6 bg-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Simpan Pengaturan
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
