/**
 * Oversikt 12 mnd Page
 * Overview and statistics for the last 12 months
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardHeader, CardContent } from './ui/card';

interface OversiktPageProps {
  onNavigate?: (page: string) => void;
}

export const OversiktPage: React.FC<OversiktPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('oversikt');

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Oversikt 12 mnd</h1>
            <p className="text-gray-600 mt-2">
              Statistikk og oversikt for de siste 12 månedene
            </p>
          </div>

          {/* Placeholder Content */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Månedlig oversikt</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Innhold kommer snart...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OversiktPage;

