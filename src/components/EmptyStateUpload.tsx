import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Layers,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { SAMPLE_PROJECTS, SampleProjectInfo } from '../data/sampleXerData';

interface EmptyStateUploadProps {
  onLoadXerContent: (content: string, fileName: string) => void;
  onSelectSample?: (sample: SampleProjectInfo) => void;
}

export const EmptyStateUpload: React.FC<EmptyStateUploadProps> = ({
  onLoadXerContent,
  onSelectSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUploadError('The selected file does not appear to be a valid Oracle Primavera P6 XER file (%T header missing).');
        return;
      }
      onLoadXerContent(content, file.name);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the file from your computer.');
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
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 select-none">
      {/* Hero Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Oracle Primavera P6 Professional Analyzer
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Primavera P6 Programme Health Check &amp; Linear Analyzer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Upload your Oracle Primavera P6 (<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">.XER</span>) file to evaluate 54-parameter health check, interactive Gantt timeline, TILOS time-chainage chart, WBS analysis, and DCMA 14 audit.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 bg-white dark:bg-slate-900/60 shadow-lg'
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

        <div className="space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Drag &amp; Drop your .XER file here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              or click anywhere to browse from your computer
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>Supported: Oracle Primavera P6 .XER exports (all versions)</span>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Feature Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            54-Parameter Health Check
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Deterministic baseline evaluation of logic density, lead/lag rules, constraint thresholds, float integrity, and executive scorecards.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Interactive Gantt Timeline
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Primavera-style 5-tier zoom (Day, Week, Month, Quarter, Year), Longest Path driving chain, and virtual windowing for 10,000+ tasks.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            TILOS (Time-Chainage Chart)
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Linear scheduling vectors generated from Level 3 WBS alignment packages with monthly calendar grid and advance rate analysis.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            RBS Tree &amp; Resource Gantt
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Resource Breakdown Structure hierarchy, labor vs non-labor allocations, budgeted units, and activity assignment spreadsheets.
          </p>
        </div>
      </div>

      {/* Security & Client-Side Processing Note */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
          <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong className="text-slate-800 dark:text-slate-200">100% Client-Side Privacy:</strong> Your schedule files are processed in-memory directly in your browser. No project data or proprietary schedules are ever uploaded to any external server.
          </span>
        </div>

        {onSelectSample && (
          <button
            onClick={() => onSelectSample(SAMPLE_PROJECTS[0])}
            className="whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors border border-amber-300 dark:border-amber-800 shrink-0"
          >
            Or load reference project &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
