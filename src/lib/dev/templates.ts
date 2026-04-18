/**
 * 프로젝트 템플릿 — 새 프로젝트 생성 시 초기 파일 세트
 */

export interface TemplateFile {
  path: string;
  content: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  files: TemplateFile[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: '빈 프로젝트',
    description: 'README만 포함된 빈 프로젝트',
    techStack: [],
    files: [
      { path: 'README.md', content: '# My Project\n\nOU에서 만든 프로젝트입니다.\n' },
    ],
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'Node.js 기본 프로젝트',
    techStack: ['node'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'my-node-app',
          version: '1.0.0',
          private: true,
          scripts: {
            start: 'node index.js',
          },
        }, null, 2) + '\n',
      },
      {
        path: 'index.js',
        content: `console.log('Hello from OU!');\n`,
      },
      { path: 'README.md', content: '# My Node App\n' },
    ],
  },
  {
    id: 'react',
    name: 'React',
    description: 'React + TypeScript 프로젝트',
    techStack: ['react', 'typescript'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'my-react-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
          },
          scripts: {
            dev: 'npx vite',
            build: 'npx tsc && npx vite build',
          },
        }, null, 2) + '\n',
      },
      {
        path: 'src/App.tsx',
        content: `export default function App() {
  return (
    <div>
      <h1>Hello from OU!</h1>
    </div>
  );
}\n`,
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);\n`,
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>\n`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            jsx: 'react-jsx',
            strict: true,
            moduleResolution: 'node',
            esModuleInterop: true,
          },
          include: ['src'],
        }, null, 2) + '\n',
      },
      { path: 'README.md', content: '# My React App\n' },
    ],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Next.js App Router 프로젝트',
    techStack: ['next.js', 'react', 'typescript'],
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'my-nextjs-app',
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            '@types/react': '^18.2.0',
            '@types/node': '^20.0.0',
          },
        }, null, 2) + '\n',
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function Home() {
  return (
    <main>
      <h1>Hello from OU!</h1>
    </main>
  );
}\n`,
      },
      {
        path: 'src/app/layout.tsx',
        content: `export const metadata = { title: 'My App' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}\n`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017',
            lib: ['dom', 'dom.iterable', 'esnext'],
            jsx: 'preserve',
            module: 'esnext',
            moduleResolution: 'bundler',
            paths: { '@/*': ['./src/*'] },
            strict: true,
            esModuleInterop: true,
          },
          include: ['src', 'next-env.d.ts'],
        }, null, 2) + '\n',
      },
      { path: 'README.md', content: '# My Next.js App\n' },
    ],
  },
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}
