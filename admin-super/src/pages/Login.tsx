import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { playClick, playSuccess } from '../lib/sound';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    playClick();
    try {
      await login(email, password);
      playSuccess();
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '';
      const isNetwork = msg.includes('Network') || msg.includes('ERR_') || msg.includes('Failed to fetch');
      setError(isNetwork ? 'Сервер недоступен. Запустите бэкенд: docker compose up -d' : 'Неверный email или пароль');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <div className="w-full max-w-sm rounded-xl border border-slate-700/50 bg-slate-800/50 p-8 shadow-xl animate-fade-in">
        <h1 className="mb-6 text-xl font-bold text-white">CarWash Admin</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
