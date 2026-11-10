import type * as PageTree from 'fumadocs-core/page-tree';
import { docs } from './content';

const children: PageTree.Node[] = [];
let lastCategory: string | undefined;

for (const doc of docs) {
  if (doc.category !== lastCategory) {
    children.push({ type: 'separator', name: doc.category });
    lastCategory = doc.category;
  }

  children.push({
    type: 'page',
    name: doc.title,
    url: `/docs/${doc.slug}`,
    description: doc.description,
  });
}

export const pageTree: PageTree.Root = {
  type: 'root',
  name: 'Documentation',
  children,
};
