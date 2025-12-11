// Keep recording state globally
let mediaRecorder = null;
let recordedChunks = [];

document.addEventListener('DOMContentLoaded', async function() {
  console.log('[DEBUG] Popup: DOMContentLoaded event triggered');

  const startFullscreenBtn = document.getElementById('startFullscreen');
  const startRegionBtn = document.getElementById('startRegion');
  const statusDiv = document.getElementById('status');
  const converterLinksDiv = document.getElementById('converterLinks');

  // Settings
  const resolutionSelect = document.getElementById('resolution');
  const framerateSelect = document.getElementById('framerate');
  const videoBitrateSelect = document.getElementById('videoBitrate');
  const formatSelect = document.getElementById('format');
  const audioSelect = document.getElementById('audio');

  // Check recording status on startup
  chrome.runtime.sendMessage({ action: 'getRecordingStatus' }, (response) => {
    console.log('[DEBUG] Popup: Recording status received:', response);
    if (response.isRecording) {
      updateUI(true);
      statusDiv.textContent = "Recording...";
    }
  });

  startFullscreenBtn.addEventListener('click', () => {
    console.log('[DEBUG] Popup: Full screen record button clicked');
    startRecording('screen');
  });
  
  startRegionBtn.addEventListener('click', () => {
    console.log('[DEBUG] Popup: Region record button clicked');
    startRecording('region');
  });

  async function startRecording(type) {
    try {
      console.log('[DEBUG] Popup: startRecording started, type:', type);
      statusDiv.textContent = "Opening permission window...";
      converterLinksDiv.style.display = 'none';

      // Get selected settings
      const [width, height] = resolutionSelect.value.split('x').map(Number);
      const frameRate = Number(framerateSelect.value);
      const videoBitrate = Number(videoBitrateSelect.value);
      const format = formatSelect.value;
      const audio = audioSelect.value;

      const settings = {
        type,
        width,
        height,
        frameRate,
        videoBitrate,
        format,
        audio
      };

      console.log('[DEBUG] Popup: Selected settings:', settings);

      // Get microphone permission first (if selected)
      let micStream = null;
      if (settings.audio === 'microphone' || settings.audio === 'both') {
        try {
          statusDiv.textContent = "Waiting for microphone permission...";
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            },
            video: false
          });
          statusDiv.textContent = "Waiting for screen sharing permission...";
        } catch (error) {
          console.error('Microphone permission denied:', error);
          statusDiv.textContent = "Microphone permission denied!";
          throw new Error('Microphone permission denied');
        }
      }

      // Get screen sharing permission
      const displayMediaOptions = {
        video: {
          cursor: "always",
          displaySurface: type === 'screen' ? 'monitor' : 'window',
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: frameRate, max: frameRate },
          aspectRatio: width / height,
          resizeMode: "crop-and-scale"
        },
        audio: settings.audio === 'both', // Sistem sesi için
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
        controllerType: "browser"
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Add microphone audio to main stream
      if (micStream) {
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        // Add microphone audio
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
        
        // Add system audio (if available)
        if (settings.audio === 'both') {
          const systemSource = audioContext.createMediaStreamSource(stream);
          systemSource.connect(destination);
        }
        
        // Add audio tracks to stream
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      }

      console.log('[DEBUG] Popup: Stream received');

      // Save as WebM
      const mimeType = 'video/webm;codecs=vp8,opus';

      console.log('[DEBUG] Popup: Creating MediaRecorder');
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate
      });
      console.log('[DEBUG] Popup: MediaRecorder created:', mediaRecorder);

      recordedChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        console.log('[DEBUG] Popup: Data received, size:', e.data.size);
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('[DEBUG] Popup: MediaRecorder started recording');
        // Notify background script of recording status
        chrome.runtime.sendMessage({ 
          action: 'updateRecordingStatus',
          isRecording: true,
          settings
        });
        updateUI(true);
        statusDiv.textContent = "Recording...";
        // Minimize window after screen selection
        window.blur();
      };

      mediaRecorder.onstop = async () => {
        console.log('[DEBUG] Popup: MediaRecorder stopped');
        // Notify background script of recording status
        chrome.runtime.sendMessage({ 
          action: 'updateRecordingStatus',
          isRecording: false,
          settings: null
        });
        const blob = new Blob(recordedChunks, { type: mimeType });
        console.log('[DEBUG] Popup: WebM blob created, size:', blob.size);
        saveRecording(blob, 'webm');
      };

      mediaRecorder.onerror = (error) => {
        console.error('[DEBUG] Popup: MediaRecorder error:', error);
        statusDiv.textContent = "Recording error: " + error.message;
      };

      mediaRecorder.start(1000);
      console.log('[DEBUG] Popup: MediaRecorder started');

      // When recording is stopped (Stop Share button clicked)
      stream.getVideoTracks()[0].onended = () => {
        console.log('[DEBUG] Popup: Video track ended');
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
          console.log('[DEBUG] Popup: MediaRecorder stopped');
        }
      };

    } catch (err) {
      console.error('[DEBUG] Popup: Error occurred:', err);
      statusDiv.textContent = "Failed to start recording: " + err.message;
      updateUI(false);
    }
  }

  function saveRecording(blob, format) {
    console.log(`[DEBUG] Popup: Saving ${format.toUpperCase()}, size:`, blob.size);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const [width, height] = resolutionSelect.value.split('x');
    
    console.log('[DEBUG] Popup: Downloading video');
    chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `tab-recording-${width}x${height}-${timestamp}.${format}`,
      saveAs: true
    }, (downloadId) => {
      console.log('[DEBUG] Popup: Video downloaded, downloadId:', downloadId);
      recordedChunks = [];
      mediaRecorder.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[DEBUG] Popup: Track stopped:', track.kind);
      });
      updateUI(false);
      if (formatSelect.value === 'mp4') {
        statusDiv.textContent = "Video saved in WebM format!";
        converterLinksDiv.style.display = 'block';
      } else {
        statusDiv.textContent = "Video saved!";
        converterLinksDiv.style.display = 'none';
      }
    });
  }

  function updateUI(isRecording) {
    console.log('[DEBUG] Popup: Updating UI, isRecording:', isRecording);
    startFullscreenBtn.disabled = isRecording;
    startRegionBtn.disabled = isRecording;
    
    // Disable settings during recording
    resolutionSelect.disabled = isRecording;
    framerateSelect.disabled = isRecording;
    videoBitrateSelect.disabled = isRecording;
    formatSelect.disabled = isRecording;
    audioSelect.disabled = isRecording;
  }
});