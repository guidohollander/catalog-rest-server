import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const customComponents = {
  h1: (props: any) => <h1 {...props} className="text-4xl font-bold mb-8 text-white" />,
  h2: (props: any) => <h2 {...props} className="text-2xl font-bold mt-8 mb-4 text-white flex items-center gap-2" />,
  h3: (props: any) => <h3 {...props} className="text-xl font-bold mt-6 mb-3 text-white" />,
  p: (props: any) => <p {...props} className="text-gray-300 mb-4" />,
  ul: (props: any) => <ul {...props} className="list-disc pl-6 mb-6 text-gray-300 space-y-2" />,
  li: (props: any) => <li {...props} className="text-gray-300" />,
  code: (props: any) => {
    // Check if it's an inline code block
    const isInline = !props.className;
    return (
      <code
        {...props}
        className={isInline ? "bg-gray-800 px-2 py-1 rounded text-gray-300" : "block bg-gray-800 p-4 rounded-lg overflow-x-auto text-gray-300"}
      />
    );
  },
  pre: (props: any) => <pre {...props} className="bg-gray-800 p-4 rounded-lg mb-6 overflow-x-auto" />,
  a: (props: any) => (
    <a
      {...props}
      className="text-blue-400 hover:text-blue-300 underline"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-6 rounded-lg border border-gray-700">
      <table {...props} className="w-full text-left border-collapse table-auto" />
    </div>
  ),
  th: (props: any) => (
    <th 
      {...props} 
      className="px-6 py-3 text-sm font-semibold text-white border-b border-gray-700" 
    />
  ),
  td: (props: any) => (
    <td 
      {...props} 
      className="px-6 py-3 text-sm text-gray-300 border-b border-gray-700"
    />
  ),
  tbody: (props: any) => (
    <tbody {...props} className="bg-[#1f2937]" />
  ),
  thead: (props: any) => (
    <thead {...props} className="bg-gray-800" />
  ),
};

export default function Documentation() {
  // Read markdown file directly in the component
  const fullPath = path.join(process.cwd(), 'README.md');
  const markdown = fs.readFileSync(fullPath, 'utf8');

  return (
    <main className="flex min-h-screen flex-col p-12 bg-[#1a1b26]">
      <div className="w-full max-w-4xl mx-auto">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
          ← Back to Home
        </Link>
        
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown components={customComponents}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </main>
  );
}
