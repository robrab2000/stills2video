// Utility to test codec support in the browser
export function testCodecSupport() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    console.log("MediaRecorder not available");
    return;
  }

  const testCodecs = [
    "video/mp4;codecs=h264",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=avc1.640028",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/mp4",
    "video/webm"
  ];

  console.log("=== Codec Support Test ===");
  testCodecs.forEach(codec => {
    const supported = MediaRecorder.isTypeSupported(codec);
    console.log(`${codec}: ${supported ? '✅' : '❌'}`);
  });
  console.log("==========================");
}

// Run the test if this file is imported
if (typeof window !== "undefined") {
  testCodecSupport();
}