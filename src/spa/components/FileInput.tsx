"use client";

import { ChangeEvent, FC } from "react";

interface FileInputProps {
  onFileLoad: (content: string) => void;
  onError: (message: string) => void;
  error: string;
}

export const FileInput: FC<FileInputProps> = ({ onFileLoad, onError, error }) => {
  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") onFileLoad(reader.result);
    };
    reader.onerror = () => onError("This file could not be read. Please try another CSV.");
    reader.readAsText(file);
    event.currentTarget.value = "";
  };

  return (
    <section className="upload-card" aria-labelledby="upload-title">
      <div className="upload-card__icon" aria-hidden="true">
        ↥
      </div>
      <h2 id="upload-title">Bring your gradebook in</h2>
      <p>
        Export a CSV gradebook from CodeGrade and choose it here. Your student
        data stays in this browser.
      </p>
      <label className="upload-card__dropzone">
        <input type="file" accept=".csv,text/csv" onChange={readFile} />
        <strong>Choose your CodeGrade CSV</strong>
        <span>CSV files only · Nothing is uploaded</span>
      </label>
      {error && (
        <p className="upload-card__error" role="alert">
          {error}
        </p>
      )}
      <div className="upload-card__privacy">
        <span aria-hidden="true">●</span>
        Private by design — processing happens locally
      </div>
    </section>
  );
};