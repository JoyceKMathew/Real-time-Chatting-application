import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Camera } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [gifPreview, setGifPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef(null);
  const gifInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isPredicting, setIsPredicting] = useState(false);


  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGifChange = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "image/gif") {
      toast.error("Please upload a GIF file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setGifPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeGif = () => {
    setGifPreview(null);
    if (gifInputRef.current) gifInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !gifPreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        gif: gifPreview,
      });

      setText("");
      setImagePreview(null);
      setGifPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (gifInputRef.current) gifInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const openCamera = async () => {
    try {
      setIsCameraOpen(true);
      setIsPredicting(true); // Start ASL prediction
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      startASLRecognition(videoRef, setText, setIsPredicting);
    } catch (error) {
      toast.error("Camera access denied or unavailable");
      console.error("Camera error:", error);
    }
  };
  

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageDataURL = canvas.toDataURL("image/png");
    const blob = dataURLToBlob(imageDataURL);
    console.log("Captured Image Size:", blob.size, "bytes");

    setImagePreview(imageDataURL);
    closeCamera();
  };

  const dataURLToBlob = (dataURL) => {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };
  const startASLRecognition = (videoRef, setText, setIsPredicting) => {
    const captureAndSend = async () => {
      if (!videoRef.current) return;
  
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");
  
        try {
          const response = await fetch("http://127.0.0.1:5001/upload", {
            method: "POST",
            body: formData,
          });
  
          const data = await response.json();
          if (data.prediction) {
            setText((prev) => prev + data.prediction);
          }
        } catch (err) {
          console.error("Prediction error:", err);
        }
  
        if (videoRef.current && isPredicting) {
          requestAnimationFrame(captureAndSend);
        }
      }, "image/jpeg");
    };
  
    captureAndSend();
  };
  
  const closeCamera = () => {
    setIsCameraOpen(false);
    setIsPredicting(false); // Stop ASL prediction
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  

  let recognition = null;

const startRecording = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast.error("Speech Recognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    setIsRecording(true);
    toast.success("Listening...");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setText((prev) => prev + " " + transcript);
    downloadTextFile(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    toast.error("Recognition error: " + event.error);
    setIsRecording(false);
  };

  recognition.onend = () => {
    setIsRecording(false);
  };

  recognition.start();
};

const stopRecording = () => {
  if (recognition) {
    recognition.stop();
    toast("Stopped listening.");
  }
};


  return (
    <div className="p-4 w-full relative">
      {/* Camera View */}
      {isCameraOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-black bg-opacity-80 z-50">
          <video
            ref={videoRef}
            className="w-full max-w-md rounded-lg border border-white shadow-lg"
            autoPlay
            playsInline
          />
          <div className="mt-4 flex gap-4">
            <button
              onClick={capturePhoto}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow"
            >
              Capture
            </button>
            <button
              onClick={closeCamera}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Preview Images */}
      {(imagePreview || gifPreview) && (
        <div className="mb-3 flex items-center gap-4">
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {gifPreview && (
            <div className="relative">
              <img
                src={gifPreview}
                alt="GIF Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={removeGif}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message Form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message or use ASL..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <input
            type="file"
            accept="image/gif"
            className="hidden"
            ref={gifInputRef}
            onChange={handleGifChange}
          />

          <button
            type="button"
            className={`flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${gifPreview ? "text-purple-500" : "text-zinc-400"}`}
            onClick={() => gifInputRef.current?.click()}
            title="Attach ASL GIF"
          >
            📎
          </button>

          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400"
            onClick={openCamera}
          >
            <Camera size={20} />
          </button>

          <button
            type="button"
            className={`btn btn-circle ${isRecording ? "bg-red-500 text-white" : "text-zinc-400"}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop Recording" : "Record Voice"}
          >
            🎤
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !gifPreview}
        >
          <Send size={22} />
        </button>
      </form>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MessageInput;
