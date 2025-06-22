import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Share2, Copy, Check } from 'lucide-react';
import axios from 'axios';

const ShareButton = ({ className = '' }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
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

  // Load diagram sharing status
  useEffect(() => {
    const loadSharingStatus = async () => {
      try {
        const response = await axios.get(`/api/diagrams/${id}/share-info`);
        setShareToken(response.data.shareToken);
      } catch (error) {
        console.error('Error loading sharing status:', error);
      }
    };
    if (id) {
      loadSharingStatus();
    }
  }, [id]);

  const handleShare = async () => {
    if (!showDialog && !shareToken && id) {
      // Generate shareToken if missing
      try {
        const response = await axios.post(`/api/diagrams/${id}/share`, { isPublic: false });
        setShareToken(response.data.diagram.shareToken);
      } catch (error) {
        console.error('Failed to generate share token:', error);
      }
    }
    setShowDialog(!showDialog);
  };

  const copyToClipboard = async (text, linkType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
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

      {showDialog && shareToken && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-[480px] toolbar-collab-list z-50">
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
                    onClick={() => copyToClipboard(getShareUrl('edit'), 'editor')}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    {copiedLink === 'editor' ? <Check size={16} /> : <Copy size={16} />}
                    {copiedLink === 'editor' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">Anyone with this link can edit</p>
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
                    onClick={() => copyToClipboard(getShareUrl('view'), 'viewer')}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    {copiedLink === 'viewer' ? <Check size={16} /> : <Copy size={16} />}
                    {copiedLink === 'viewer' ? 'Copied!' : 'Copy'}
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