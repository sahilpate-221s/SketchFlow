import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronRight, Save } from 'lucide-react';
import { updateMarkdownContent } from '../store/canvasSlice';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownEditor = () => {
  const dispatch = useDispatch();
  const { markdownContent, isMarkdownEditorVisible } = useSelector((state) => state.canvas);
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(markdownContent);

  useEffect(() => {
    setLocalContent(markdownContent);
  }, [markdownContent]);

  const handleContentChange = (e) => {
    setLocalContent(e.target.value);
  };

  const handleSave = () => {
    dispatch(updateMarkdownContent(localContent));
    setIsEditing(false);
  };

  if (!isMarkdownEditorVisible) {
    return null;
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl shadow-xl border-r border-gray-100/50 dark:border-dark-border/50 transition-all duration-300 ease-in-out ${
      isOpen ? 'w-96 translate-x-0' : 'w-12 -translate-x-0'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white dark:bg-dark-surface p-1.5 rounded-full shadow-lg border border-gray-100/50 dark:border-dark-border/50 hover:scale-110 transition-all duration-200 ${
          isOpen ? 'rotate-180' : 'rotate-0'
        }`}
        title={isOpen ? 'Hide Editor' : 'Show Editor'}
      >
        <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Content */}
      <div className={`h-full flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100/50 dark:border-dark-border/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Markdown Editor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title="Save Changes"
              >
                <Save size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Editor/Preview Content */}
        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <textarea
              value={localContent}
              onChange={handleContentChange}
              className="w-full h-full p-4 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800 dark:text-gray-200 font-mono text-sm"
              placeholder="Write your markdown here..."
            />
          ) : (
            <div className="p-4 prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {localContent || 'No content yet. Click Edit to start writing...'}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor; 