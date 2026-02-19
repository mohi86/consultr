"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Building2,
  TrendingUp,
  Users,
  FileText,
  Scale,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  Link,
  X,
  Plus,
  Paperclip,
} from "lucide-react";
import { useAuthStore } from "@/app/stores/auth-store";
import type { ResearchType, ResearchMode } from "@/app/lib/research-types";

const MAX_FILES = 10;
const MAX_URLS = 10;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

interface UploadedFile {
  file: File;
  base64: string;
  mediaType: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Keep the full data URL (e.g., "data:application/pdf;base64,...")
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const subjectLabels: Record<ResearchType, string> = {
  mna: "Target Company",
  company: "Company Name",
  market: "Market / Segment",
  competitive: "Industry / Category",
  industry: "Industry",
  custom: "Research Topic",
};

interface ConsultingResearchFormProps {
  onTaskCreated: (taskId: string, title: string, researchType: string, mode?: ResearchMode) => void;
  isResearching: boolean;
}

const researchTypes = [
  {
    id: "mna" as ResearchType,
    label: "M&A Due Diligence",
    icon: Scale,
    placeholder: "e.g., Nvidia, UnitedHealth Group, Stripe",
    description: "Deep financial due diligence with SEC filings, financials, patents & insider data",
  },
  {
    id: "company" as ResearchType,
    label: "Company Due Diligence",
    icon: Building2,
    placeholder: "e.g., Stripe, Databricks, SpaceX",
    description: "Comprehensive analysis of a specific company",
  },
  {
    id: "market" as ResearchType,
    label: "Market Analysis",
    icon: TrendingUp,
    placeholder: "e.g., Electric Vehicle Market, Cloud Computing",
    description: "Market sizing, trends, and growth analysis",
  },
  {
    id: "competitive" as ResearchType,
    label: "Competitive Landscape",
    icon: Users,
    placeholder: "e.g., CRM Software, Food Delivery Apps",
    description: "Competitor mapping and positioning analysis",
  },
  {
    id: "industry" as ResearchType,
    label: "Industry Overview",
    icon: FileText,
    placeholder: "e.g., Fintech, Healthcare IT, Renewable Energy",
    description: "Industry dynamics, value chain, and key players",
  },
  {
    id: "custom" as ResearchType,
    label: "Custom Research",
    icon: Search,
    placeholder: "Describe your research topic...",
    description: "Any business research question or topic",
  },
];

const quickExamples = {
  mna: ["Nvidia", "UnitedHealth Group", "Stripe", "SpaceX"],
  company: ["Tesla", "OpenAI", "Airbnb", "Stripe"],
  market: ["AI/ML Market", "EV Charging", "Digital Payments", "EdTech"],
  competitive: ["Streaming Services", "Cloud Providers", "Ride-sharing", "BNPL"],
  industry: ["Fintech", "HealthTech", "CleanTech", "SaaS"],
  custom: [],
};

const researchModeDurations: Record<ResearchMode, string> = {
  fast: "5-10 minutes",
  standard: "10-20 minutes",
  heavy: "up to 90 minutes",
  max: "up to 180 minutes",
};

const MNA_DATA_CATEGORIES = [
  { id: "sec_filings", label: "SEC Filings (10-K, 10-Q, 8-K)" },
  { id: "financial_statements", label: "Financial Statements & Ratios" },
  { id: "insider_activity", label: "Insider Activity & Market Signals" },
  { id: "patents", label: "Patent & IP Portfolio" },
  { id: "market_intelligence", label: "Market & Competitive Intelligence" },
];

const DEPTH_OPTIONS: {
  id: ResearchMode;
  label: string;
  time: string;
  cost: string;
  highlight?: boolean;
}[] = [
  { id: "fast", label: "Fast", time: "~5 min", cost: "$0.10" },
  { id: "standard", label: "Standard", time: "10-20 min", cost: "$0.50" },
  { id: "heavy", label: "Heavy", time: "~90 min", cost: "$2.50" },
  { id: "max", label: "Max", time: "~180 min", cost: "$15", highlight: true },
];

export default function ConsultingResearchForm({
  onTaskCreated,
  isResearching,
}: ConsultingResearchFormProps) {
  const [researchType, setResearchType] = useState<ResearchType>("company");
  const [researchSubject, setResearchSubject] = useState("");
  const [researchFocus, setResearchFocus] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientContext, setClientContext] = useState("");
  const [specificQuestions, setSpecificQuestions] = useState("");
  const [researchMode, setResearchMode] = useState<ResearchMode>("fast");
  const [dataCategories, setDataCategories] = useState<string[]>([
    "sec_filings",
    "financial_statements",
    "insider_activity",
    "patents",
    "market_intelligence",
  ]);
  const [dealContext, setDealContext] = useState("");
  const [showCostConfirm, setShowCostConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source uploads
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  const user = useAuthStore((state) => state.user);
  const openSignInModal = useAuthStore((state) => state.openSignInModal);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const selectedType = researchTypes.find((t) => t.id === researchType)!;
  const selectedModeDuration = researchModeDurations[researchMode];
  const isValyuMode = APP_MODE !== "self-hosted";

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    setFileError(null);
    const files = Array.from(fileList);
    const remaining = MAX_FILES - uploadedFiles.length;

    if (remaining <= 0) {
      setFileError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setFileError(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added (max ${MAX_FILES})`);
    }

    const newFiles: UploadedFile[] = [];
    for (const file of toAdd) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not a supported file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }
      if (uploadedFiles.some((f) => f.file.name === file.name && f.file.size === file.size)) {
        continue; // skip duplicates
      }
      const base64 = await fileToDataUrl(file);
      newFiles.push({ file, base64, mediaType: file.type });
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  }, [uploadedFiles]);

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const addUrl = () => {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setUrlError("Please enter a valid URL (https://...)");
      return;
    }
    if (sourceUrls.length >= MAX_URLS) {
      setUrlError(`Maximum ${MAX_URLS} URLs allowed`);
      return;
    }
    if (sourceUrls.includes(trimmed)) {
      setUrlError("This URL has already been added");
      return;
    }
    setSourceUrls((prev) => [...prev, trimmed]);
    setUrlInput("");
  };

  const removeUrl = (index: number) => {
    setSourceUrls((prev) => prev.filter((_, i) => i !== index));
    setUrlError(null);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  };

  const sourcesCount = uploadedFiles.length + sourceUrls.length;

  // Restore form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("consultralph_pending_research");
    if (savedData && isAuthenticated) {
      try {
        const data = JSON.parse(savedData);
        setResearchType(data.researchType);
        setResearchSubject(data.researchSubject);
        setResearchFocus(data.researchFocus);
        setClientContext(data.clientContext);
        setSpecificQuestions(data.specificQuestions);
        if (data.researchMode === "fast" || data.researchMode === "standard" || data.researchMode === "heavy" || data.researchMode === "max") {
          setResearchMode(data.researchMode);
        }
        if (data.dataCategories) setDataCategories(data.dataCategories);
        if (data.dealContext) setDealContext(data.dealContext);
        if (data.sourceUrls?.length > 0) {
          setSourceUrls(data.sourceUrls);
          setShowSources(true);
        }
        // Clear the saved data after restoring
        localStorage.removeItem("consultralph_pending_research");
      } catch (e) {
        console.error("Failed to restore form data:", e);
      }
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!researchSubject.trim()) {
      setError("Please enter a research subject");
      return;
    }

    if (researchType === "mna" && dataCategories.length === 0) {
      setError("Please select at least one data category");
      return;
    }

    // Cost confirmation gate for max mode
    if (researchMode === "max" && !showCostConfirm) {
      setShowCostConfirm(true);
      return;
    }
    setShowCostConfirm(false);

    // If in Valyu mode and not authenticated, save form data and open sign-in modal
    if (isValyuMode && !isAuthenticated) {
      // Save form data to localStorage (files can't be saved, only text fields + URLs)
      const formData = {
        researchType,
        researchSubject: researchSubject.trim(),
        researchFocus: researchFocus.trim(),
        clientContext: clientContext.trim(),
        specificQuestions: specificQuestions.trim(),
        researchMode,
        ...(researchType === "mna" && {
          dataCategories,
          dealContext: dealContext.trim(),
        }),
        sourceUrls,
      };
      localStorage.setItem("consultralph_pending_research", JSON.stringify(formData));
      openSignInModal();
      return;
    }

    setIsSubmitting(true);

    try {
      // Build headers with optional auth token
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is authenticated
      const accessToken = getAccessToken();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // Build files payload for the API
      const filesPayload = uploadedFiles.length > 0
        ? uploadedFiles.map((f) => ({
            data: f.base64,
            filename: f.file.name,
            mediaType: f.mediaType,
          }))
        : undefined;

      const urlsPayload = sourceUrls.length > 0 ? sourceUrls : undefined;

      const response = await fetch("/api/consulting-research", {
        method: "POST",
        headers,
        body: JSON.stringify({
          researchType,
          researchSubject: researchSubject.trim(),
          researchFocus: researchFocus.trim(),
          clientContext: clientContext.trim(),
          specificQuestions: specificQuestions.trim(),
          researchMode,
          ...(researchType === "mna" && {
            dataCategories,
            dealContext: dealContext.trim(),
          }),
          files: filesPayload,
          urls: urlsPayload,
          alertEmail: user?.email,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to start research";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Response wasn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        // If 401, open sign-in modal
        if (response.status === 401) {
          openSignInModal();
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Clear any pending research data after successful submission
      localStorage.removeItem("consultralph_pending_research");

      onTaskCreated(data.deepresearch_id, researchSubject.trim(), researchType, researchMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (example: string) => {
    setResearchSubject(example);
    // Clear pending research when user starts selecting new examples
    localStorage.removeItem("consultralph_pending_research");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {/* Research Type Selection */}
      <div>
        <label className="block text-sm sm:text-base font-medium mb-3">Research Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {researchTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setResearchType(type.id);
                  setResearchSubject("");
                }}
                className={`p-3 sm:p-4 rounded-lg border text-left transition-all min-h-[60px] sm:min-h-[70px] active:scale-95 ${
                  researchType === type.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-surface"
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                <span className="text-xs sm:text-sm font-medium block truncate">
                  {type.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-2">{selectedType.description}</p>
      </div>

      {/* Research Subject Input */}
      <div>
        <label htmlFor="researchSubject" className="block text-sm sm:text-base font-medium mb-2">
          {subjectLabels[researchType]}
        </label>
        <input
          type="text"
          id="researchSubject"
          value={researchSubject}
          onChange={(e) => setResearchSubject(e.target.value)}
          placeholder={selectedType.placeholder}
          className="input-field text-base"
          required
          disabled={isSubmitting || isResearching}
        />

        {/* Quick Examples */}
        {quickExamples[researchType].length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-3">
            {quickExamples[researchType].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleQuickSelect(example)}
                className="px-3 py-1.5 text-xs sm:text-sm bg-surface hover:bg-surface-hover border border-border rounded-full transition-all active:scale-95 min-h-[32px]"
                disabled={isSubmitting || isResearching}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* M&A-specific fields */}
      {researchType === "mna" && (
        <>
          {/* Data Categories */}
          <div>
            <label className="block text-sm sm:text-base font-medium mb-3">
              Data Categories
            </label>
            <div className="space-y-2">
              {MNA_DATA_CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={dataCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDataCategories((prev) => [...prev, cat.id]);
                      } else {
                        setDataCategories((prev) =>
                          prev.filter((c) => c !== cat.id)
                        );
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    disabled={isSubmitting || isResearching}
                  />
                  <span className="text-sm sm:text-base">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Deal Context */}
          <div>
            <label htmlFor="dealContext" className="block text-sm sm:text-base font-medium mb-2">
              Deal Context{" "}
              <span className="text-text-muted font-normal">(Optional)</span>
            </label>
            <textarea
              id="dealContext"
              value={dealContext}
              onChange={(e) => setDealContext(e.target.value)}
              placeholder="e.g., 'Evaluating as acquisition target for $2B+ deal...'"
              className="input-field resize-none h-20 sm:h-24 text-base"
              disabled={isSubmitting || isResearching}
            />
          </div>
        </>
      )}

      {/* Research Focus */}
      <div>
        <label htmlFor="researchFocus" className="block text-sm sm:text-base font-medium mb-2">
          Research Focus{" "}
          <span className="text-text-muted font-normal">(Optional)</span>
        </label>
        <textarea
          id="researchFocus"
          value={researchFocus}
          onChange={(e) => setResearchFocus(e.target.value)}
          placeholder="Specify particular aspects to focus on, e.g., 'Focus on their AI capabilities and recent acquisitions' or 'Emphasize regulatory landscape and barriers to entry'"
          className="input-field resize-none h-20 sm:h-24 text-base"
          disabled={isSubmitting || isResearching}
        />
      </div>

      {/* Research Depth */}
      <div>
        <label className="block text-sm sm:text-base font-medium mb-3">
          Research Depth
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setResearchMode(opt.id);
                setShowCostConfirm(false);
              }}
              disabled={isSubmitting || isResearching}
              className={`p-3 sm:p-4 rounded-lg border text-left transition-all ${
                researchMode === opt.id
                  ? opt.highlight
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                    : "border-primary bg-primary/5 text-primary"
                  : opt.highlight
                  ? "border-border hover:border-primary/50 hover:bg-surface bg-surface/50"
                  : "border-border hover:border-primary/50 hover:bg-surface"
              }`}
            >
              <span className="text-sm sm:text-base font-semibold block">
                {opt.label}
              </span>
              <span className="text-xs text-text-muted block mt-1">
                {opt.time} &middot; {opt.cost}
              </span>
            </button>
          ))}
        </div>
        {researchMode === "max" && (
          <p className="text-xs sm:text-sm text-text-muted mt-2">
            Max mode runs an exhaustive multi-pass analysis with the deepest data coverage.
          </p>
        )}
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm sm:text-base text-text-muted hover:text-foreground transition-colors min-h-[44px] -ml-2 pl-2"
        >
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-3 sm:p-4 bg-surface rounded-lg border border-border">
            <div>
              <label
                htmlFor="clientContext"
                className="block text-sm sm:text-base font-medium mb-2"
              >
                Client Context
              </label>
              <textarea
                id="clientContext"
                value={clientContext}
                onChange={(e) => setClientContext(e.target.value)}
                placeholder="e.g., 'Client is a PE firm evaluating acquisition' or 'Fortune 500 company exploring market entry'"
                className="input-field resize-none h-16 sm:h-20 text-base"
                disabled={isSubmitting || isResearching}
              />
            </div>

            <div>
              <label
                htmlFor="specificQuestions"
                className="block text-sm sm:text-base font-medium mb-2"
              >
                Specific Questions to Answer
              </label>
              <textarea
                id="specificQuestions"
                value={specificQuestions}
                onChange={(e) => setSpecificQuestions(e.target.value)}
                placeholder="List specific questions you need answered, one per line..."
                className="input-field resize-none h-20 sm:h-24 text-base"
                disabled={isSubmitting || isResearching}
              />
            </div>

          </div>
        )}
      </div>

      {/* Additional Sources */}
      <div>
        <button
          type="button"
          onClick={() => setShowSources(!showSources)}
          className="flex items-center gap-2 text-sm sm:text-base text-text-muted hover:text-foreground transition-colors min-h-[44px] -ml-2 pl-2"
        >
          {showSources ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <Paperclip size={16} />
          Additional Sources
          {sourcesCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {sourcesCount}
            </span>
          )}
        </button>

        {showSources && (
          <div className="mt-4 space-y-5 p-3 sm:p-4 bg-surface rounded-lg border border-border">
            {/* File Upload */}
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Upload Documents{" "}
                <span className="text-text-muted font-normal">
                  ({uploadedFiles.length}/{MAX_FILES})
                </span>
              </label>
              <p className="text-xs text-text-muted mb-3">
                PDFs, images, Word, Excel, PowerPoint, or text files. Max {MAX_FILE_SIZE_MB}MB each.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-surface-hover"
                } ${uploadedFiles.length >= MAX_FILES ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-text-muted" />
                <p className="text-sm text-text-muted">
                  {uploadedFiles.length >= MAX_FILES
                    ? "Maximum files reached"
                    : "Drop files here or click to browse"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  disabled={isSubmitting || isResearching || uploadedFiles.length >= MAX_FILES}
                  onChange={(e) => {
                    if (e.target.files) {
                      processFiles(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* File error */}
              {fileError && (
                <p className="text-xs text-error mt-2">{fileError}</p>
              )}

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={`${f.file.name}-${i}`}
                      className="flex items-center gap-3 p-2 bg-background rounded border border-border text-sm"
                    >
                      <FileText className="w-4 h-4 text-text-muted shrink-0" />
                      <span className="truncate flex-1">{f.file.name}</span>
                      <span className="text-xs text-text-muted shrink-0">
                        {formatFileSize(f.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 hover:bg-surface-hover rounded transition-colors shrink-0"
                        disabled={isSubmitting || isResearching}
                      >
                        <X className="w-3.5 h-3.5 text-text-muted hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* URL Input */}
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Add URLs{" "}
                <span className="text-text-muted font-normal">
                  ({sourceUrls.length}/{MAX_URLS})
                </span>
              </label>
              <p className="text-xs text-text-muted mb-3">
                Web pages to extract content from and include in the research.
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="https://example.com/report"
                  className="input-field text-sm flex-1"
                  disabled={isSubmitting || isResearching || sourceUrls.length >= MAX_URLS}
                />
                <button
                  type="button"
                  onClick={addUrl}
                  disabled={isSubmitting || isResearching || sourceUrls.length >= MAX_URLS || !urlInput.trim()}
                  className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* URL error */}
              {urlError && (
                <p className="text-xs text-error mt-2">{urlError}</p>
              )}

              {/* URL list */}
              {sourceUrls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sourceUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="flex items-center gap-3 p-2 bg-background rounded border border-border text-sm"
                    >
                      <Link className="w-4 h-4 text-text-muted shrink-0" />
                      <span className="truncate flex-1 text-primary">{url}</span>
                      <button
                        type="button"
                        onClick={() => removeUrl(i)}
                        className="p-1 hover:bg-surface-hover rounded transition-colors shrink-0"
                        disabled={isSubmitting || isResearching}
                      >
                        <X className="w-3.5 h-3.5 text-text-muted hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm sm:text-base">
          {error}
        </div>
      )}

      {/* Cost Confirmation for Max Mode */}
      {showCostConfirm && researchMode === "max" && (
        <div className="p-4 bg-surface border border-primary/30 rounded-lg space-y-3">
          <p className="text-sm sm:text-base font-medium">
            Max mode will cost approximately <strong>$15</strong> and take up to 180 minutes. Are you sure?
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm sm:text-base min-h-[40px]"
              disabled={isSubmitting || isResearching}
            >
              Confirm &amp; Start
            </button>
            <button
              type="button"
              onClick={() => setShowCostConfirm(false)}
              className="px-4 py-2 text-sm sm:text-base border border-border rounded-lg hover:bg-surface-hover transition-colors min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isResearching || !researchSubject.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[52px] text-base sm:text-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            <span>Starting Research...</span>
          </>
        ) : (
          <>
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Start Deep Research</span>
          </>
        )}
      </button>

      {/* Info Text */}
      <p className="text-xs sm:text-sm text-text-muted text-center px-2">
        Takes <strong>{selectedModeDuration}</strong>. You&apos;ll receive PowerPoint slides, Excel spreadsheet, Word document, and PDF report.{" "}
        <strong>Run multiple research projects at once.</strong>
      </p>
    </form>
  );
}
