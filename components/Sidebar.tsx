/**
 * Sidebar Navigation Component
 * Shared navigation sidebar for all pages
 */

import React from 'react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const menuItems = [
    { id: 'hjem', label: 'Hjem', icon: '🏠' },
    { id: 'transaksjoner', label: 'Transaksjoner', icon: '💰' },
    { id: 'kategorier', label: 'Kategorier', icon: '📁' },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Økonomiverktøy</h1>
        <p className="text-sm text-gray-400 mt-1">Administrer din økonomi</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activePage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">Versjon 1.0.0</div>
      </div>
    </div>
  );
};

