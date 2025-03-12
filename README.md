# YouTube Türkçe Seslendirme Eklentisi

Bu Chrome eklentisi, YouTube videolarını otomatik olarak algılayıp, orijinal dili belirleyerek Google TTS API ile Türkçe seslendirme yapmanızı sağlar.

## Özellikler

- **YouTube Videosu Algılama:** Açılan YouTube videosunu otomatik olarak algılar.
- **Dil Tanıma:** Videodaki orijinal dili algılar.
- **Google Translate API (TTS):** Google'ın ücretsiz Text-to-Speech (TTS) API'si ile sesi Türkçe'ye çevirir.
- **Seslendirme Seçimi:** Kadın veya erkek sesi seçimi yapılabilir.
- **Anlık Çeviri:** Çeviri gerçek zamanlı veya video öncesinde yapılır.
- **Oynatma Üzerine Ses Bindirme:** Orijinal ses kısılır ve çeviri sesi üzerine bindirilir.

## Kurulum

1. Bu repoyu bilgisayarınıza indirin veya klonlayın.
2. Chrome tarayıcınızda `chrome://extensions/` adresine gidin.
3. Geliştirici modunu açın (sağ üst köşedeki "Developer mode" anahtarı).
4. "Load unpacked" (Paketlenmemiş yükle) butonuna tıklayın.
5. İndirdiğiniz klasörü seçin.

## Kullanım

1. Eklenti kurulduktan sonra, YouTube'da bir video açın.
2. Eklenti simgesine tıklayarak ayarlar panelini açın.
3. Eklentiyi etkinleştirin ve tercih ettiğiniz ayarları yapın:
   - Ses cinsiyet seçimi (kadın/erkek)
   - Orijinal ses seviyesi ayarı
   - Çeviri modu (gerçek zamanlı/ön işleme)
4. Ayarlarınızı kaydedin ve videoyu izleyin.

## Teknik Detaylar

Bu eklenti aşağıdaki teknolojileri kullanır:

- Chrome Extension API
- Web Audio API (ses işleme için)
- Google Translate API (metin çevirisi için)
- Google Text-to-Speech API (ses sentezi için)

## Sınırlamalar

- Şu anda eklenti, ücretsiz Google Translate ve TTS API'lerinin kısıtlamaları nedeniyle uzun videoları ön işleme modunda tam olarak işleyemeyebilir.
- Gerçek zamanlı çeviri modunda, internet bağlantınızın kalitesine bağlı olarak gecikmeler olabilir.

## Lisans

MIT Lisansı
