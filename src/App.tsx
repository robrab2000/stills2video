import { Toaster } from "sonner";
import { ImageToVideoConverter } from "./ImageToVideoConverter";
import { Analytics } from "@vercel/analytics/react"

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header
                className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-center items-center border-b shadow-sm px-4">
                <h2 className="text-2xl font-semibold">Stills-2-Video</h2>
            </header>
            <main className="flex-1 p-4">
                <div className="max-w-6xl mx-auto">
                    <ImageToVideoConverter/>
                </div>
            </main>

            <footer className="bg-gray-100 py-4 px-4 text-center text-xs text-gray-600 border-t">
        <span>
          &copy; {new Date().getFullYear()}{" "}
            <a
                href="https://robhomewood.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
            Rob Homewood
          </a>
            {" | "}
            <a
                href="https://github.com/robrab2000/stills2video"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
            GitHub
          </a>
            {" | "}
            <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
            MIT License
          </a>
        </span>
            </footer>

            <Toaster/>
            <Analytics/>
        </div>
    );
}


