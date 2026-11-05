'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { Resume } from '@/types/resume';

function TemplateLoading() {
  return (
    <div
      className="h-full w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
      aria-hidden
    />
  );
}

/**
 * Each template is a separate client chunk. Preview and landing pages only
 * download the template they actually render instead of all fifty.
 */
export const templateMap: Record<string, ComponentType<{ resume: Resume }>> = {
  'classic': dynamic(() => import('./templates/classic').then((m) => m.ClassicTemplate), { loading: TemplateLoading }),
  'modern': dynamic(() => import('./templates/modern').then((m) => m.ModernTemplate), { loading: TemplateLoading }),
  'minimal': dynamic(() => import('./templates/minimal').then((m) => m.MinimalTemplate), { loading: TemplateLoading }),
  'professional': dynamic(() => import('./templates/professional').then((m) => m.ProfessionalTemplate), { loading: TemplateLoading }),
  'two-column': dynamic(() => import('./templates/two-column').then((m) => m.TwoColumnTemplate), { loading: TemplateLoading }),
  'creative': dynamic(() => import('./templates/creative').then((m) => m.CreativeTemplate), { loading: TemplateLoading }),
  'ats': dynamic(() => import('./templates/ats').then((m) => m.AtsTemplate), { loading: TemplateLoading }),
  'academic': dynamic(() => import('./templates/academic').then((m) => m.AcademicTemplate), { loading: TemplateLoading }),
  'elegant': dynamic(() => import('./templates/elegant').then((m) => m.ElegantTemplate), { loading: TemplateLoading }),
  'executive': dynamic(() => import('./templates/executive').then((m) => m.ExecutiveTemplate), { loading: TemplateLoading }),
  'developer': dynamic(() => import('./templates/developer').then((m) => m.DeveloperTemplate), { loading: TemplateLoading }),
  'designer': dynamic(() => import('./templates/designer').then((m) => m.DesignerTemplate), { loading: TemplateLoading }),
  'startup': dynamic(() => import('./templates/startup').then((m) => m.StartupTemplate), { loading: TemplateLoading }),
  'formal': dynamic(() => import('./templates/formal').then((m) => m.FormalTemplate), { loading: TemplateLoading }),
  'infographic': dynamic(() => import('./templates/infographic').then((m) => m.InfographicTemplate), { loading: TemplateLoading }),
  'compact': dynamic(() => import('./templates/compact').then((m) => m.CompactTemplate), { loading: TemplateLoading }),
  'euro': dynamic(() => import('./templates/euro').then((m) => m.EuroTemplate), { loading: TemplateLoading }),
  'clean': dynamic(() => import('./templates/clean').then((m) => m.CleanTemplate), { loading: TemplateLoading }),
  'bold': dynamic(() => import('./templates/bold').then((m) => m.BoldTemplate), { loading: TemplateLoading }),
  'timeline': dynamic(() => import('./templates/timeline').then((m) => m.TimelineTemplate), { loading: TemplateLoading }),
  'nordic': dynamic(() => import('./templates/nordic').then((m) => m.NordicTemplate), { loading: TemplateLoading }),
  'corporate': dynamic(() => import('./templates/corporate').then((m) => m.CorporateTemplate), { loading: TemplateLoading }),
  'consultant': dynamic(() => import('./templates/consultant').then((m) => m.ConsultantTemplate), { loading: TemplateLoading }),
  'finance': dynamic(() => import('./templates/finance').then((m) => m.FinanceTemplate), { loading: TemplateLoading }),
  'medical': dynamic(() => import('./templates/medical').then((m) => m.MedicalTemplate), { loading: TemplateLoading }),
  'gradient': dynamic(() => import('./templates/gradient').then((m) => m.GradientTemplate), { loading: TemplateLoading }),
  'metro': dynamic(() => import('./templates/metro').then((m) => m.MetroTemplate), { loading: TemplateLoading }),
  'material': dynamic(() => import('./templates/material').then((m) => m.MaterialTemplate), { loading: TemplateLoading }),
  'coder': dynamic(() => import('./templates/coder').then((m) => m.CoderTemplate), { loading: TemplateLoading }),
  'blocks': dynamic(() => import('./templates/blocks').then((m) => m.BlocksTemplate), { loading: TemplateLoading }),
  'magazine': dynamic(() => import('./templates/magazine').then((m) => m.MagazineTemplate), { loading: TemplateLoading }),
  'artistic': dynamic(() => import('./templates/artistic').then((m) => m.ArtisticTemplate), { loading: TemplateLoading }),
  'retro': dynamic(() => import('./templates/retro').then((m) => m.RetroTemplate), { loading: TemplateLoading }),
  'neon': dynamic(() => import('./templates/neon').then((m) => m.NeonTemplate), { loading: TemplateLoading }),
  'watercolor': dynamic(() => import('./templates/watercolor').then((m) => m.WatercolorTemplate), { loading: TemplateLoading }),
  'swiss': dynamic(() => import('./templates/swiss').then((m) => m.SwissTemplate), { loading: TemplateLoading }),
  'japanese': dynamic(() => import('./templates/japanese').then((m) => m.JapaneseTemplate), { loading: TemplateLoading }),
  'berlin': dynamic(() => import('./templates/berlin').then((m) => m.BerlinTemplate), { loading: TemplateLoading }),
  'luxe': dynamic(() => import('./templates/luxe').then((m) => m.LuxeTemplate), { loading: TemplateLoading }),
  'rose': dynamic(() => import('./templates/rose').then((m) => m.RoseTemplate), { loading: TemplateLoading }),
  'architect': dynamic(() => import('./templates/architect').then((m) => m.ArchitectTemplate), { loading: TemplateLoading }),
  'legal': dynamic(() => import('./templates/legal').then((m) => m.LegalTemplate), { loading: TemplateLoading }),
  'teacher': dynamic(() => import('./templates/teacher').then((m) => m.TeacherTemplate), { loading: TemplateLoading }),
  'scientist': dynamic(() => import('./templates/scientist').then((m) => m.ScientistTemplate), { loading: TemplateLoading }),
  'engineer': dynamic(() => import('./templates/engineer').then((m) => m.EngineerTemplate), { loading: TemplateLoading }),
  'sidebar': dynamic(() => import('./templates/sidebar').then((m) => m.SidebarTemplate), { loading: TemplateLoading }),
  'card': dynamic(() => import('./templates/card').then((m) => m.CardTemplate), { loading: TemplateLoading }),
  'zigzag': dynamic(() => import('./templates/zigzag').then((m) => m.ZigzagTemplate), { loading: TemplateLoading }),
  'ribbon': dynamic(() => import('./templates/ribbon').then((m) => m.RibbonTemplate), { loading: TemplateLoading }),
  'mosaic': dynamic(() => import('./templates/mosaic').then((m) => m.MosaicTemplate), { loading: TemplateLoading }),
};
