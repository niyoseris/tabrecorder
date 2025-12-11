# Tab Recorder Chrome Extension

Chrome tab video recorder extension. Record your screen or a specific region in WebM format, then convert to MP4.

## Features

- Full screen or region recording
- Customizable resolution (1920x1080, 1280x720, 854x480)
- Customizable FPS (60, 30, 24)
- Customizable video quality (High, Medium, Low)
- WebM format recording
- MP4 conversion options (Online services or FFmpeg)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/niyoseris/tabrecorder.git
```

2. Open Chrome extensions page: `chrome://extensions`
3. Enable Developer mode (top right corner)
4. Click "Load unpacked" button
5. Select the downloaded folder

## Usage

1. Click the extension icon
2. Select recording settings:
   - Resolution
   - FPS
   - Video quality
   - Format (WebM/MP4)
3. Click "Full Screen Record" or "Select Region and Record" button
4. To stop recording, click the red "Stop Share" button in Chrome's top right corner

## Converting WebM to MP4

### Online Services
- [CloudConvert](https://cloudconvert.com/webm-to-mp4)
- [Convertio](https://convertio.co/webm-mp4/)

### Converting with FFmpeg
1. [Install FFmpeg](https://ffmpeg.org/download.html) (macOS: `brew install ffmpeg`)
2. Run the following command in Terminal:
```bash
ffmpeg -i file.webm -c:v libx264 -crf 23 output.mp4
```

## License

MIT License - See [LICENSE](LICENSE) file for details.
