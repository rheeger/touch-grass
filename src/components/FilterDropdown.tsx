import { useState, useRef, useEffect } from 'react';

interface FilterOptions {
  showOnlyGrass: boolean;
  showJustMe: boolean;
  mediaFilter: "all" | "1.0" | "0.1";
}

interface FilterDropdownProps {
  options: FilterOptions;
  onChange: (newOptions: FilterOptions) => void;
  isAuthenticated: boolean;
}

export function FilterDropdown({ options, onChange, isAuthenticated }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close the dropdown when clicking outside
  useEffect(() => {
    // Event handler works for both mouse and touch events
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    // Only add the event listener when the dropdown is open
    if (isOpen) {
      // Use mousedown and touchstart to catch all interaction types
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      // Clean up
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]); // Only re-run when isOpen changes

  // Handle individual option changes
  const handleOptionChange = <T extends keyof FilterOptions>(key: T, value: FilterOptions[T]) => {
    onChange({
      ...options,
      [key]: value
    });
  };

  // Count active filters for the badge
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (options.showOnlyGrass) count++;
    if (options.showJustMe) count++;
    if (options.mediaFilter !== "all") count++;
    return count;
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Prevent event from bubbling to document
          // Small delay to avoid immediate click-outside detection
          setTimeout(() => setIsOpen(!isOpen), 10);
        }}
        className={`view-toggle-button flex items-center space-x-1 ${
          isOpen || getActiveFilterCount() > 0 ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
        }`}
      >
        <span>FILTERS</span>
        {getActiveFilterCount() > 0 && (
          <span className="bg-green-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center ml-1">
            {getActiveFilterCount()}
          </span>
        )}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 bg-black/90 border border-white/10 rounded-lg shadow-xl p-3 min-w-[200px] z-10">
          <div className="space-y-3">
            <div className="text-xs font-mono text-white/60 pb-1 border-b border-white/10">TOUCHES</div>
            
            {/* Toggle for Grass Only */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-mono">GRASS ONLY</span>
              <div 
                className={`w-9 h-5 rounded-full relative transition-colors ${options.showOnlyGrass ? 'bg-green-500/50' : 'bg-white/10'}`} 
                onClick={() => handleOptionChange('showOnlyGrass', !options.showOnlyGrass)}
              >
                <div 
                  className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
                    options.showOnlyGrass ? 'bg-green-300 right-1' : 'bg-white/60 left-1'
                  }`} 
                />
              </div>
            </label>
            
            {/* Toggle for Just Me */}
            <label className={`flex items-center justify-between ${!isAuthenticated ? 'opacity-50' : 'cursor-pointer'}`}>
              <span className="text-xs font-mono">ME ONLY</span>
              <div 
                className={`w-9 h-5 rounded-full relative transition-colors ${
                  options.showJustMe && isAuthenticated ? 'bg-green-500/50' : 'bg-white/10'
                }`} 
                onClick={() => isAuthenticated && handleOptionChange('showJustMe', !options.showJustMe)}
              >
                <div 
                  className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
                    options.showJustMe && isAuthenticated ? 'bg-green-300 right-1' : 'bg-white/60 left-1'
                  }`} 
                />
              </div>
            </label>
            
            {/* Media Version radio buttons */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs font-mono text-white/60 pb-2">ENVIRONMENT</div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={options.mediaFilter === "all"}
                    onChange={() => handleOptionChange('mediaFilter', 'all')}
                    className="hidden"
                  />
                  <div className={`w-3 h-3 rounded-full ${options.mediaFilter === "all" ? 'bg-white' : 'bg-white/30'}`} />
                  <span className="text-xs font-mono">ALL TOUCHES</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={options.mediaFilter === "1.0"}
                    onChange={() => handleOptionChange('mediaFilter', '1.0')}
                    className="hidden"
                  />
                  <div className={`w-3 h-3 rounded-full ${
                    options.mediaFilter === "1.0" ? 'bg-yellow-300' : 'bg-white/30'
                  }`} />
                  <span className="text-xs font-mono text-yellow-300">CONTEST (3/10-12/31)</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={options.mediaFilter === "0.1"}
                    onChange={() => handleOptionChange('mediaFilter', '0.1')}
                    className="hidden"
                  />
                  <div className={`w-3 h-3 rounded-full ${options.mediaFilter === "0.1" ? 'bg-white' : 'bg-white/30'}`} />
                  <span className="text-xs font-mono">TESTING (1/1-3/9)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 