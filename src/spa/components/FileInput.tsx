"use client"

import { FC } from "react"

interface FileInputProps {
    onFileLoad: (_content: string) => void
}

export const FileInput: FC<FileInputProps> = props => <input
    className="input__drag"
    type="file"
    accept=".csv"
    onChange={e => {
        const file = e.currentTarget.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const csvText = event.target?.result;
            if (typeof csvText === 'string') {
                props.onFileLoad(csvText)
            }
        };

        reader.readAsText(file);
    }} />