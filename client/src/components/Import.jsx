import { Upload, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { importCanvas } from '../store/canvasSlice';

const Import = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the imported data
      if (!data.shapes || !Array.isArray(data.shapes)) {
        throw new Error('Invalid file format: missing shapes array');
      }

      if (!data.version) {
        throw new Error('Invalid file format: missing version');
      }

      // Import the canvas data
      dispatch(importCanvas(data));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to import file');
      console.error('Import error:', err);
    }

    // Reset the file input
    event.target.value = '';
  };

  return (
    <div className="relative">
      <label className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium cursor-pointer flex items-center space-x-1 hover:scale-105 shadow-sm shadow-purple-500/20">
        <Upload size={18} />
        <span>Import</span>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </label>

      {error && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600 flex items-start space-x-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Import; 