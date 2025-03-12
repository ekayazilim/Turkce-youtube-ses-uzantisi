// YouTube Türkçe Seslendirme Eklentisi - Content Script

// Eklenti durumu
let extensionEnabled = true; // Varsayılan olarak aktif
let settings = {
  voiceGender: 'female',
  originalVolume: 20,
  translationMode: 'realtime'
};

// Video işleme durumu
let videoState = {
  isProcessing: false,
  detectedLanguage: null,
  videoTitle: null,
  transcriptData: null,
  translatedAudio: null,
  currentVideoId: null
};

// DOM elementleri
let youtubePlayer = null;
let audioContext = null;
let gainNode = null;
let translationAudioElement = null;
let overlayContainer = null;

// Eklenti başlatma
function initializeExtension() {
  console.log('YouTube Türkçe Seslendirme eklentisi başlatılıyor...');
  
  // Ayarları yükle
  chrome.storage.sync.get('settings', function(data) {
    if (data.settings) {
      settings = data.settings;
      // Eklenti her zaman aktif olmalı
      extensionEnabled = true;
      
      // Arayüzü hemen kur ve oynatıcıyı gözlemle
      setupOverlay();
      observeYouTubePlayer();
    } else {
      // Varsayılan ayarları oluştur ve aktif et
      const defaultSettings = {
        enabled: true,
        voiceGender: 'female',
        originalVolume: 20,
        translationMode: 'realtime'
      };
      
      chrome.storage.sync.set({ settings: defaultSettings }, function() {
        settings = defaultSettings;
        extensionEnabled = true;
        setupOverlay();
        observeYouTubePlayer();
      });
    }
  });
  
  // Ayar değişikliklerini dinle
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'settingsUpdated') {
      settings = request.settings;
      // Eklenti her zaman aktif olmalı
      extensionEnabled = true;
      
      // Ayarlar güncellendi, sesi ayarla
      updateOriginalVolume();
      
      sendResponse({success: true});
    } else if (request.action === 'getVideoInfo') {
      sendResponse({
        videoInfo: {
          language: videoState.detectedLanguage || 'Henüz algılanmadı',
          title: videoState.videoTitle || getCurrentVideoTitle()
        }
      });
    }
    return true;
  });
}

// YouTube player'ı gözlemle
function observeYouTubePlayer() {
  // YouTube video player'ını bul
  const checkForYouTubePlayer = setInterval(() => {
    youtubePlayer = document.querySelector('video.html5-main-video');
    
    if (youtubePlayer) {
      clearInterval(checkForYouTubePlayer);
      console.log('YouTube video oynatıcısı bulundu');
      
      // Video başlığını al
      videoState.videoTitle = getCurrentVideoTitle();
      videoState.currentVideoId = getYouTubeVideoId(window.location.href);
      
      // Ses işleme kurulumu
      setupAudioProcessing();
      
      // Video olaylarını dinle
      youtubePlayer.addEventListener('play', onVideoPlay);
      youtubePlayer.addEventListener('pause', onVideoPause);
      youtubePlayer.addEventListener('seeked', onVideoSeeked);
      
      // Sayfa değişikliklerini izle (video değiştiğinde)
      observePageChanges();
      
      // Video bulunduğunda hemen işleme başla
      detectVideoLanguage();
      
      // Video oynatılıyorsa hemen çeviriyi başlat
      if (!youtubePlayer.paused) {
        onVideoPlay();
      }
    }
  }, 500); // Daha hızlı kontrol
}

// Sayfa değişikliklerini izleme (video değişimi için)
function observePageChanges() {
  // YouTube'un dinamik sayfa yüklemelerini izlemek için
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'content' || 
          mutation.target.id === 'page-manager' ||
          mutation.target.nodeName === 'YTD-WATCH-FLEXY') {
        shouldCheck = true;
      }
    });
    
    if (shouldCheck) {
      setTimeout(() => {
        // URL değişti mi kontrol et
        const currentVideoId = getYouTubeVideoId(window.location.href);
        if (currentVideoId && currentVideoId !== videoState.currentVideoId) {
          console.log('Yeni video tespit edildi:', currentVideoId);
          videoState.currentVideoId = currentVideoId;
          videoState.videoTitle = getCurrentVideoTitle();
          videoState.detectedLanguage = null;
          videoState.transcriptData = null;
          videoState.translatedAudio = null;
          
          // Yeni video için işlemleri hemen başlat
          if (youtubePlayer) {
            detectVideoLanguage();
            notifyPopupVideoInfoUpdated();
            
            // Video oynatılıyorsa hemen çeviriyi başlat
            if (!youtubePlayer.paused) {
              onVideoPlay();
            }
          }
        }
      }, 500); // Daha hızlı kontrol
    }
  });
  
  // Tüm sayfa değişikliklerini izle
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Ses işleme için Web Audio API kurulumu
function setupAudioProcessing() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      
      // Media elementlerine bağlan
      const source = audioContext.createMediaElementSource(youtubePlayer);
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Orijinal ses seviyesini ayarla
      updateOriginalVolume();
      
      console.log('Ses işleme başarıyla kuruldu');
    } catch (error) {
      console.error('Ses işleme kurulumu başarısız:', error);
    }
  }
}

// Orijinal ses seviyesini güncelle
function updateOriginalVolume() {
  if (gainNode) {
    const volume = settings.originalVolume / 100;
    gainNode.gain.value = volume;
    console.log('Orijinal ses seviyesi ayarlandı:', volume);
  }
}

// Video oynatma olayı
function onVideoPlay() {
  console.log('Video oynatılıyor');
  
  // Dil algılama ve çeviri işlemini başlat
  if (!videoState.detectedLanguage) {
    detectVideoLanguage();
  }
  
  // Çeviri moduna göre işlem yap - hemen başlat
  if (settings.translationMode === 'realtime') {
    performRealTimeTranslation();
  } else if (videoState.translatedAudio) {
    playTranslatedAudio();
  } else if (!videoState.isProcessing) {
    preprocessVideo();
  }
}

// Video duraklatma olayı
function onVideoPause() {
  console.log('Video duraklatıldı');
  
  // Çeviri sesini de duraklat
  if (translationAudioElement) {
    translationAudioElement.pause();
  }
}

// Video ilerleme olayı
function onVideoSeeked() {
  console.log('Video ilerledi');
  
  // Çeviri sesini yeni pozisyona getir
  if (translationAudioElement && videoState.translatedAudio) {
    // Çeviriyi yeni konumdan başlat
    restartTranslationFromCurrentPosition();
  }
}

// Geçerli konumdan çeviriyi yeniden başlat
function restartTranslationFromCurrentPosition() {
  // Gerçek uygulamada, videodan geçerli zamana göre
  // çeviriyi yeniden senkronize edecek kod
  if (translationAudioElement) {
    // Video konumunu al
    const currentTime = youtubePlayer.currentTime;
    // Çeviri ses dosyasını uygun konuma getir ve oynat
    // Bu sadece bir simülasyon
  }
}

// YouTube video kimliğini al
function getYouTubeVideoId(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('v');
}

// Geçerli video başlığını al
function getCurrentVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer');
  return titleElement ? titleElement.textContent.trim() : '';
}

// Video dilini algıla
function detectVideoLanguage() {
  if (videoState.isProcessing) return;
  
  videoState.isProcessing = true;
  updateOverlayStatus('Dil algılanıyor...');
  
  // Gerçek uygulamada burada video dilini otomatik algılama 
  // API'si kullanılacak. Şimdilik varsayılan olarak İngilizce kabul ediyoruz.
  
  setTimeout(() => {
    // Simüle edilmiş dil algılama (gerçek uygulamada API kullanılacak)
    videoState.detectedLanguage = 'İngilizce';
    videoState.isProcessing = false;
    
    console.log('Algılanan dil:', videoState.detectedLanguage);
    updateOverlayStatus('Dil algılandı: ' + videoState.detectedLanguage);
    
    // Popup'a bilgi gönder
    notifyPopupVideoInfoUpdated();
    
    // Otomatik olarak çeviriyi başlat
    if (settings.translationMode === 'preprocess') {
      if (!videoState.translatedAudio) {
        preprocessVideo();
      }
    } else {
      performRealTimeTranslation();
    }
  }, 1000); // Hızlı algılama
}

// Gerçek zamanlı çeviri
function performRealTimeTranslation() {
  if (!videoState.detectedLanguage || videoState.isProcessing) return;
  
  updateOverlayStatus('Gerçek zamanlı Türkçe çeviri yapılıyor...');
  
  // Gerçek uygulamada burada konuşma tanıma, çeviri ve 
  // TTS API'leri kullanılacak. Bu sadece bir simülasyon.
  
  // Gercek bir uygulama için:
  // 1. Ses akışını Web Audio API ile yakalama
  // 2. Speech-to-Text API ile metne çevirme
  // 3. Translate API ile Türkçe'ye çevirme
  // 4. TTS API ile seslendirme
  // 5. Orijinal ses üzerine bindirme
  
  // Basit simülasyon: gerçek çeviri yerine sadece sabit bir TTS sesi çalacağız
  if (!translationAudioElement) {
    translationAudioElement = new Audio();
    // Bu sadece test amaçlı - gerçek uygulamada dinamik çeviri yapılacak
    translationAudioElement.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=tr&q=Merhaba%20bu%20video%20%C5%9Fu%20anda%20T%C3%BCrk%C3%A7e%20seslendirilmektedir';
    translationAudioElement.volume = 1.0;
    translationAudioElement.play();
  }
}

// Video ön işleme
function preprocessVideo() {
  if (videoState.isProcessing || !videoState.detectedLanguage) return;
  
  videoState.isProcessing = true;
  updateOverlayStatus('Video Türkçe seslendirme için işleniyor...');
  
  // Gerçek uygulamada burada video ses kaydı alınır, 
  // çeviri yapılır ve TTS ile seslendirme yapılır
  
  setTimeout(() => {
    // Simüle edilmiş çeviri tamamlama (gerçek uygulamada API kullanılacak)
    videoState.translatedAudio = 'simulated-audio-data';
    videoState.isProcessing = false;
    
    console.log('Video işleme tamamlandı');
    updateOverlayStatus('Türkçe seslendirme hazır');
    
    // Çevrilen sesi hemen oynat
    if (!youtubePlayer.paused) {
      playTranslatedAudio();
    }
  }, 2000); // Hızlı işlem
}

// Çevrilen sesi oynat
function playTranslatedAudio() {
  if (!videoState.translatedAudio) return;
  
  console.log('Türkçe seslendirme oynatılıyor');
  updateOverlayStatus('Türkçe seslendirme oynatılıyor');
  
  // Gerçek uygulamada burada çevrilen ses dosyası oynatılacak
  // Bu sadece bir simülasyon
  if (!translationAudioElement) {
    translationAudioElement = new Audio();
    // Bu sadece test amaçlı - gerçek uygulamada çevrilmiş ses kullanılacak
    translationAudioElement.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=tr&q=%C3%96n%20i%C5%9Fleme%20tamamland%C4%B1%20T%C3%BCrk%C3%A7e%20seslendirme%20ba%C5%9Fl%C4%B1yor';
    translationAudioElement.volume = 1.0;
    translationAudioElement.play();
  }
}

// Arayüz oluşturma
function setupOverlay() {
  if (overlayContainer) return;
  
  // Eklenti Overlay'ını oluştur
  overlayContainer = document.createElement('div');
  overlayContainer.className = 'yt-translator-overlay';
  overlayContainer.innerHTML = `
    <div class="yt-translator-status">
      <div class="yt-translator-icon">🎙️</div>
      <div class="yt-translator-text">YouTube Türkçe Seslendirme Aktif</div>
    </div>
  `;
  
  // CSS ekle
  const style = document.createElement('style');
  style.textContent = `
    .yt-translator-overlay {
      position: fixed;
      bottom: 70px;
      right: 20px;
      z-index: 9999;
      background-color: rgba(33, 33, 33, 0.8);
      border-radius: 8px;
      padding: 10px 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      color: white;
      font-family: 'YouTube Sans', 'Roboto', sans-serif;
      display: flex;
      align-items: center;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .yt-translator-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .yt-translator-icon {
      font-size: 20px;
    }
    
    .yt-translator-text {
      font-size: 14px;
      font-weight: 500;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(overlayContainer);
  
  console.log('Eklenti arayüzü oluşturuldu');
}

// Overlay durum mesajını güncelle
function updateOverlayStatus(message) {
  if (!overlayContainer) return;
  
  const statusTextElement = overlayContainer.querySelector('.yt-translator-text');
  if (statusTextElement) {
    statusTextElement.textContent = message;
  }
}

// Popup'a video bilgilerini gönder
function notifyPopupVideoInfoUpdated() {
  chrome.runtime.sendMessage({
    action: 'videoInfoUpdated',
    videoInfo: {
      language: videoState.detectedLanguage,
      title: videoState.videoTitle
    }
  });
}

// Eklentiyi temizle
function cleanupExtension() {
  console.log('Eklenti temizleniyor...');
  
  // Event listener'ları kaldır
  if (youtubePlayer) {
    youtubePlayer.removeEventListener('play', onVideoPlay);
    youtubePlayer.removeEventListener('pause', onVideoPause);
    youtubePlayer.removeEventListener('seeked', onVideoSeeked);
  }
  
  // Ses işlemeyi resetle
  if (gainNode) {
    gainNode.gain.value = 1.0; // Normal ses seviyesine geri döndür
  }
  
  // Arayüzü kaldır
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
  
  // Durumu sıfırla
  videoState = {
    isProcessing: false,
    detectedLanguage: null,
    videoTitle: null,
    transcriptData: null,
    translatedAudio: null,
    currentVideoId: null
  };
}

// Eklentiyi başlat
initializeExtension();
