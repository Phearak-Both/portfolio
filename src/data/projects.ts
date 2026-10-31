/**
 * Project content. Add `links` (repo, demo, write-up) as they become public.
 * Keep descriptions factual — no metrics until they are measured.
 */
export interface Project {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  stack: string[];
  links?: { label: string; href: string }[];
}

export const projects: Project[] = [
  {
    id: 'sme-copilot',
    title: 'Cambodian SME Financial Copilot',
    summary:
      'A mobile-first financial assistant for Cambodian small businesses and agricultural traders.',
    highlights: [
      'Khmer-first interactions',
      'Income and expense tracking',
      'KHR / USD financial records',
      'Receipt recognition',
      'Inventory and working-capital awareness',
      'Financial reporting',
    ],
    stack: ['Mobile-first', 'Khmer-first', 'KHR / USD'],
  },
  {
    id: 'aml-platform',
    title: 'AML Platform',
    summary:
      'A computer-vision and MLOps-style platform for object detection and image segmentation workflows.',
    highlights: ['Object detection', 'Image segmentation', 'YOLO integration', 'SAM integration'],
    stack: ['React', 'TypeScript', 'FastAPI', 'Supabase', 'YOLO', 'SAM'],
  },
  {
    id: 'ml-experiments',
    title: 'Machine Learning Experiments',
    summary: 'Representative experiments across classic ML and deep learning.',
    highlights: [
      'Diabetes prediction',
      'CIFAR-10 image classification with a CNN',
      'Car-price prediction with Random Forest',
    ],
    stack: ['Classification', 'Regression', 'CNN', 'Random Forest'],
  },
];
