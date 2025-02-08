// Content script şu an için boş, gelecekte gerekirse eklemeler yapılabilir
console.log('Tab Recorder content script yüklendi');

let mediaRecorder = null;
let recordedChunks = [];

// Background script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "startRecording") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: request.streamId,
            maxWidth: 1920,
            maxHeight: 1080
          }
        }
      });

      const mimeType = 'video/webm;codecs=vp8,opus';
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });

      recordedChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('Veri alındı:', e.data.size, 'bytes');
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('Kayıt başladı');
        chrome.runtime.sendMessage({ action: "recordingStarted" });
      };

      mediaRecorder.onstop = () => {
        console.log('Kayıt durdu');
        
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        chrome.downloads.download({
          url: url,
          filename: `tab-recording-${timestamp}.webm`,
          saveAs: true
        }, () => {
          URL.revokeObjectURL(url);
          recordedChunks = [];
          stream.getTracks().forEach(track => track.stop());
          chrome.runtime.sendMessage({ action: "recordingStopped" });
        });
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder hatası:', error);
        chrome.runtime.sendMessage({ 
          action: "recordingError", 
          error: error.message 
        });
      };

      mediaRecorder.start(1000);
      sendResponse({ success: true });

    } catch (error) {
      console.error('Kayıt başlatma hatası:', error);
      sendResponse({ error: error.message });
    }
    return true;
  }
  
  else if (request.action === "stopRecording") {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      sendResponse({ success: true });
    } else {
      sendResponse({ error: "Aktif kayıt bulunamadı" });
    }
    return true;
  }
});