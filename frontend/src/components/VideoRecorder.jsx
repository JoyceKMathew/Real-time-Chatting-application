import React from "react";
import { MediaRecorder } from "react-media-recorder";

const VideoRecorder = ({ onStop }) => {
  return (
    <MediaRecorder
      video
      render={({ startRecording, stopRecording, mediaBlobUrl }) => (
        <div>
          <video src={mediaBlobUrl} controls autoPlay />
          <button onClick={startRecording}>Start Recording</button>
          <button onClick={stopRecording}>Stop Recording</button>
        </div>
      )}
      onStop={(blobUrl, blob) => {
        onStop(blob);
      }}
    />
  );
};
const sendVideoToBackend = async (videoBlob) => {
  const formData = new FormData();
  formData.append("video", videoBlob);

  try {
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    console.log("ASL Result from backend:", data.result);

    // Optional: Set in localStorage again here
    localStorage.setItem("asl_output", data.result);
  } catch (error) {
    console.error("Error uploading video:", error);
  }
};


export default VideoRecorder;
