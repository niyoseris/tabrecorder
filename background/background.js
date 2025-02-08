// Eklenti yüklendiğinde
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DEBUG] Tab Recorder eklentisi yüklendi');
});

// İkona tıklandığında
chrome.action.onClicked.addListener(() => {
  // Eğer pencere zaten açıksa, onu öne getir
  if (windowId !== null) {
    chrome.windows.update(windowId, { focused: true });
    return;
  }

  // Yeni pencere aç
  chrome.windows.create({
    url: chrome.runtime.getURL('popup/popup.html'),
    type: 'popup',
    width: 800,
    height: 600
  }, (window) => {
    windowId = window.id;
  });
});

// Pencere kapandığında
chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});

let isRecording = false;
let recordingSettings = null;
let windowId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DEBUG] Background: Mesaj alındı:', request);

  if (request.action === 'updateRecordingStatus') {
    isRecording = request.isRecording;
    recordingSettings = request.settings;
    sendResponse({ success: true });
  }
  else if (request.action === 'getRecordingStatus') {
    sendResponse({ 
      isRecording,
      settings: recordingSettings
    });
  }

  return true; // Keep the message channel open for async responses
});