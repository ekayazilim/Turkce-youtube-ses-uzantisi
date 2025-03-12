// YouTube Türkçe Seslendirme Eklentisi - Background Script

// Eklenti ilk yüklendiğinde veya güncellendiğinde
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Eklenti yüklendi:', details.reason);
  
  // Varsayılan ayarları kaydet
  const defaultSettings = {
    enabled: true,
    voiceGender: 'female',
    originalVolume: 20,
    translationMode: 'realtime'
  };
  
  chrome.storage.sync.get('settings', function(data) {
    if (!data.settings) {
      chrome.storage.sync.set({ settings: defaultSettings }, function() {
        console.log('Varsayılan ayarlar kaydedildi');
      });
    }
  });
});

// Tarayıcı sekmesi değiştiğinde veya YouTube sayfası yüklendiğinde eklenti simgesini güncelle
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // YouTube video sayfasında, eklenti simgesini etkinleştir
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        16: 'images/icon16.svg',
        48: 'images/icon48.svg',
        128: 'images/icon128.svg'
      }
    });
  } else if (changeInfo.status === 'complete' && tab.url) {
    // YouTube video sayfası değilse, eklenti simgesini gri yap
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        16: 'images/icon16_disabled.svg',
        48: 'images/icon48_disabled.svg',
        128: 'images/icon128_disabled.svg'
      }
    });
  }
});

// Google Translate API ile metin çevirisi için yardımcı fonksiyon
async function translateText(text, sourceLang, targetLang = 'tr') {
  try {
    // Google Translate API'nin ücretsiz versiyonu için URL
    // NOT: Bu yöntem Google'ın resmi API'si değil, ücretsiz çözümü simüle etmek içindir
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Yanıt formatı: [[["çeviri","orijinal metin",null,null,1]],null,"en"]
    let translation = '';
    if (data && data[0]) {
      data[0].forEach(item => {
        translation += item[0];
      });
    }
    
    return translation;
  } catch (error) {
    console.error('Çeviri hatası:', error);
    return null;
  }
}

// Google TTS API ile konuşma sentezi için yardımcı fonksiyon
function getGoogleTTSUrl(text, lang = 'tr', gender = 'female') {
  // Google TTS API için parametreler
  const voice = gender === 'female' ? 'tr-TR-Standard-A' : 'tr-TR-Standard-B';
  const encodedText = encodeURIComponent(text);
  
  // Google ücretsiz TTS servisinin URL'sini oluştur
  // NOT: Bu yöntem Google'ın resmi API'si değil, ücretsiz çözümü simüle etmek içindir
  // Gerçek uygulamada Google Cloud Text-to-Speech API kullanılabilir
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=tr&q=${encodedText}`;
}

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'translate') {
    // Metin çevirisi yap
    translateText(request.text, request.sourceLang)
      .then(translatedText => {
        sendResponse({ success: true, translatedText: translatedText });
      })
      .catch(error => {
        console.error('Çeviri yapılırken hata oluştu:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Asenkron yanıt için true döndür
  } else if (request.action === 'getTTS') {
    // TTS URL'sini oluştur
    const ttsUrl = getGoogleTTSUrl(request.text, 'tr', request.gender);
    sendResponse({ success: true, ttsUrl: ttsUrl });
    return false;
  }
});
