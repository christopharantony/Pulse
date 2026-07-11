import type { Metadata } from 'next';
import { DocsContent } from '@/components/docs/docs-content';

export const metadata: Metadata = {
  title: 'Pulse — Design System',
  description: 'Design tokens, components, and conventions for the Pulse application shell.',
};

export default function DesignSystemDocsPage() {
  return <DocsContent />;
}
