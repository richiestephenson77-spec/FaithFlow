export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2C4055]">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">✝</div>
        <h1 className="text-2xl font-bold mb-2">FaithBridge</h1>
        <div className="flex gap-1 justify-center mt-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
