"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ConsultingResearchForm from "./components/ConsultingResearchForm";
import ResearchResults from "./components/ResearchResults";
import Sidebar from "./components/Sidebar";
import { SignInModal } from "./components/auth";
import { Building2, TrendingUp, Users, FileText, X } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { ResearchHistoryItem, saveToHistory, updateHistoryStatus } from "./lib/researchHistory";
import { useAuthStore } from "./stores/auth-store";
import type { ResearchMode } from "./lib/research-types";
import { requestNotificationPermission, sendCompletionNotification } from "./lib/notifications";

interface ResearchResult {
  status: string;
  task_id: string;
  output?: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
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
  messages?: Array<{
    role: string;
    content: string | Array<Record<string, unknown>>;
  }>;
  error?: string;
  researchType?: string;
  researchMode?: string;
}

// Helper to update URL search params without triggering navigation
function setResearchParam(taskId: string | null) {
  const url = new URL(window.location.href);
  if (taskId) {
    url.searchParams.set("research", taskId);
  } else {
    url.searchParams.delete("research");
  }
  window.history.pushState(null, "", url.toString());
}

function getPollingInterval(mode?: ResearchMode): number {
  switch (mode) {
    case "max": return 30000;
    case "heavy": return 15000;
    case "standard": return 10000;
    default: return 5000;
  }
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialResearchId = searchParams.get("research");

  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentResearchTitle, setCurrentResearchTitle] = useState<string>("");
  const [showDiscordBanner, setShowDiscordBanner] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTaskRef = useRef<string | null>(null);
  const initialLoadRef = useRef(false);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const showSignInModal = useAuthStore((state) => state.showSignInModal);
  const openSignInModal = useAuthStore((state) => state.openSignInModal);
  const closeSignInModal = useAuthStore((state) => state.closeSignInModal);

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

        // Ignore result if this task is no longer active
        if (activeTaskRef.current !== taskId) return;

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch status");
        }

        const data = await response.json();
        setResearchResult((prev) => ({
          ...prev,
          ...data,
          // Preserve client-side fields that the API doesn't return
          researchType: prev?.researchType,
          researchMode: prev?.researchMode,
        }));

        // Set title from output if we don't have one (URL-loaded research)
        if (!currentResearchTitle && data.output) {
          // Extract first line or first 60 chars as title
          const firstLine = data.output.split("\n").find((l: string) => l.trim());
          if (firstLine) {
            setCurrentResearchTitle(firstLine.replace(/^#+\s*/, "").slice(0, 60));
          }
        }

        if (
          data.status === "completed" ||
          data.status === "failed" ||
          data.status === "cancelled"
        ) {
          if (data.status === "completed") {
            sendCompletionNotification(currentResearchTitle || "Your research");
          }
          clearPolling();
          setIsResearching(false);
          updateHistoryStatus(taskId, data.status);
        }
      } catch (error) {
        console.error("Error polling research status:", error);
      }
    },
    [clearPolling, getAccessToken, currentResearchTitle]
  );

  const handleTaskCreated = useCallback(
    (taskId: string, title: string, researchType: string, mode?: ResearchMode) => {
      clearPolling();
      activeTaskRef.current = taskId;
      setCurrentTaskId(taskId);
      setCurrentResearchTitle(title);
      setIsResearching(true);
      cancelledRef.current = false;
      setResearchResult({
        status: "queued",
        task_id: taskId,
        researchType,
        researchMode: mode,
      });

      // Request notification permission when user starts research
      requestNotificationPermission();

      // Update URL with research ID
      setResearchParam(taskId);

      saveToHistory({
        id: taskId,
        title,
        researchType: researchType,
        status: "queued",
      });

      pollStatus(taskId);

      const interval = getPollingInterval(mode);
      pollIntervalRef.current = setInterval(() => {
        pollStatus(taskId);
      }, interval);
    },
    [clearPolling, pollStatus]
  );

  const pollPublicStatus = useCallback(
    async (taskId: string) => {
      try {
        const response = await fetch(`/api/consulting-research/public-status?taskId=${taskId}`);

        // Ignore result if this task is no longer active
        if (activeTaskRef.current !== taskId) return;

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch public report");
        }
        const data = await response.json();
        setResearchResult(data);

        if (!currentResearchTitle && data.output) {
          const firstLine = data.output.split("\n").find((l: string) => l.trim());
          if (firstLine) {
            setCurrentResearchTitle(firstLine.replace(/^#+\s*/, "").slice(0, 60));
          }
        }

        if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
          clearPolling();
          setIsResearching(false);
        }
      } catch (error) {
        console.error("Error fetching public report:", error);
      }
    },
    [currentResearchTitle, clearPolling]
  );

  // Load research from URL param on initial mount
  useEffect(() => {
    if (initialLoadRef.current || !initialResearchId) return;
    initialLoadRef.current = true;

    activeTaskRef.current = initialResearchId;
    setCurrentTaskId(initialResearchId);
    setResearchResult({
      status: "queued",
      task_id: initialResearchId,
    });

    // For shared links, try public access first — avoids session-expired errors
    // when the viewer has a stale token or isn't the report owner.
    const loadFromUrl = async () => {
      try {
        const res = await fetch(`/api/consulting-research/public-status?taskId=${initialResearchId}`);
        if (res.ok && activeTaskRef.current === initialResearchId) {
          const data = await res.json();
          setResearchResult(data);
          if (data.output) {
            const firstLine = data.output.split("\n").find((l: string) => l.trim());
            if (firstLine) {
              setCurrentResearchTitle(firstLine.replace(/^#+\s*/, "").slice(0, 60));
            }
          }
          const isRunning = data.status === "queued" || data.status === "running";
          setIsResearching(isRunning);
          if (isRunning) {
            pollIntervalRef.current = setInterval(() => pollPublicStatus(initialResearchId), 10000);
          }
          return; // public access succeeded
        }
      } catch { /* public access failed — fall through */ }

      // Fall back to authenticated polling (report is private or public endpoint errored)
      const accessToken = getAccessToken();
      if (accessToken) {
        pollStatus(initialResearchId);
        pollIntervalRef.current = setInterval(() => pollStatus(initialResearchId), 10000);
      }
    };

    loadFromUrl();
  }, [initialResearchId, pollStatus, pollPublicStatus, getAccessToken]);

  const handleSelectExample = useCallback(
    (taskId: string, title: string) => {
      clearPolling();
      activeTaskRef.current = taskId;
      cancelledRef.current = false;

      setCurrentTaskId(taskId);
      setCurrentResearchTitle(title);
      setResearchResult({
        status: "queued",
        task_id: taskId,
      });

      setResearchParam(taskId);

      // Fetch immediately, then poll if still running
      pollPublicStatus(taskId).then(() => {
        // Check if still running after initial fetch
        setResearchResult((prev) => {
          const isStillRunning = prev?.status === "queued" || prev?.status === "running";
          setIsResearching(isStillRunning);
          if (isStillRunning) {
            pollIntervalRef.current = setInterval(() => {
              pollPublicStatus(taskId);
            }, 10000);
          }
          return prev;
        });
      });
    },
    [clearPolling, pollPublicStatus]
  );


  const handleSelectHistory = useCallback(
    (item: ResearchHistoryItem) => {
      clearPolling();
      activeTaskRef.current = item.id;
      cancelledRef.current = false;

      setCurrentTaskId(item.id);
      setCurrentResearchTitle(item.title);
      setResearchResult({
        status: item.status || "queued",
        task_id: item.id,
      });

      // Update URL with research ID
      setResearchParam(item.id);

      const isInProgress =
        item.status === "queued" || item.status === "processing";
      setIsResearching(isInProgress);

      pollStatus(item.id);

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
    activeTaskRef.current = null;
    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
    setCurrentResearchTitle("");
    cancelledRef.current = false;
    setResearchParam(null);
  }, [clearPolling]);

  const handleCancel = async () => {
    if (!currentTaskId) return;

    cancelledRef.current = true;
    activeTaskRef.current = null;
    clearPolling();

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      const accessToken = getAccessToken();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      await fetch("/api/consulting-research/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({ taskId: currentTaskId }),
      });
    } catch (error) {
      console.error("Error cancelling research:", error);
    }

    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
    setResearchParam(null);
  };

  const handleReset = () => {
    clearPolling();
    activeTaskRef.current = null;
    setIsResearching(false);
    setResearchResult(null);
    setCurrentTaskId(null);
    setCurrentResearchTitle("");
    cancelledRef.current = false;
    setResearchParam(null);
  };

  const handleFollowUp = useCallback(
    async (taskId: string, question: string) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      const accessToken = getAccessToken();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/consulting-research/follow-up", {
        method: "POST",
        headers,
        body: JSON.stringify({ taskId, instruction: question, alertEmail: user?.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send follow-up");
      }

      const data = await response.json();
      const newTaskId = data.deepresearch_id;

      // New task created — switch to tracking it
      const followUpTitle = `Follow-up: ${question.slice(0, 50)}`;
      clearPolling();
      activeTaskRef.current = newTaskId;
      setCurrentTaskId(newTaskId);
      setCurrentResearchTitle(followUpTitle);
      setIsResearching(true);
      cancelledRef.current = false;
      setResearchResult({
        status: "queued",
        task_id: newTaskId,
      });

      setResearchParam(newTaskId);

      saveToHistory({
        id: newTaskId,
        title: followUpTitle,
        researchType: "custom",
        status: "queued",
      });

      pollStatus(newTaskId);
      pollIntervalRef.current = setInterval(() => {
        pollStatus(newTaskId);
      }, 10000);
    },
    [getAccessToken, clearPolling, pollStatus]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

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

  // Check if first visit + discord banner
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("consultralph_intro_seen");
    if (!hasSeenIntro && !initialResearchId) {
      setShowIntro(true);
    }
    if (!localStorage.getItem("consultralph_discord_dismissed")) {
      setShowDiscordBanner(true);
    }
  }, []);

  const handleIntroEnd = () => {
    localStorage.setItem("consultralph_intro_seen", "true");
    setShowIntro(false);
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const showResults = isResearching || researchResult;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="fixed top-4 left-4 z-30 md:hidden p-2 bg-surface border border-border rounded-lg shadow-lg hover:bg-surface-hover transition-all active:scale-95"
        aria-label="Toggle menu"
      >
        <Image
          src="/icon.png"
          alt="Menu"
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
        />
      </button>

      {/* Discord Toast */}
      {showDiscordBanner && (
        <div className={`fixed top-4 left-20 z-20 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-xs animate-in slide-in-from-left transition-all duration-300 ${
          isSidebarCollapsed ? 'md:left-20' : 'md:left-80'
        }`}>
          <a
            href="https://discord.gg/cY4RhVcwZU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:text-primary transition-colors"
          >
            <svg className="inline-block w-4 h-4 mr-1 -mt-0.5 text-[#5865F2] dark:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Join our Discord community
          </a>
          <button
            onClick={() => { localStorage.setItem("consultralph_discord_dismissed", "true"); setShowDiscordBanner(false); }}
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
        <main className="flex-1 min-h-screen relative">
          {/* Dotted Glow Background */}
          <DottedGlowBackground
            className="pointer-events-none"
            opacity={0.15}
            gap={16}
            radius={1.5}
            colorLightVar="--color-neutral-300"
            glowColorLightVar="--color-neutral-400"
            colorDarkVar="--color-neutral-700"
            glowColorDarkVar="--color-neutral-600"
            backgroundOpacity={0}
            speedMin={0.15}
            speedMax={0.6}
            speedScale={0.6}
          />

          {!showResults ? (
            // Homepage layout
            <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8 max-w-3xl">
                <div className="flex flex-col-reverse md:flex-row items-center md:items-end justify-center gap-2 sm:gap-3 mb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold md:mb-4">
                    <span className="text-foreground">ConsultR</span>
                  </h1>
                  <div className="relative group cursor-pointer" onClick={() => !isVideoPlaying && setIsVideoPlaying(true)}>
                    <div className="relative">
                      <Image
                          src="/icon.png"
                          alt="ConsultR"
                          width={80}
                          height={80}
                          className="object-contain transition-transform"
                          priority
                        />
                    </div>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto px-2 leading-relaxed">
                  AI-powered deep research for consultants.
                  <br className="hidden sm:block" />
                  Generate comprehensive reports with PowerPoint decks, Excel spreadsheets, and Word documents.
                  <br className="hidden sm:block" />
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
              <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl w-full px-2">
                <div className="card text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Due Diligence</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    Comprehensive company research with financials, risks, and
                    competitive positioning
                  </p>
                </div>
                <div className="card text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Market Analysis</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    TAM/SAM/SOM sizing, industry trends, growth drivers, and key
                    players
                  </p>
                </div>
                <div className="card text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Competitive Intel</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    Competitor mapping, SWOT analysis, and strategic positioning
                  </p>
                </div>
                <div className="card text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Client-Ready Deliverables</h3>
                  <p className="text-xs sm:text-sm text-text-muted">
                    PowerPoint decks, Excel spreadsheets, Word docs, and PDF reports
                  </p>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-text-muted px-2">
                <p>
                  Deep research for Verra Mobility, powered by AI. Built by Mohi K.
                </p>
              </footer>
            </div>
          ) : (
            // Results layout
            <div className="p-4 sm:p-6 md:p-8">
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                    <Image
                      src="/icon.png"
                      alt="Ralph"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold">
                      <span className="gradient-text">ConsultR</span>
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
                onFollowUp={isAuthenticated ? handleFollowUp : undefined}
                currentTaskId={currentTaskId}
              />
            </div>
          )}
        </main>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        open={showSignInModal}
        onOpenChange={(open) => open ? openSignInModal() : closeSignInModal()}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams (Next.js 15 requirement)
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

