'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const getLogo = () => {
    if (typeof window !== 'undefined') {
      const company = JSON.parse(localStorage.getItem('company') || 'null');
      if (company?.logo_url) return company.logo_url;
    }
    return '/logo.png';
  };

  if (splash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 gap-6">
        <Image src="/logo.png" alt="ITO" width={100} height={100} className="rounded-2xl shadow-lg animate-pulse" />
        <p className="text-gray-500 text-sm animate-pulse">Cargando...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const data = response.data;

      localStorage.setItem('token', data.access_token);

      const userResponse = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(userResponse.data));

      if (data.company_id) {
        const companyData = {
          id: data.company_id,
          name: data.company_name,
          logo_url: data.company_logo,
          primary_color: data.company_primary_color,
          secondary_color: data.company_secondary_color,
          modules: data.company_modules || [],
        };
        localStorage.setItem('company', JSON.stringify(companyData));

        if (companyData.primary_color) {
          document.documentElement.style.setProperty('--primary', companyData.primary_color);
        }
        if (companyData.secondary_color) {
          document.documentElement.style.setProperty('--secondary', companyData.secondary_color);
        }
      }

      toast.success('¡Bienvenido!');
      router.push('/dashboard');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <Image src={getLogo()} alt="Logo" width={80} height={80} className="mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
          <p className="text-gray-500 mt-2">Ingresa a tu cuenta</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
