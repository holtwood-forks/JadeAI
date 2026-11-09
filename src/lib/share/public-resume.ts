import type { ResumeSection, SectionContent, ThemeConfig } from '@/types/resume';

export interface PublicResumeSection {
  id: string;
  type: string;
  title: string;
  sortOrder: number;
  visible: boolean;
  content: SectionContent;
}

export interface PublicResume {
  id: string;
  title: string;
  template: string;
  themeConfig: ThemeConfig;
  language: string;
  sections: PublicResumeSection[];
}

type PublicResumeSource = Pick<PublicResume, 'id' | 'title' | 'template' | 'themeConfig' | 'language'> & {
  sections?: Array<Pick<ResumeSection, 'id' | 'type' | 'title' | 'sortOrder' | 'visible' | 'content'>>;
};

export function serializePublicResume(resume: PublicResumeSource): PublicResume {
  // The public endpoint must not rely on the renderer to hide sections: hidden
  // content would still be readable straight from the JSON. Drop invisible
  // sections here, before the shape leaves the server.
  const sections = (resume.sections ?? [])
    .filter((section) => section.visible !== false)
    .map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      sortOrder: section.sortOrder,
      visible: true,
      content: section.content,
    }));

  return {
    id: resume.id,
    title: resume.title,
    template: resume.template,
    themeConfig: resume.themeConfig,
    language: resume.language,
    sections,
  };
}
