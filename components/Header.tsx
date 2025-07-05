import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import UserMenu from './auth/UserMenu';
import { Button } from './ui/Button';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const { user, authState } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl" onClick={closeMobileMenu}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 sm:h-6 sm:w-6">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
          </svg>
          <span className="hidden sm:inline">Dynamic Forms</span>
          <span className="sm:hidden">Forms</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {authState === 'unauthenticated' && (
            <nav className="flex items-center gap-6 text-sm font-medium">
              <NavLink
                to="/features"
                className={({ isActive }) =>
                  cn('text-neutral-600 transition-colors hover:text-neutral-900 px-2 py-1 rounded', isActive && 'text-neutral-900 font-semibold')
                }
              >
                Features
              </NavLink>
              <NavLink
                to="/pricing"
                className={({ isActive }) =>
                  cn('text-neutral-600 transition-colors hover:text-neutral-900 px-2 py-1 rounded', isActive && 'text-neutral-900 font-semibold')
                }
              >
                Pricing
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  cn('text-neutral-600 transition-colors hover:text-neutral-900 px-2 py-1 rounded', isActive && 'text-neutral-900 font-semibold')
                }
              >
                About
              </NavLink>
            </nav>
          )}
          
          {authState === 'authenticated' && user ? (
            <>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <NavLink
                  to="/create"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-2 py-1 rounded', isActive && 'text-neutral-900 font-semibold')
                  }
                >
                  Create
                </NavLink>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-2 py-1 rounded', isActive && 'text-neutral-900 font-semibold')
                  }
                >
                  Dashboard
                </NavLink>
              </nav>
              <UserMenu />
            </>
          ) : authState === 'unauthenticated' ? (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : null}
        </div>

        {/* Mobile Menu Button & Essential Items */}
        <div className="flex md:hidden items-center gap-2">
          {authState === 'authenticated' && user ? (
            <UserMenu />
          ) : authState === 'unauthenticated' ? (
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
          ) : null}
          
          <button
            onClick={toggleMobileMenu}
            className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            {authState === 'unauthenticated' && (
              <nav className="flex flex-col space-y-3">
                <NavLink
                  to="/features"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-3 py-2 rounded-md text-sm font-medium', isActive && 'text-neutral-900 font-semibold bg-neutral-50')
                  }
                  onClick={closeMobileMenu}
                >
                  Features
                </NavLink>
                <NavLink
                  to="/pricing"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-3 py-2 rounded-md text-sm font-medium', isActive && 'text-neutral-900 font-semibold bg-neutral-50')
                  }
                  onClick={closeMobileMenu}
                >
                  Pricing
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-3 py-2 rounded-md text-sm font-medium', isActive && 'text-neutral-900 font-semibold bg-neutral-50')
                  }
                  onClick={closeMobileMenu}
                >
                  About
                </NavLink>
              </nav>
            )}
            
            {authState === 'authenticated' && user && (
              <nav className="flex flex-col space-y-3">
                <NavLink
                  to="/create"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-3 py-2 rounded-md text-sm font-medium', isActive && 'text-neutral-900 font-semibold bg-neutral-50')
                  }
                  onClick={closeMobileMenu}
                >
                  Create Form
                </NavLink>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn('text-neutral-600 transition-colors hover:text-neutral-900 px-3 py-2 rounded-md text-sm font-medium', isActive && 'text-neutral-900 font-semibold bg-neutral-50')
                  }
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </NavLink>
              </nav>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
