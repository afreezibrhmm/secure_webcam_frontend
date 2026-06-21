import React, { useRef, useState, useEffect } from 'react';

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [status, setStatus] = useState("INITIALIZING SYSTEM...");
  const [confidence, setConfidence] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // NEW: State to track if the camera dimensions are fully loaded
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("SYSTEM READY // AWAITING SCAN");
      } catch (err) {
        console.error("Camera access denied:", err);
        setStatus("ERROR: CAMERA ACCESS DENIED");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    
    // Safety net just in case
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        setStatus("ERROR: CAMERA SENSOR STILL WARMING UP. TRY AGAIN.");
        return;
    }

    setIsScanning(true);
    setStatus("EXTRACTING TEXTURE MAP...");
    setConfidence(null);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const backendUrl = "https://secure-webcam1.onrender.com";// Make sure method: "POST" is included right below the URL!
      const response = await fetch(`${backendUrl}/api/verify-liveness`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Image }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`ACCESS GRANTED: ${data.classification}`);
        setConfidence(`${data.confidence}% CONFIDENCE`);
      } else {
        setStatus("ACCESS DENIED");
        setConfidence(data.detail.toUpperCase());
      }
    } catch (error) {
      console.error("API Error:", error);
      setStatus("ERROR: CONNECTION TO SECURE SERVER LOST");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#050505', 
      color: '#ffffff', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'monospace'
    }}>
      
      <div style={{ marginBottom: '20px', textAlign: 'center', letterSpacing: '4px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#888' }}>FLASHLYY // LABS</h1>
        <h2 style={{ margin: '5px 0', fontSize: '1rem' }}>BIOMETRIC SECURITY TERMINAL</h2>
      </div>

      <div style={{
        position: 'relative',
        border: status.includes("GRANTED") ? '2px solid #00ff00' : 
                status.includes("DENIED") ? '2px solid #ff0000' : '2px solid #333',
        padding: '10px',
        borderRadius: '8px',
        backgroundColor: '#000'
      }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          // NEW: This event fires the exact millisecond the resolution is calculated
          onCanPlay={() => setIsCameraReady(true)}
          style={{ width: '100%', maxWidth: '500px', transform: 'scaleX(-1)', filter: 'contrast(1.1) grayscale(0.2)' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center', height: '80px' }}>
        <p style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold',
          color: status.includes("GRANTED") ? '#00ff00' : status.includes("DENIED") ? '#ff0000' : '#fff'
        }}>
          {status}
        </p>
        {confidence && <p style={{ color: '#888', marginTop: '5px' }}>{confidence}</p>}
      </div>

      <button 
        onClick={handleScan} 
        disabled={isScanning || !isCameraReady}
        style={{
          marginTop: '20px',
          padding: '15px 40px',
          fontSize: '1rem',
          letterSpacing: '2px',
          backgroundColor: isScanning || !isCameraReady ? '#333' : '#ffffff',
          color: isScanning || !isCameraReady ? '#888' : '#000000',
          border: 'none',
          cursor: isScanning || !isCameraReady ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          borderRadius: '4px',
          transition: 'all 0.3s ease'
        }}
      >
        {!isCameraReady ? "WARMING UP SENSOR..." : isScanning ? "PROCESSING..." : "INITIATE SCAN"}
      </button>

    </div>
  );
}