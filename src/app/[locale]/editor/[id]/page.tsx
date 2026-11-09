'use client';

import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useEditor } from '@/hooks/use-editor';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { useIsMobile } from '@/hooks/use-media-query';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { EditorSidebar } from '@/components/editor/editor-sidebar';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { ThemeEditor } from '@/components/editor/theme-editor';
import { EditorPreviewPanel } from '@/components/editor/editor-preview-panel';
import { EditorMobileTabBar } from '@/components/editor/editor-mobile-tab-bar';
import { AIChatBubble } from '@/components/ai/ai-chat-bubble';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { List } from "lucide-react";
import { SettingsDialog } from '@/components/settings/settings-dialog';
// Dialogs are opened rarely and drag in most of the Radix surface. Load each
// one the first time its modal opens instead of shipping them all up front.
const JdAnalysisDialog = dynamic(() => import('@/components/editor/jd-analysis-dialog').then((m) => m.JdAnalysisDialog), { ssr: false });
const TranslateDialog = dynamic(() => import('@/components/editor/translate-dialog').then((m) => m.TranslateDialog), { ssr: false });
const ExportDialog = dynamic(() => import('@/components/editor/export-dialog').then((m) => m.ExportDialog), { ssr: false });
const ImportDialog = dynamic(() => import('@/components/editor/import-dialog').then((m) => m.ImportDialog), { ssr: false });
const ShareDialog = dynamic(() => import('@/components/editor/share-dialog').then((m) => m.ShareDialog), { ssr: false });
const CoverLetterDialog = dynamic(() => import('@/components/editor/cover-letter-dialog').then((m) => m.CoverLetterDialog), { ssr: false });
const GrammarCheckDialog = dynamic(() => import('@/components/editor/grammar-check-dialog').then((m) => m.GrammarCheckDialog), { ssr: false });
import { TourOverlay, type TourStepConfig } from '@/components/tour/tour-overlay';
import { useEditorStore } from '@/stores/editor-store';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTourStore, hasCompletedTour } from '@/stores/tour-store';
import { takePendingOptimizeMessage } from '@/lib/pending-optimize';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const EDITOR_TOUR_STEPS: TourStepConfig[] = [
  { target: 'sidebar', placement: 'right', i18nKey: 'sidebar' },
  { target: 'preview', placement: 'left', i18nKey: 'preview' },
  { target: 'ai-chat', placement: 'top', i18nKey: 'aiChat' },
  { target: 'export', placement: 'bottom', i18nKey: 'export' },
  { target: 'theme', placement: 'bottom', i18nKey: 'theme' },
];

/** Render children on first activation, then keep them mounted so closing a
 * dialog still animates instead of unmounting it instantly. */
function LazyMount({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active) setMounted(true);
  }, [active]);
  return mounted ? <>{children}</> : null;
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: fpLoading } = useFingerprint();
  const { resume, sections, updateSection, addSection, removeSection, reorderSections } = useEditor(id);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showThemeEditor, mobileActiveTab, setPendingAiMessage, setShowAiChat } = useEditorStore();
  const { activeModal, openModal, closeModal } = useUIStore();
  const { hydrate, _hydrated } = useSettingsStore();
  const startTour = useTourStore((s) => s.startTour);

  useEffect(() => {
    if (!_hydrated) hydrate();
  }, [_hydrated, hydrate]);

  // Catch unhandled promise rejections (e.g. "Failed to find Server Action")
  // to prevent page crash — show toast instead
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason || '');
      if (msg.includes('Server Action') || msg.includes('AI_RetryError') || msg.includes('AI_APICallError')) {
        e.preventDefault();
        toast.error('操作失败', {
          description: msg.includes('Server Action')
            ? '页面版本已更新，请刷新页面重试'
            : 'AI 服务暂时不可用，请稍后重试',
        });
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  useEffect(() => {
    if (!resume) return;
    if (hasCompletedTour('editor')) return;
    if (window.innerWidth < 768) return;
    const timer = setTimeout(() => startTour('editor', EDITOR_TOUR_STEPS.length), 1000);
    return () => clearTimeout(timer);
  }, [resume, startTour]);

  // Consume a copy-optimize message handed off via pending-optimize.ts (gated
  // on resume.id === id so it runs after useEditor's cleanup for the old id).
  useEffect(() => {
    if (!resume || resume.id !== id) return;
    const message = takePendingOptimizeMessage(id);
    if (message) {
      setPendingAiMessage(message);
      setShowAiChat(true);
    }
  }, [resume, id, setPendingAiMessage, setShowAiChat]);

  if (fpLoading || !resume) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <EditorToolbar />
      <EditorMobileTabBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: hidden on mobile, shown on desktop */}
        <div className="hidden md:block">
          <EditorSidebar
            sections={sections}
            onAddSection={addSection}
            onReorderSections={reorderSections}
          />
        </div>

        {/* Canvas: always mounted, hidden on mobile when preview tab active */}
        <div className={cn(
          "min-w-0 flex-1 overflow-hidden md:flex-[4]",
          isMobile && mobileActiveTab !== "edit" && "hidden"
        )}>
          <EditorCanvas
            sections={sections}
            onUpdateSection={updateSection}
            onRemoveSection={removeSection}
            onReorderSections={reorderSections}
          />
        </div>

        {showThemeEditor && <ThemeEditor />}

        {/* Preview: always mounted, hidden on mobile when edit tab active */}
        <div className={cn(
          "min-w-0 flex-1 overflow-hidden md:flex-[6]",
          isMobile && mobileActiveTab !== "preview" && "hidden"
        )}>
          <EditorPreviewPanel />
        </div>
      </div>

      {/* Mobile sidebar FAB */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
        aria-label="Open sections"
      >
        <List className="h-5 w-5" />
      </button>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Sections</SheetTitle>
          </SheetHeader>
          <EditorSidebar
            sections={sections}
            onAddSection={(s) => { addSection(s); setSidebarOpen(false); }}
            onReorderSections={reorderSections}
          />
        </SheetContent>
      </Sheet>

      <AIChatBubble resumeId={id} />
      <SettingsDialog />
      <LazyMount active={activeModal === 'jd-analysis'}>
        <JdAnalysisDialog
          open={activeModal === 'jd-analysis'}
          onOpenChange={(open) => open ? openModal('jd-analysis') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'translate'}>
        <TranslateDialog
          open={activeModal === 'translate'}
          onOpenChange={(open) => open ? openModal('translate') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'export'}>
        <ExportDialog
          open={activeModal === 'export'}
          onOpenChange={(open) => open ? openModal('export') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'import'}>
        <ImportDialog
          open={activeModal === 'import'}
          onOpenChange={(open) => open ? openModal('import') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'share'}>
        <ShareDialog
          open={activeModal === 'share'}
          onOpenChange={(open) => open ? openModal('share') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'cover-letter'}>
        <CoverLetterDialog
          open={activeModal === 'cover-letter'}
          onOpenChange={(open) => open ? openModal('cover-letter') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <LazyMount active={activeModal === 'grammar-check'}>
        <GrammarCheckDialog
          open={activeModal === 'grammar-check'}
          onOpenChange={(open) => open ? openModal('grammar-check') : closeModal()}
          resumeId={id}
        />
      </LazyMount>
      <TourOverlay tourId="editor" steps={EDITOR_TOUR_STEPS} />
    </div>
  );
}
