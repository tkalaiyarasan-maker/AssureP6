import React, { useState, useRef } from 'react';
import { SAMPLE_PROJECTS, SampleProjectInfo } from '../data/sampleXerData';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowRight,
  HardDrive,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadXerContent: (content: string, fileName: string) => void;
  onSelectSample: (sample: SampleProjectInfo) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onLoadXerContent,
  onSelectSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setUploadError(null);
    if (!file.name.toLowerCase().endsWith('.xer') && !file.name.toLowerCase().endsWith('.txt')) {
      setUploadError('Please select a valid Primavera P6 .xer file (or .txt export).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.includes('%T')) {
        setUploadError('The selected file does not appear to be a valid Oracle Primavera P6 XER file.');
        return;
      }
      onLoadXerContent(content, file.name);
      onClose();
    };
    reader.onerror = () => {
      setUploadError('Failed to read the file from your disk.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              Open Primavera P6 (.XER) File
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700/80 hover:border-slate-500 bg-slate-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xer,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
              <FileCode className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Click to browse or drag and drop your <span className="text-amber-400">.xer</span> file here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Parsed entirely client-side in your browser. No files are uploaded to any external server.
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Preset Sample Projects Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Or Load a Real Primavera P6 Sample Project
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {SAMPLE_PROJECTS.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => {
                    onSelectSample(sample);
                    onClose();
                  }}
                  className="p-3.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {sample.code}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{sample.category}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {sample.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{sample.description}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-slate-400 ml-4">
                    <span>{sample.activityCount} tasks</span>
                    <span className="text-amber-400 flex items-center gap-1 font-sans font-medium text-xs group-hover:translate-x-0.5 transition-transform">
                      Load &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Supported format: Oracle Primavera P6 XER (v8.0 to v24.12)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
