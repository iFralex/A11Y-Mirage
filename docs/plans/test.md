# Plan: Next.js Filesystem Explorer (Folders Only)

## Overview
Create a Next.js App (App Router, JavaScript) that displays on the home page a list of folders in the filesystem. No complex interaction is needed: just read directories and render them in a list.

## Validation Commands
- npm run dev → start the app  
- npm run lint → check linting  
- npm run test → for future tests  

---

### Task 1: Project Initialization
- [x] Create the new Next.js app with npx create-next-app@latest fs-explorer --javascript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
- [x] cd fs-explorer
- [x] Install additional dependencies if needed with npm install
- [x] Mark completed

---

### Task 2: Server Action to Read Folders
- [ ] Create folder app/actions  
- [ ] Create file app/actions/getFolders.js  
- [ ] Implement Server Action to read folders using Node fs module  
- [ ] Mark completed  

---

### Task 3: FolderList Component
- [ ] Create folder app/components  
- [ ] Create file app/components/FolderList.jsx  
- [ ] Implement component to render the list of folders as a <ul>  
- [ ] Mark completed  

---

### Task 4: Home Page Integration
- [ ] Edit app/page.js to import FolderList and getFolders  
- [ ] Fetch the folders on the server side and pass them to FolderList  
- [ ] Render a heading "Filesystem Folders" above the list  
- [ ] Mark completed  

