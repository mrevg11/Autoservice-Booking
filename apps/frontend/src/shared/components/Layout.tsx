import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useLogout } from '../hooks/useAuth';
import ToastContainer from './Toast';
import NotificationBell from './NotificationBell';

interface NavItem { to: string; label: string }

const clientNav: NavItem[] = [
  { to: '/client/dashboard', label: 'Головна' },
  { to: '/client/bookings', label: 'Мої записи' },
  { to: '/client/vehicles', label: 'Мої авто' },
  { to: '/client/recommendations', label: 'Рекомендації' },
  { to: '/client/profile', label: 'Профіль' },
];

const masterNav: NavItem[] = [
  { to: '/master/dashboard', label: 'Головна' },
  { to: '/master/bookings', label: 'Мої записи' },
  { to: '/master/schedule', label: 'Мій розклад' },
  { to: '/master/profile', label: 'Профіль' },
];

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Дашборд' },
  { to: '/admin/users', label: 'Користувачі' },
  { to: '/admin/services', label: 'Послуги' },
  { to: '/admin/masters', label: 'Майстри' },
  { to: '/admin/bookings', label: 'Записи' },
  { to: '/admin/analytics', label: 'Аналітика' },
];

function NavLinks({ items, onClick }: { items: NavItem[]; onClick?: () => void }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${isActive ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export default function Layout() {
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleRegisterClick = () => {
    if (location.pathname === '/') {
      document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const navItems = user?.role === 'MASTER' ? masterNav : user?.role === 'ADMIN' ? adminNav : clientNav;
  const showNav = isAuthenticated() && (user?.role === 'CLIENT' || user?.role === 'MASTER' || user?.role === 'ADMIN');

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col">
      {/* Navbar */}
      <header className="bg-brand text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 font-extrabold text-lg tracking-tight">
            <span className="text-white">Auto</span>
            <span className="text-accent">Service</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent mb-2" />
          </Link>

          {/* Desktop nav */}
          {showNav && (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated() && user ? (
              <div className="flex items-center gap-1">
              <NotificationBell />
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Меню користувача"
                >
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <span className="hidden sm:block text-sm text-white/90">{user.firstName}</span>
                  <span className="text-white/60 text-xs">▾</span>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-card border border-slate-100 py-1 z-50"
                    onBlur={() => setDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setDropdownOpen(false); logoutMutation.mutate(); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Вийти
                    </button>
                  </div>
                )}
              </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors">
                  Увійти
                </Link>
                <button onClick={handleRegisterClick} className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                  Реєстрація
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            {showNav && (
              <button
                className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Меню"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && showNav && (
          <nav className="lg:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1">
            <NavLinks items={navItems} onClick={() => setMenuOpen(false)} />
          </nav>
        )}
      </header>

      {/* Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        {showNav && (
          <aside className="hidden lg:flex flex-col w-56 min-h-full bg-white border-r border-slate-200 pt-6 px-3">
            <nav className="flex flex-col gap-0.5">
              <NavLinks items={navItems} />
            </nav>
            {user?.role === 'CLIENT' && (
              <div className="mt-auto pb-4">
                <button
                  onClick={() => navigate('/client/bookings/new')}
                  className="w-full mt-4 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent-hover transition-colors"
                >
                  + Новий запис
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />

      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
