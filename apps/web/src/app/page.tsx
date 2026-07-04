export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Audio&nbsp;→&nbsp;Text</h1>
      <p className="max-w-md text-lg text-gray-600">
        Transcribe audio to text in seconds, powered by OpenAI Whisper.
      </p>
      <p className="text-sm text-gray-400">
        Monorepo scaffold ready (Phase 2). Landing page comes in Phase 8.
      </p>
    </main>
  );
}
