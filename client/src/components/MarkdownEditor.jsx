import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateMarkdownContent } from '../store/canvasSlice';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownEditor = () => {
  const dispatch = useDispatch();
  const { markdownContent, isMarkdownEditorVisible } = useSelector((state) => state.canvas);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(markdownContent);

  useEffect(() => {
    setLocalContent(markdownContent);
  }, [markdownContent]);

  const handleContentChange = (e) => {
    setLocalContent(e.target.value);
  };

  const handleBlur = () => {
    dispatch(updateMarkdownContent(localContent));
    setIsEditing(false);
  };

  if (!isMarkdownEditorVisible) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor/Preview Toggle */}
      <div className="p-2 border-b dark:border-dark-border flex justify-end">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isEditing ? 'Preview' : 'Edit'}
        </button>
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <textarea
            value={localContent}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="w-full h-full p-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg dark:bg-dark-surface dark:text-dark-text dark:border-dark-border"
            placeholder="Write your notes in Markdown..."
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {localContent || 'No content yet. Click Edit to add notes.'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor; 