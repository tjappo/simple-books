import { useAuth } from '../contexts/AuthContext';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export function Header() {
  const { user, isAuthenticated, logout, login } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              SimpleBooks
            </Link>
          </div>

          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link to="/invoices" className="text-gray-700 hover:text-gray-900">
                  Invoices
                </Link>
                <Link to="/vat-declaration" className="text-gray-700 hover:text-gray-900">
                  BTW-aangifte
                </Link>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <Avatar.Root className="h-8 w-8 overflow-hidden rounded-full">
                        <Avatar.Image src={user?.picture || undefined} alt={user?.name || undefined} className="h-full w-full object-cover" />
                        <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-medium text-white">
                          {user?.name?.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar.Root>
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[220px] rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5"
                      sideOffset={5}
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>

                      <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

                      <DropdownMenu.Item asChild>
                        <Link
                          to="/profile"
                          className="flex cursor-pointer items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                        onSelect={logout}
                      >
                        Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <Button onClick={login}>Log In</Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
