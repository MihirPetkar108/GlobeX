import { useRef } from "react";
import { FileUp, FileDown, Settings, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MinimalSidebarProps {
  onFileSelect: (file: File) => void;
  onExport: () => void;
}

const MinimalSidebar = ({ onFileSelect, onExport }: MinimalSidebarProps) => {
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

  const navItems = [
    { icon: FileUp, label: "Import", action: handleImportClick, id: "import" },
    { icon: FileDown, label: "Export", action: onExport, id: "export" },
  ];

  const utilityItems = [
    { icon: Settings, label: "Settings", action: () => {}, id: "settings" },
    { icon: HelpCircle, label: "Help", action: () => {}, id: "help" },
  ];

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <aside className="w-20 h-screen flex flex-col items-center gap-8 py-6 px-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-amber-500/10">
        {/* Logo/Brand mark */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <span className="text-slate-950 font-bold text-lg">G</span>
        </div>

      {/* Primary Nav */}
      <nav className="flex flex-col gap-4">
        {navItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                onClick={item.action}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 hover:shadow-lg hover:shadow-amber-500/20"
              >
                <item.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-950 border border-amber-500/30 text-amber-100">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Utility Nav */}
      <nav className="flex flex-col gap-4">
        {utilityItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                onClick={item.action}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-slate-700/50 text-slate-500 hover:text-slate-300"
              >
                <item.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-950 border border-slate-700/50 text-slate-300">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
    </>
  );
};

export default MinimalSidebar;
