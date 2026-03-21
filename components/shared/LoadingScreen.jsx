export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  );
}
