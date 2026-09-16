import { ImageToVideoConverter } from '../components/ImageToVideoConverter';
import { PerformanceMonitor } from '../components/ui/PerformanceMonitor';

export default function Home() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-6xl">
          <ImageToVideoConverter />
        </div>
      </main>

      <footer className="border-t border-line px-4 py-5 text-center text-xs text-ink-muted">
        <span>
          &copy; {new Date().getFullYear()}{" "}
          <a
            href="https://robhomewood.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            Rob Homewood
          </a>
          {" · "}
          <a
            href="https://github.com/robrab2000/stills2video"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            GitHub
          </a>
          {" · "}
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            MIT
          </a>
          {" · "}
          <span className="text-ink-faint">Processing stays on your device</span>
        </span>
      </footer>

      <PerformanceMonitor
        enabled={process.env.NODE_ENV === 'development'}
        showDetails={false}
      />
    </div>
  );
}
