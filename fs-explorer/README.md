# fs-explorer

A Next.js App Router application that displays a list of top-level filesystem folders on the home page. Built with JavaScript and Tailwind CSS.

## What it does

Reads the filesystem root (`/`) on the server using a Next.js Server Action and renders the directory names as an unordered list. Intended as a local development tool.

## Key files

- `app/actions/getFolders.js` — Server Action that reads a directory using Node's `fs` module
- `app/components/FolderList.jsx` — Component that renders folder names as a `<ul>`
- `app/page.js` — Home page: calls `getFolders` server-side and passes results to `FolderList`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the folder list.

## Commands

```bash
npm run dev    # start development server
npm run build  # production build
npm run lint   # run ESLint
```
