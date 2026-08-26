import { useRef } from "react";
import { Upload, Download } from "lucide-react";

interface TopActionBarProps {
  onFileSelect: (file: File) => void;
  onExport: () => void;
  datasetName: string;
  isLoading: boolean;
}

const TopActionBar = ({ onFileSelect, onExport, datasetName, isLoading }: TopActionBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
      {/* Import Button */}
      <button
        onClick={handleImportClick}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 hover:border-emerald-500/60 hover:bg-gradient-to-br hover:from-emerald-500/30 hover:to-emerald-600/30 transition-all duration-300 text-emerald-100 hover:text-emerald-50 font-medium text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-4 h-4" />
        <span>{isLoading ? "Importing..." : "Import"}</span>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      {/* Export Button */}
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/40 hover:border-amber-500/60 hover:bg-gradient-to-br hover:from-amber-500/30 hover:to-amber-600/30 transition-all duration-300 text-amber-100 hover:text-amber-50 font-medium text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      {/* Dataset indicator */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {datasetName}
      </div>
    </div>
  );
};

export default TopActionBar;
