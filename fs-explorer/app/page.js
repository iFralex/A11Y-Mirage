import { getFolders } from "@/app/actions/getFolders";
import FolderList from "@/app/components/FolderList";

export default async function Home() {
  const folders = await getFolders("/");

  return (
    <div>
      <h1>Filesystem Folders</h1>
      <FolderList folders={folders} />
    </div>
  );
}
