export default function FolderList({ folders }) {
  if (!folders || folders.length === 0) {
    return <p>No folders found.</p>;
  }

  return (
    <ul>
      {folders.map((folder) => (
        <li key={folder}>{folder}</li>
      ))}
    </ul>
  );
}
