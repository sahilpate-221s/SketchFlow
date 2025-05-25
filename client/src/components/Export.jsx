import { Download, FileJson, FileImage, FileCode } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { exportCanvas } from '../store/canvasSlice';

const Export = ({ stageRef }) => {
  const dispatch = useDispatch();

  const handleExportPNG = () => {
    if (!stageRef.current) return;

    // Get the stage and its data URL
    const stage = stageRef.current;
    const dataURL = stage.toDataURL({
      pixelRatio: 2, // Higher quality
      mimeType: 'image/png',
      quality: 1,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `sketchflow-${new Date().toISOString()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleExportSVG = () => {
    if (!stageRef.current) return;

    // Get the stage and its SVG
    const stage = stageRef.current;
    const svg = stage.toSVG({
      pixelRatio: 2,
    });

    // Create blob and download link
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sketchflow-${new Date().toISOString()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    dispatch(exportCanvas());
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleExportPNG}
        className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-all duration-200 hover:scale-105 flex items-center space-x-1"
        title="Export as PNG"
      >
        <FileImage size={18} />
        <span className="text-sm">PNG</span>
      </button>

      <button
        onClick={handleExportSVG}
        className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-all duration-200 hover:scale-105 flex items-center space-x-1"
        title="Export as SVG"
      >
        <FileCode size={18} />
        <span className="text-sm">SVG</span>
      </button>

      <button
        onClick={handleExportJSON}
        className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-all duration-200 hover:scale-105 flex items-center space-x-1"
        title="Export as JSON"
      >
        <FileJson size={18} />
        <span className="text-sm">JSON</span>
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        onClick={() => {
          handleExportPNG();
          handleExportJSON();
        }}
        className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium flex items-center space-x-1 hover:scale-105 shadow-sm shadow-blue-500/20"
        title="Export All (PNG + JSON)"
      >
        <Download size={18} />
        <span>Export All</span>
      </button>
    </div>
  );
};

export default Export; 