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
    { id: 'hjem', letter: 'H' },
    { id: 'transaksjoner', letter: 'T' },
    { id: 'kategorier', letter: 'K' },
    { id: 'oversikt', letter: 'O' },
    { id: 'budsjett', letter: 'B' },
    { id: 'regler', letter: 'R' },
    { id: 'backup', letter: 'I' },
  ];

  return (
    <div className="w-[90px] h-screen bg-gray-900 text-white flex flex-col">
      {/* Header - empty space */}
      <div className="h-16 border-b border-gray-800"></div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full h-14 flex items-center justify-center rounded-lg transition-colors text-2xl font-bold ${
                  activePage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.letter}
              </button>
            </li>
          ))}
        </ul>
      </nav>

    </div>
  );
};

