"use client";

import * as React from "react";
import { X, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type Option = Record<"value" | "label", string>;

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select items...", className }: MultiSelectProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = (value: string) => {
        onChange(selected.filter((s) => s !== value));
    };

    const handleSelect = (value: string) => {
        setInputValue("");
        if (selected.includes(value)) {
            onChange(selected.filter((s) => s !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const selectedOptions = options.filter((option) => selected.includes(option.value));

    return (
        <Command onKeyDown={(e) => {
            if (e.key === "Backspace" && !inputValue) {
                e.preventDefault();
                if (selected.length > 0) {
                    handleUnselect(selected[selected.length - 1]);
                }
            }
            if (e.key === "Escape") {
                inputRef.current?.blur();
            }
        }} className={className}>
            <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex gap-1 flex-wrap">
                    {selectedOptions.map((option) => (
                        <Badge key={option.value} variant="secondary">
                            {option.label}
                            <button
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleUnselect(option.value);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={() => handleUnselect(option.value)}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                    <CommandPrimitive.Input
                        ref={inputRef}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onBlur={() => setOpen(false)}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                    />
                </div>
            </div>
            <div className="relative mt-2">
                {open && (
                    <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandList>
                            <CommandGroup className="h-full overflow-auto">
                                {options.map((option) => {
                                    const isSelected = selected.includes(option.value);
                                    return (
                                        <CommandItem
                                            key={option.value}
                                            onSelect={() => handleSelect(option.value)}
                                            className="cursor-pointer"
                                        >
                                            <div
                                                className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                                    }`}
                                            >
                                                <Check className="h-4 w-4" />
                                            </div>
                                            {option.label}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </div>
                )}
            </div>
        </Command>
    );
}
