import React, { useEffect, useState } from "react";
import { InputField } from "./forms";
import { useDebounce } from "../../hooks";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <InputField
      name="search"
      placeholder={placeholder}
      iconName="FaMagnifyingGlass"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      fullWidth
    />
  );
};

export default SearchInput;
