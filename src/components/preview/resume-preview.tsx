'use client';

import { useId } from 'react';
import type { Resume } from '@/types/resume';
import { normalizeLanguageDescriptionsForCompactTemplates } from '@/lib/language-description';
import { buildThemeCss, mergeThemeConfig } from '@/lib/resume-theme/build-theme-css';
import { normalizeWorkExperienceMetadataForDisplay } from '@/lib/work-experience-meta';
import { templateMap } from './template-registry';

interface ResumePreviewProps {
  resume: Resume;
}

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
              // Keep template-level typography (10-12px dates, badges) intact,
              // matching the export path instead of forcing every span to the
              // body size.
              templateSafeVariables: true,
            }),
          }}
        />
        <Template resume={safeResume} />
      </div>
    </>
  );
}
