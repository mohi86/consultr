"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import ConsultingResearchForm from "./components/ConsultingResearchForm";
import ResearchResults from "./components/ResearchResults";
import Sidebar from "./components/Sidebar";
import GitHubCorner from "./components/GitHubCorner";
import { SignInPanel } from "./components/auth";
import { Briefcase, X, Menu } from "lucide-react";
import {
  saveToHistory,
  updateHistoryStatus,
  ResearchHistoryItem,
} from "./lib/researchHistory";
import { useAuthStore } from "./stores/auth-store";

interface ResearchResult {
  status: string;
  task_id: string;
  output?: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  usage?: {
    search_units: number;
    ai_units: number;
    compute_units: number;
    total_cost: number;
  };
  pdf_url?: string;
  deliverables?: Array<{
    type: string;
    title: string;
    url: string;
  }>;
  progress?: {
    current_step: number;
    total_steps: number;
  };
  error?: string;
}

export default function Home() {
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(
    null
  );
  const [isResearching, setIsResearching] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentResearchTitle, setCurrentResearchTitle] = useState<string>("");
  const [showDiscordBanner, setShowDiscordBanner] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (taskId: string) => {
      if (cancelledRef.current) {
        clearPolling();
        return;
      }

      try {
        const accessToken = getAccessToken();
        const statusUrl = accessToken
          ? `/api/consulting-research/status?taskId=${taskId}&accessToken=${encodeURIComponent(accessToken)}`
          : `/api/consulting-research/status?taskId=${taskId}`;
        const response = await fetch(statusUrl);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch status");
        }

        const data = await response.json();
        setResearchResult(data);

        // Update history status
        if (data.status) {
          updateHistoryStatus(taskId, data.status);
        }

        if (
          data.status === "completed" ||
          data.status === "failed" ||
          data.status === "cancelled"
        ) {
          clearPolling();
          if (data.status !== "completed") {
            setIsResearching(false);
          }
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    },
    [clearPolling, getAccessToken]
  );

  const handleTaskCreated = useCallback(
    (taskId: string, title: string, researchType: string) => {
      setCurrentTaskId(taskId);
      setCurrentResearchTitle(title);
      setIsResearching(true);
      cancelledRef.current = false;
      setResearchResult({
        status: "queued",
        task_id: taskId,
      });

      // Save to history
      saveToHistory({
        id: taskId,
        title: title,
        researchType: researchType,
        status: "queued",
      });

      // Start polling immediately
      pollStatus(taskId);

      // Then poll every 10 seconds
      pollIntervalRef.current = setInterval(() => {
        pollStatus(taskId);
      }, 10000);
    },
    [pollStatus]
  );

  const handleSelectHistory = useCallback(
    (item: ResearchHistoryItem) => {
      // Clear any existing polling
      clearPolling();
      cancelledRef.current = false;

      setCurrentTaskId(item.id);
      setCurrentResearchTitle(item.title);
      setResearchResult({
        status: item.status || "queued",
        task_id: item.id,
      });

      // Check if research is still in progress
      const isInProgress =
        item.status === "queued" || item.status === "processing";
      setIsResearching(isInProgress);

      // Fetch latest status from Valyu
      pollStatus(item.id);

      // If still in progress, start polling
      if (isInProgress) {
        pollIntervalRef.current = setInterval(() => {
          pollStatus(item.id);
        }, 10000);
      }
    },
    [clearPolling, pollStatus]
  );

  const handleNewResearch = useCallback(() => {
    clearPolling();
    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
    setCurrentResearchTitle("");
    cancelledRef.current = false;
  }, [clearPolling]);

  const handleCancel = async () => {
    if (!currentTaskId) return;

    cancelledRef.current = true;
    clearPolling();

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

      await fetch("/api/consulting-research/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({ taskId: currentTaskId }),
      });

      // Update history status
      updateHistoryStatus(currentTaskId, "cancelled");
    } catch (error) {
      console.error("Error cancelling research:", error);
    }

    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
  };

  const handleReset = () => {
    clearPolling();
    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
    setCurrentResearchTitle("");
    cancelledRef.current = false;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Left/Right arrow keys to collapse/expand sidebar (desktop only)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsSidebarCollapsed(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsSidebarCollapsed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const showResults = isResearching || researchResult;

  return (
    <div className="min-h-screen bg-background">
      <GitHubCorner />
      <SignInPanel sidebarCollapsed={isSidebarCollapsed} />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="fixed top-4 left-4 z-30 md:hidden p-3 bg-surface border border-border rounded-lg shadow-lg hover:bg-surface-hover transition-all active:scale-95"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Discord Toast */}
      {showDiscordBanner && (
        <div className={`fixed top-4 left-20 z-20 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-xs animate-in slide-in-from-left transition-all duration-300 ${
          isSidebarCollapsed ? 'md:left-20' : 'md:left-80'
        }`}>
          <a
            href="https://discord.gg/8TCbHsSe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:text-primary transition-colors"
          >
            🎮 Join our Discord community
          </a>
          <button
            onClick={() => setShowDiscordBanner(false)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          onSelectHistory={handleSelectHistory}
          onNewResearch={handleNewResearch}
          currentResearchId={currentTaskId}
          isCollapsed={isSidebarCollapsed}
          onCollapsedChange={setIsSidebarCollapsed}
          mobileOpen={isMobileSidebarOpen}
          onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {!showResults ? (
            // Homepage layout
            <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8 max-w-3xl">
                <div className="flex flex-col-reverse md:flex-row items-center md:items-end justify-center gap-2 sm:gap-3 mb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold md:mb-4">
                    <span className="text-foreground">Consult Ralph</span>
                  </h1>
                  <div className="relative group">
                    {/* Picture frame */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 dark:from-amber-900/30 dark:via-amber-800/20 dark:to-amber-900/30 rounded-xl shadow-2xl border-4 border-amber-200 dark:border-amber-800/50 -m-2 sm:-m-3"></div>
                    {/* Inner shadow for depth */}
                    <div className="absolute inset-0 rounded-xl shadow-inner -m-2 sm:-m-3 pointer-events-none"></div>
                    {/* Content */}
                    <div className="relative">
                      {isVideoPlaying ? (
                        <video
                          src="/ralph.mp4"
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 object-contain cursor-pointer relative z-10"
                          onClick={() => setIsVideoPlaying(false)}
                        />
                      ) : (
                        <Image
                          src="/consultralph.png"
                          alt="Consult Ralph"
                          width={160}
                          height={160}
                          className="w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 object-contain cursor-pointer group-hover:scale-105 transition-transform relative z-10"
                          priority
                          onClick={() => setIsVideoPlaying(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto px-2">
                  AI-powered deep research for consultants. Generate
                  comprehensive due diligence reports, market analyses,
                  competitive landscapes, and strategic insights in minutes.
                </p>
              </div>

              {/* Research Form */}
              <div className="w-full max-w-2xl px-2">
                <ConsultingResearchForm
                  onTaskCreated={handleTaskCreated}
                  isResearching={isResearching}
                />
              </div>

              {/* Features */}
              <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl w-full px-2">
                <div className="card text-center">
                  <div className="text-3xl sm:text-4xl mb-2">📊</div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Due Diligence</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    Comprehensive company research with financials, risks, and
                    competitive positioning
                  </p>
                </div>
                <div className="card text-center">
                  <div className="text-3xl sm:text-4xl mb-2">🎯</div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Market Analysis</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    TAM/SAM/SOM sizing, industry trends, growth drivers, and key
                    players
                  </p>
                </div>
                <div className="card text-center sm:col-span-2 md:col-span-1">
                  <div className="text-3xl sm:text-4xl mb-2">⚔️</div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Competitive Intel</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    Competitor mapping, SWOT analysis, and strategic positioning
                  </p>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-text-muted px-2">
                <p>
                  Powered by{" "}
                  <a
                    href="https://valyu.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Valyu Deep Research API
                  </a>
                </p>
              </footer>
            </div>
          ) : (
            // Results layout
            <div className="p-4 sm:p-6 md:p-8">
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold">
                      <span className="gradient-text">Consulting Research</span>
                    </h1>
                    {currentResearchTitle && (
                      <p className="text-xs sm:text-sm text-text-muted">
                        {currentResearchTitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Results */}
              <ResearchResults
                result={researchResult}
                onCancel={handleCancel}
                onReset={handleReset}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
