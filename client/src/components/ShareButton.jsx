import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';

const ShareButton = ({ className = '' }) => {
  const [showDialog, setShowDialog] = useState(false);
  const { id } = useParams();
  const buttonRef = useRef(null);

  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowDialog(false);
      }
    };

    if (showDialog) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDialog]);

  const handleShare = () => {
    setShowDialog(!showDialog);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setShowDialog(false);
  };

  const getShareUrl = (mode) => {
    const baseUrl = window.location.origin;
    const url = new URL(`${baseUrl}/diagram/${id}/${mode}`);
    if (shareToken) {
      url.searchParams.set('shareToken', shareToken);
    }
    return url.toString();
  };

  return (
    <div ref={buttonRef} className="relative">
      <button
        onClick={handleShare}
        className={`${className} relative`}
        title="Share Canvas"
        tabIndex={0}
        onMouseEnter={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '1'; }}
        onMouseLeave={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
        onBlur={e => { const tooltip = e.currentTarget.querySelector('.toolbar-tooltip'); if (tooltip) tooltip.style.opacity = '0'; }}
      >
        <span className="toolbar-btn-icon bottom"><Share2 size={20} /></span>
        <span className="toolbar-tooltip" style={{opacity: 0, transition: 'opacity 0.12s'}}>Share Canvas</span>
      </button>

      {showDialog && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-[480px] toolbar-collab-list">
          <div className="bg-gradient-to-br from-neutral-900/95 to-black/95 rounded-xl shadow-2xl p-5 border border-white/10">
            <div className="text-sm font-medium text-gray-100 mb-4">Share Canvas</div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">Editor Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl('edit')}
                    className="flex-1 px-3 py-2 bg-neutral-800 border border-white/10 rounded text-white text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(getShareUrl('edit'))}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">Full editing access</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">Viewer Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl('view')}
                    className="flex-1 px-3 py-2 bg-neutral-800 border border-white/10 rounded text-white text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(getShareUrl('view'))}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">Read-only access</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton; 