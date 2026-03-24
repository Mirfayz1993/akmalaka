export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
      <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 w-full bg-gray-800 rounded animate-pulse opacity-75" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
