import React, { useEffect, useRef, useState } from "react";

const ASLRecognizer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [aslText, setAslText] = useState("");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    const tracks = stream?.getTracks();
    tracks?.forEach((track) => track.stop());
    setIsCameraOn(false);
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
  
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
  
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg");
    });
  
    const formData = new FormData();
    formData.append("file", blob);
  
    try {
      const res = await fetch("http://localhost:5001/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      setAslText(data.prediction); // ← this updates the live prediction text
    } catch (error) {
      console.error("Prediction error:", error);
    }
  };
  

  useEffect(() => {
    let interval;
    if (isCameraOn) {
      interval = setInterval(() => {
        captureAndSendFrame();
      }, 1000); // every second
    }
    return () => clearInterval(interval);
  }, [isCameraOn]);

  return (
    <div className="text-center p-4">
      <h2 className="text-xl font-bold mb-2">ASL Live Recognition</h2>

      <video ref={videoRef} className="rounded-lg" width="480" height="360" autoPlay muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="mt-4 space-x-4">
        <button onClick={startCamera} className="bg-green-600 text-white px-4 py-2 rounded">
          Start
        </button>
        <button onClick={stopCamera} className="bg-red-600 text-white px-4 py-2 rounded">
          Stop
        </button>
      </div>

      <div className="mt-6 text-lg font-semibold">
        Detected Text: <span className="text-blue-600">{aslText || "Waiting..."}</span>
      </div>
    </div>
  );
};

export default ASLRecognizer;
