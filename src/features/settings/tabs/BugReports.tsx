import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Download, Bug, Wifi, WifiOff, Clock, User, Link } from 'lucide-react';

interface BugReport {
  id: string;
  created_at: string;
  message: string;
  is_online: boolean;
  url: string;
  role: string;
  user_name: string;
}

const BugReports: React.FC = () => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('bug_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } catch (err) {
        console.error('Error fetching bug reports:', err);
        setError('Failed to load bug reports.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (reports.length === 0) return;

    const headers = ['ID', 'Date', 'User', 'Role', 'URL', 'Status', 'Message'];
    const csvContent = [
      headers.join(','),
      ...reports.map(report => [
        report.id,
        new Date(report.created_at).toLocaleString().replace(/,/g, ''),
        `"${report.user_name}"`,
        report.role,
        report.url,
        report.is_online ? 'Online' : 'Offline',
        `"${report.message.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bug-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Beta Feedback & Bug Reports</h2>
          <p className="text-sm text-slate-500">Review feedback submitted by users during the beta phase.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={reports.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Bug className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No reports yet</h3>
          <p className="text-slate-500">When users submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Context</th>
                  <th className="px-6 py-4">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(report.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{report.user_name}</p>
                          <p className="text-xs text-slate-500">{report.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Link size={12} className="text-slate-400" />
                          <span className="truncate max-w-[150px]" title={report.url}>{report.url}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          {report.is_online ? (
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Wifi size={10} /> Online
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              <WifiOff size={10} /> Offline
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="text-slate-700 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {report.message}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugReports;
