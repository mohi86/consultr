"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle,
  XCircle,
  FileText,
  FileSpreadsheet,
  Presentation,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Globe,
  BookOpen,
} from "lucide-react";
import ResearchActivityFeed from "./ResearchActivityFeed";

interface ResearchResultsProps {
  result: {
    status: string;
    task_id: string;
    output?: string;
    sources?: Array<{ title: string; url: string }>;
    pdf_url?: string;
    deliverables?: Array<{ type: string; title: string; url: string }>;
    progress?: { current_step: number; total_steps: number };
    messages?: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
    error?: string;
  } | null;
  onCancel: () => void;
  onReset: () => void;
}

function getDeliverableIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pptx":
    case "powerpoint":
      return Presentation;
    case "xlsx":
    case "excel":
      return FileSpreadsheet;
    case "docx":
    case "word":
    case "pdf":
      return FileText;
    default:
      return Download;
  }
}

function getDeliverableColor(type: string) {
  switch (type.toLowerCase()) {
    case "pptx":
    case "powerpoint":
      return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "xlsx":
    case "excel":
      return "text-green-500 bg-green-500/10 border-green-500/20";
    case "docx":
    case "word":
      return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    case "pdf":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    default:
      return "text-text-muted bg-surface border-border";
  }
}

export default function ResearchResults({ result, onCancel, onReset }: ResearchResultsProps) {
  const [showReport, setShowReport] = useState(false);
  const [showSources, setShowSources] = useState(false);

  if (!result) return null;

  const isComplete = result.status === "completed";
  const isInProgress = result.status === "queued" || result.status === "running";
  const isFailed = result.status === "failed" || result.status === "cancelled";

  const progressPercent = result.progress
    ? Math.round((result.progress.current_step / result.progress.total_steps) * 100)
    : isComplete
      ? 100
      : 0;

  return (
    <div className="space-y-4 min-w-0">
      {/* Progress bar */}
      {(isInProgress || isComplete) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {isInProgress && (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-text-muted">
                    {result.progress
                      ? `Step ${result.progress.current_step} of ${result.progress.total_steps}`
                      : "Starting research..."}
                  </span>
                </>
              )}
              {isComplete && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 font-medium">Research Complete</span>
                </>
              )}
            </div>
            <span className="text-xs text-text-muted">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-border/40">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isComplete ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Activity feed - shows during running AND completed */}
      {result.messages && result.messages.length > 0 && (
        <ResearchActivityFeed
          messages={result.messages}
          isRunning={isInProgress}
        />
      )}

      {/* Cancel button during running */}
      {isInProgress && (
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
        >
          Cancel Research
        </button>
      )}

      {/* Completed results */}
      {isComplete && (
        <div className="space-y-4">
          {/* Deliverables */}
          {result.deliverables && result.deliverables.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Download className="w-4 h-4" />
                Deliverables
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.deliverables.map((d, i) => {
                  const Icon = getDeliverableIcon(d.type);
                  const colorClass = getDeliverableColor(d.type);
                  return (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${colorClass}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.title}</p>
                        <p className="text-xs opacity-70 uppercase">{d.type}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* PDF download */}
          {result.pdf_url && (
            <a
              href={result.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Download PDF Report
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div>
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>{result.sources.length} Sources</span>
                {showSources ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showSources && (
                <div className="mt-2 space-y-1.5">
                  {result.sources.map((source, i) => {
                    let domain = "";
                    try {
                      domain = new URL(source.url).hostname.replace("www.", "");
                    } catch {
                      domain = source.url;
                    }
                    return (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface hover:bg-surface-hover border border-border/60 hover:border-primary/40 group transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                          alt=""
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="text-sm text-text-muted group-hover:text-primary transition-colors truncate flex-1">
                          {source.title || domain}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-primary" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Full report toggle - LAZY RENDERED to avoid 65KB markdown crash */}
          {result.output && (
            <div>
              <button
                onClick={() => setShowReport(!showReport)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Full Report</span>
                {showReport ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showReport && (
                <div className="mt-3 p-4 sm:p-6 rounded-lg border border-border bg-surface">
                  <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-text-muted prose-a:text-primary prose-strong:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.output}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New Research
            </button>
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium text-red-500">Research Failed</h3>
          </div>
          <p className="text-sm text-text-muted">{result.error || "An unknown error occurred"}</p>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
