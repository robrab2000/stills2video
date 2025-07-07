import { Toaster } from "sonner";
import { ImageToVideoConverter } from "./ImageToVideoConverter";
import { Analytics } from "@vercel/analytics/react"

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header
                className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-center items-center border-b shadow-sm px-4">
                <h2 className="text-xl font-semibold text-primary">Stills-2-Video</h2>
            </header>
            <main className="flex-1 p-4">
                <div className="max-w-6xl mx-auto">
                    <ImageToVideoConverter/>
                </div>
            </main>
            <Toaster/>
            <Analytics/>
        </div>
    );
}


