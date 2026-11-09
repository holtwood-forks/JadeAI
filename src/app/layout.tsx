import type { Metadata } from 'next';
import './globals.css';
import { getEmbeddedFontFacesCss } from '@/lib/font-stacks';

const appName = process.env.APP_NAME || 'JadeAI';
const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://holtwood-forks.github.io/JadeAI').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${appName} - AI Resume Builder`,
  description: 'AI-powered intelligent resume builder with drag-and-drop editor',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var b=localStorage.getItem('jadeai-brand');if(b==='boss'){b='mint';localStorage.setItem('jadeai-brand','mint');}else if(b==='jade'){b='blue';localStorage.setItem('jadeai-brand','blue');}if(b==='blue'||b==='pink'){document.documentElement.setAttribute('data-brand',b);}}catch(e){}})();`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: getEmbeddedFontFacesCss() }} />
        {children}
      </body>
    </html>
  );
}
