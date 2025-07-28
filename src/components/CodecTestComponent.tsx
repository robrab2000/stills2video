"use client";

import { useEffect, useState } from 'react';
import { getAvailableVideoCodecs } from '../lib/imageUtils';
import { CodecService } from '../services/codecService';

export function CodecTestComponent() {
  const [codecs, setCodecs] = useState<any[]>([]);
  const [bestCodec, setBestCodec] = useState<any>(null);
  const [h264Codec, setH264Codec] = useState<any>(null);

  useEffect(() => {
    const availableCodecs = getAvailableVideoCodecs();
    setCodecs(availableCodecs);
    
    const best = CodecService.getBestCodec(availableCodecs);
    setBestCodec(best);
    
    const h264 = CodecService.getPreferredH264Codec(availableCodecs);
    setH264Codec(h264);
  }, []);

  const testCodecRecording = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      
      // Draw a simple test pattern
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText('H.264 Test', 200, 240);
      
      const stream = canvas.captureStream(30);
      
      // Try H.264 first
      let mimeType = "video/mp4;codecs=h264";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8";
      }
      
      console.log("Testing recording with:", mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        console.log("Recording successful:", url);
        alert(`Recording successful! Codec: ${mimeType}`);
        URL.revokeObjectURL(url);
      };
      
      mediaRecorder.start();
      
      // Record for 2 seconds
      setTimeout(() => {
        mediaRecorder.stop();
      }, 2000);
      
    } catch (error) {
      console.error("Recording test failed:", error);
      alert("Recording test failed: " + error);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Codec Support Test</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold">Available Codecs:</h4>
        <ul className="list-disc list-inside">
          {codecs.map((codec, index) => (
            <li key={index} className={codec.supported ? 'text-green-600' : 'text-red-600'}>
              {codec.name}: {codec.supported ? '✅ Supported' : '❌ Not Supported'}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold">Best Codec:</h4>
        <p>{bestCodec ? `${bestCodec.name} (${bestCodec.mimeType})` : 'None found'}</p>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold">H.264 Codec:</h4>
        <p>{h264Codec ? `${h264Codec.name} (${h264Codec.mimeType})` : 'No H.264 support detected'}</p>
      </div>
      
      <button
        onClick={testCodecRecording}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test Recording
      </button>
    </div>
  );
}