# Tab Recorder Chrome Extension

Chrome sekmesi video kaydedici eklentisi. Ekranınızı veya belirli bir bölgeyi WebM formatında kaydedebilir, daha sonra MP4'e dönüştürebilirsiniz.

## Özellikler

- Tam ekran veya bölge kaydı
- Özelleştirilebilir çözünürlük (1920x1080, 1280x720, 854x480)
- Özelleştirilebilir FPS (60, 30, 24)
- Özelleştirilebilir video kalitesi (Yüksek, Orta, Düşük)
- WebM formatında kayıt
- MP4'e dönüştürme seçenekleri (Online servisler veya FFmpeg)

## Kurulum

1. Bu repoyu klonlayın:
```bash
git clone https://github.com/niyoseris/tabrecorder.git
```

2. Chrome'da uzantılar sayfasını açın: `chrome://extensions`
3. Geliştirici modunu açın (sağ üst köşe)
4. "Paketlenmemiş öğe yükle" butonuna tıklayın
5. İndirdiğiniz klasörü seçin

## Kullanım

1. Eklenti ikonuna tıklayın
2. Kayıt ayarlarını seçin:
   - Çözünürlük
   - FPS
   - Video kalitesi
   - Format (WebM/MP4)
3. "Tam Ekran Kaydet" veya "Bölge Seç ve Kaydet" butonuna tıklayın
4. Kaydı durdurmak için Chrome'un sağ üst köşesindeki kırmızı "Stop Share" butonuna tıklayın

## WebM'den MP4'e Dönüştürme

### Online Servisler
- [CloudConvert](https://cloudconvert.com/webm-to-mp4)
- [Convertio](https://convertio.co/webm-mp4/)

### FFmpeg ile Dönüştürme
1. [FFmpeg'i yükleyin](https://ffmpeg.org/download.html) (macOS: `brew install ffmpeg`)
2. Terminal'de şu komutu çalıştırın:
```bash
ffmpeg -i dosya.webm -c:v libx264 -crf 23 output.mp4
```

## Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.
