import useQuickplayStore from "@store/quickplay";

export default function ClassicModeNote() {
  const classicMode = useQuickplayStore((state) => state.classicMode);

  if (!classicMode) {
    return null;
  }

  return (
    <div className="container mt-4">
      <div className="alert alert-warning fs-5 border-2 border-warning shadow-sm" role="alert">
        <span className="fas fa-exclamation-triangle me-2"></span>
        You are currently using Classic Quickplay. <a href="/quickplay" className="alert-link fw-bold" data-astro-reload>Click here</a> to switch back to the new and improved comfig quickplay.
      </div>
    </div>
  );
}
