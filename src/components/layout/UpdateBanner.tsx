import React from 'react';
import { RefreshCw } from 'lucide-react';

interface UpdateBannerProps {
  onRefresh: () => void;
  syncQueueCount: number;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ onRefresh, syncQueueCount }) => {
  const isSyncing = syncQueueCount > 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white p-3 shadow-lg flex items-center justify-center gap-4">
      <p className="text-sm font-medium">
        {isSyncing 
          ? `A new version is available, but data is syncing (${syncQueueCount} records remaining). Please wait...`
          : "A new version of the app is available."}
      </p>
      <button
        onClick={onRefresh}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
          isSyncing 
            ? 'bg-indigo-800 text-indigo-200 cursor-not-allowed' 
            : 'bg-white text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        <RefreshCw size={16} />
        Refresh to Update
      </button>
    </div>
  );
};
