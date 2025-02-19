// Kayıt durumunu global olarak tut
let mediaRecorder = null;
let recordedChunks = [];

document.addEventListener('DOMContentLoaded', async function() {
  console.log('[DEBUG] Popup: DOMContentLoaded event tetiklendi');

  const startFullscreenBtn = document.getElementById('startFullscreen');
  const startRegionBtn = document.getElementById('startRegion');
  const statusDiv = document.getElementById('status');
  const converterLinksDiv = document.getElementById('converterLinks');

  // Ayarlar
  const resolutionSelect = document.getElementById('resolution');
  const framerateSelect = document.getElementById('framerate');
  const videoBitrateSelect = document.getElementById('videoBitrate');
  const formatSelect = document.getElementById('format');
  const audioSelect = document.getElementById('audio');

  // Başlangıçta kayıt durumunu kontrol et
  chrome.runtime.sendMessage({ action: 'getRecordingStatus' }, (response) => {
    console.log('[DEBUG] Popup: Kayıt durumu alındı:', response);
    if (response.isRecording) {
      updateUI(true);
      statusDiv.textContent = "Kayıt yapılıyor...";
    }
  });

  startFullscreenBtn.addEventListener('click', () => {
    console.log('[DEBUG] Popup: Tam ekran kayıt butonu tıklandı');
    startRecording('screen');
  });
  
  startRegionBtn.addEventListener('click', () => {
    console.log('[DEBUG] Popup: Bölge kayıt butonu tıklandı');
    startRecording('region');
  });

  async function startRecording(type) {
    try {
      console.log('[DEBUG] Popup: startRecording başladı, type:', type);
      statusDiv.textContent = "İzin penceresi açılıyor...";
      converterLinksDiv.style.display = 'none';

      // Seçilen ayarları al
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

      console.log('[DEBUG] Popup: Seçilen ayarlar:', settings);

      // Önce mikrofon izni al (eğer seçildiyse)
      let micStream = null;
      if (settings.audio === 'microphone' || settings.audio === 'both') {
        try {
          statusDiv.textContent = "Mikrofon izni bekleniyor...";
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            },
            video: false
          });
          statusDiv.textContent = "Ekran paylaşımı izni bekleniyor...";
        } catch (error) {
          console.error('Mikrofon izni alınamadı:', error);
          statusDiv.textContent = "Mikrofon izni reddedildi!";
          throw new Error('Mikrofon izni reddedildi');
        }
      }

      // Ekran paylaşımı izni al
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

      // Mikrofon sesini ana stream'e ekle
      if (micStream) {
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        // Mikrofon sesini ekle
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
        
        // Sistem sesini ekle (eğer varsa)
        if (settings.audio === 'both') {
          const systemSource = audioContext.createMediaStreamSource(stream);
          systemSource.connect(destination);
        }
        
        // Ses track'lerini stream'e ekle
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      }

      console.log('[DEBUG] Popup: Stream alındı');

      // WebM olarak kaydet
      const mimeType = 'video/webm;codecs=vp8,opus';

      console.log('[DEBUG] Popup: MediaRecorder oluşturuluyor');
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate
      });
      console.log('[DEBUG] Popup: MediaRecorder oluşturuldu:', mediaRecorder);

      recordedChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        console.log('[DEBUG] Popup: Veri alındı, boyut:', e.data.size);
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('[DEBUG] Popup: MediaRecorder kayda başladı');
        // Background script'e kayıt durumunu bildir
        chrome.runtime.sendMessage({ 
          action: 'updateRecordingStatus',
          isRecording: true,
          settings
        });
        updateUI(true);
        statusDiv.textContent = "Kayıt yapılıyor...";
        // Ekran seçimi yapıldıktan sonra pencereyi arka plana al
        window.blur();
      };

      mediaRecorder.onstop = async () => {
        console.log('[DEBUG] Popup: MediaRecorder durdu');
        // Background script'e kayıt durumunu bildir
        chrome.runtime.sendMessage({ 
          action: 'updateRecordingStatus',
          isRecording: false,
          settings: null
        });
        const blob = new Blob(recordedChunks, { type: mimeType });
        console.log('[DEBUG] Popup: WebM blob oluşturuldu, boyut:', blob.size);
        saveRecording(blob, 'webm');
      };

      mediaRecorder.onerror = (error) => {
        console.error('[DEBUG] Popup: MediaRecorder hatası:', error);
        statusDiv.textContent = "Kayıt hatası: " + error.message;
      };

      mediaRecorder.start(1000);
      console.log('[DEBUG] Popup: MediaRecorder başlatıldı');

      // Kayıt durdurulduğunda (Stop Share butonuna tıklandığında)
      stream.getVideoTracks()[0].onended = () => {
        console.log('[DEBUG] Popup: Video track sonlandı');
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
          console.log('[DEBUG] Popup: MediaRecorder durduruldu');
        }
      };

    } catch (err) {
      console.error('[DEBUG] Popup: Hata oluştu:', err);
      statusDiv.textContent = "Kayıt başlatılamadı: " + err.message;
      updateUI(false);
    }
  }

  function saveRecording(blob, format) {
    console.log(`[DEBUG] Popup: ${format.toUpperCase()} kaydediliyor, boyut:`, blob.size);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const [width, height] = resolutionSelect.value.split('x');
    
    console.log('[DEBUG] Popup: Video indiriliyor');
    chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `tab-recording-${width}x${height}-${timestamp}.${format}`,
      saveAs: true
    }, (downloadId) => {
      console.log('[DEBUG] Popup: Video indirildi, downloadId:', downloadId);
      recordedChunks = [];
      mediaRecorder.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[DEBUG] Popup: Track durduruldu:', track.kind);
      });
      updateUI(false);
      if (formatSelect.value === 'mp4') {
        statusDiv.textContent = "Video WebM formatında kaydedildi!";
        converterLinksDiv.style.display = 'block';
      } else {
        statusDiv.textContent = "Video kaydedildi!";
        converterLinksDiv.style.display = 'none';
      }
    });
  }

  function updateUI(isRecording) {
    console.log('[DEBUG] Popup: UI güncelleniyor, isRecording:', isRecording);
    startFullscreenBtn.disabled = isRecording;
    startRegionBtn.disabled = isRecording;
    
    // Kayıt sırasında ayarları devre dışı bırak
    resolutionSelect.disabled = isRecording;
    framerateSelect.disabled = isRecording;
    videoBitrateSelect.disabled = isRecording;
    formatSelect.disabled = isRecording;
    audioSelect.disabled = isRecording;
  }
});