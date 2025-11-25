import logoPath from "@assets/original high resolution_1764084624104.png";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={logoPath} 
            alt="TN Credit Solutions Logo" 
            className="h-12 w-auto"
            data-testid="img-logo"
          />
        </div>
      </div>
    </header>
  );
}
