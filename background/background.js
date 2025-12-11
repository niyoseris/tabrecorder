// When extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DEBUG] Tab Recorder extension installed');
});

// When icon is clicked
chrome.action.onClicked.addListener(() => {
  // If window is already open, bring it to front
  if (windowId !== null) {
    chrome.windows.update(windowId, { focused: true });
    return;
  }

  // Open new window
  chrome.windows.create({
    url: chrome.runtime.getURL('popup/popup.html'),
    type: 'popup',
    width: 800,
    height: 600
  }, (window) => {
    windowId = window.id;
  });
});

// When window is closed
chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});

let isRecording = false;
let recordingSettings = null;
let windowId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DEBUG] Background: Message received:', request);

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