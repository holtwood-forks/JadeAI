'use client';

import dynamic from 'next/dynamic';
import { useId } from 'react';
import type { Resume } from '@/types/resume';
import { normalizeLanguageDescriptionsForCompactTemplates } from '@/lib/language-description';
import { buildThemeCss, mergeThemeConfig } from '@/lib/resume-theme/build-theme-css';
import { normalizeWorkExperienceMetadataForDisplay } from '@/lib/work-experience-meta';
// Batch 1: Industry/Professional
// Batch 2: Modern/Tech
// Batch 3: Creative/Artistic
// Batch 4: Style/Culture
// Batch 5: Specialized
// Batch 6: Layout Variants

interface ResumePreviewProps {
  resume: Resume;
}

// All 50 templates are lazy (per-template chunks; SSR still renders through
// next/dynamic). Editor/preview/share pages stop shipping the full template set.
const templateMap: Record<string, React.ComponentType<{ resume: Resume }>> = {
  classic: dynamic(() => import('./templates/classic').then((m) => m.ClassicTemplate)),
  modern: dynamic(() => import('./templates/modern').then((m) => m.ModernTemplate)),
  minimal: dynamic(() => import('./templates/minimal').then((m) => m.MinimalTemplate)),
  professional: dynamic(() => import('./templates/professional').then((m) => m.ProfessionalTemplate)),
  'two-column': dynamic(() => import('./templates/two-column').then((m) => m.TwoColumnTemplate)),
  creative: dynamic(() => import('./templates/creative').then((m) => m.CreativeTemplate)),
  ats: dynamic(() => import('./templates/ats').then((m) => m.AtsTemplate)),
  academic: dynamic(() => import('./templates/academic').then((m) => m.AcademicTemplate)),
  elegant: dynamic(() => import('./templates/elegant').then((m) => m.ElegantTemplate)),
  executive: dynamic(() => import('./templates/executive').then((m) => m.ExecutiveTemplate)),
  developer: dynamic(() => import('./templates/developer').then((m) => m.DeveloperTemplate)),
  designer: dynamic(() => import('./templates/designer').then((m) => m.DesignerTemplate)),
  startup: dynamic(() => import('./templates/startup').then((m) => m.StartupTemplate)),
  formal: dynamic(() => import('./templates/formal').then((m) => m.FormalTemplate)),
  infographic: dynamic(() => import('./templates/infographic').then((m) => m.InfographicTemplate)),
  compact: dynamic(() => import('./templates/compact').then((m) => m.CompactTemplate)),
  euro: dynamic(() => import('./templates/euro').then((m) => m.EuroTemplate)),
  clean: dynamic(() => import('./templates/clean').then((m) => m.CleanTemplate)),
  bold: dynamic(() => import('./templates/bold').then((m) => m.BoldTemplate)),
  timeline: dynamic(() => import('./templates/timeline').then((m) => m.TimelineTemplate)),
  // Batch 1
  nordic: dynamic(() => import('./templates/nordic').then((m) => m.NordicTemplate)),
  corporate: dynamic(() => import('./templates/corporate').then((m) => m.CorporateTemplate)),
  consultant: dynamic(() => import('./templates/consultant').then((m) => m.ConsultantTemplate)),
  finance: dynamic(() => import('./templates/finance').then((m) => m.FinanceTemplate)),
  medical: dynamic(() => import('./templates/medical').then((m) => m.MedicalTemplate)),
  // Batch 2
  gradient: dynamic(() => import('./templates/gradient').then((m) => m.GradientTemplate)),
  metro: dynamic(() => import('./templates/metro').then((m) => m.MetroTemplate)),
  material: dynamic(() => import('./templates/material').then((m) => m.MaterialTemplate)),
  coder: dynamic(() => import('./templates/coder').then((m) => m.CoderTemplate)),
  blocks: dynamic(() => import('./templates/blocks').then((m) => m.BlocksTemplate)),
  // Batch 3
  magazine: dynamic(() => import('./templates/magazine').then((m) => m.MagazineTemplate)),
  artistic: dynamic(() => import('./templates/artistic').then((m) => m.ArtisticTemplate)),
  retro: dynamic(() => import('./templates/retro').then((m) => m.RetroTemplate)),
  neon: dynamic(() => import('./templates/neon').then((m) => m.NeonTemplate)),
  watercolor: dynamic(() => import('./templates/watercolor').then((m) => m.WatercolorTemplate)),
  // Batch 4
  swiss: dynamic(() => import('./templates/swiss').then((m) => m.SwissTemplate)),
  japanese: dynamic(() => import('./templates/japanese').then((m) => m.JapaneseTemplate)),
  berlin: dynamic(() => import('./templates/berlin').then((m) => m.BerlinTemplate)),
  luxe: dynamic(() => import('./templates/luxe').then((m) => m.LuxeTemplate)),
  rose: dynamic(() => import('./templates/rose').then((m) => m.RoseTemplate)),
  // Batch 5
  architect: dynamic(() => import('./templates/architect').then((m) => m.ArchitectTemplate)),
  legal: dynamic(() => import('./templates/legal').then((m) => m.LegalTemplate)),
  teacher: dynamic(() => import('./templates/teacher').then((m) => m.TeacherTemplate)),
  scientist: dynamic(() => import('./templates/scientist').then((m) => m.ScientistTemplate)),
  engineer: dynamic(() => import('./templates/engineer').then((m) => m.EngineerTemplate)),
  // Batch 6
  sidebar: dynamic(() => import('./templates/sidebar').then((m) => m.SidebarTemplate)),
  card: dynamic(() => import('./templates/card').then((m) => m.CardTemplate)),
  zigzag: dynamic(() => import('./templates/zigzag').then((m) => m.ZigzagTemplate)),
  ribbon: dynamic(() => import('./templates/ribbon').then((m) => m.RibbonTemplate)),
  mosaic: dynamic(() => import('./templates/mosaic').then((m) => m.MosaicTemplate)),
};

export function ResumePreview({ resume }: ResumePreviewProps) {
  const Template = templateMap[resume.template] || templateMap.classic;
  const scopeId = useId();
  const theme = mergeThemeConfig(resume.themeConfig);

  // Defensive: ensure resume.sections is always an array (AI may return invalid/empty data)
  const safeResume = normalizeWorkExperienceMetadataForDisplay(
    normalizeLanguageDescriptionsForCompactTemplates(
      resume.sections ? resume : { ...resume, sections: [] }
    )
  );

  return (
    <>
      <div data-theme-scope={scopeId}>
        <style
          dangerouslySetInnerHTML={{
            __html: buildThemeCss({
              selector: `[data-theme-scope="${scopeId}"]`,
              theme,
              template: safeResume.template,
              includeNeedsPadding: true,
            }),
          }}
        />
        <Template resume={safeResume} />
      </div>
    </>
  );
}
