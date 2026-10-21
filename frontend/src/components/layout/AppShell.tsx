import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const AppShell: React.FC = () => {
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-[#E5E7EB] overflow-hidden">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav selectedRepoId={selectedRepoId} onSelectRepo={setSelectedRepoId} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0B0F14]">
          <Outlet context={{ selectedRepoId }} />
        </main>
      </div>
    </div>
  );
};
