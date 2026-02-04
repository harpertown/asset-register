import { useState, useRef } from "react";
import { useClickOutside } from "~/hooks";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  mockAddresses: string[];
}

export default function AddressInput({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Start typing an address...",
  mockAddresses 
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  useClickOutside(
    [suggestionsRef, inputRef],
    () => setShowSuggestions(false),
    showSuggestions
  );

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (newValue.length >= 2) {
      const filtered = mockAddresses.filter((addr) =>
        addr.toLowerCase().includes(newValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 w-80"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 text-sm"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}