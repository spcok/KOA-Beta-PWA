import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

const BetaFeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);

    const payload = {
      message: message.trim(),
      is_online: navigator.onLine,
      url: window.location.pathname,
      role: currentUser?.role || 'Unknown',
      user_name: currentUser?.name || 'Unknown',
    };

    try {
      const { error } = await supabase.from('bug_reports').insert([payload]);
      
      if (error) throw error;

      setIsOpen(false);
      setMessage('');
      alert('Thank you for your feedback! Your report has been captured.');
    } catch (err) {
      console.error('Failed to submit bug report:', err);
      alert('Failed to submit report. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 hover:scale-105 hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        title="Send Beta Feedback"
      >
        <MessageCircle size={24} />
        <span className="absolute right-full mr-4 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
          Beta Feedback
        </span>
      </button>

      {/* Slide-over / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end sm:p-6 sm:pr-6 sm:pb-6 pointer-events-none">
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm sm:hidden pointer-events-auto transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Widget Container */}
          <div className="w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-300 border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">Beta Feedback</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Found a bug or have a suggestion? Let us know! We automatically capture your current page and role to help us debug.
              </p>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue or feature request..."
                className="w-full h-32 p-3 border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm shadow-inner bg-slate-50"
                required
              />

              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-slate-400 font-mono flex flex-col gap-0.5">
                  <span>URL: {window.location.pathname}</span>
                  <span>Role: {currentUser?.role || 'Unknown'}</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Sending...' : 'Send'}
                  <Send size={16} className={isSubmitting ? 'animate-pulse' : ''} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BetaFeedbackWidget;
