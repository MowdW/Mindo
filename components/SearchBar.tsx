import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onImportFile: (file: any) => void;
  isVisible?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearch,
  onImportFile,
  isVisible = true
}) => {
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle search input with debounce
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Set new debounce timeout
    const timeout = setTimeout(() => {
      onSearch(value);
    }, 300);
    
    setDebounceTimeout(timeout);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mindo-search-bar-container">
      {/* Search Input */}
      <div className="mindo-search-bar">
        <Search size={16} className="mindo-search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchInput}
          placeholder="搜索文件..."
          className="mindo-search-input"
        />
      </div>
      
      {/* Search Results */}
      {searchQuery && (
        <div className="mindo-search-results">
          {isSearching ? (
            <div className="mindo-search-loading">搜索中...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((file, index) => (
              <div 
                  key={index} 
                  className="mindo-search-result-item"
                  onClick={() => onImportFile(file)}
              >
                  <div className="mindo-search-result-info">
                      <div className="mindo-search-result-name">{file.name}</div>
                      <div className="mindo-search-result-path">{file.path}</div>
                  </div>
              </div>
            ))
          ) : searchQuery ? (
            <div className="mindo-search-no-results">没有找到匹配的文件</div>
          ) : null}
        </div>
      )}
    </div>
  );
};