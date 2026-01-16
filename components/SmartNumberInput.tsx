import React, { useState, useEffect, useRef } from 'react';

interface SmartNumberInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
}

export const SmartNumberInput: React.FC<SmartNumberInputProps> = ({ value, onChange, className, placeholder }) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setInputValue(value.toString());
        }
    }, [value, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setInputValue(raw);

        // Smart parsing: replace comma with dot, allow digits and one dot
        // This regex allows '123' '123,' '123.45'
        const normalized = raw.replace(/,/g, '.');
        const number = parseFloat(normalized);

        if (!isNaN(number)) {
            onChange(number);
        } else if (raw === '') {
            onChange(0);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        // On blur, format nicely or just show the number logic
        setInputValue(value.toString());
    };

    const handleFocus = () => {
        setIsEditing(true);
    };

    return (
        <input
            type="text"
            className={className}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
        />
    );
};
