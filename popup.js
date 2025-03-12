document.addEventListener('DOMContentLoaded', function() {
  // Elementleri seçelim
  const enableExtensionToggle = document.getElementById('enableExtension');
  const voiceGenderSelect = document.getElementById('voiceGender');
  const originalVolumeSlider = document.getElementById('originalVolume');
  const volumeValueSpan = document.getElementById('volumeValue');
  const translationModeSelect = document.getElementById('translationMode');
  const saveSettingsButton = document.getElementById('saveSettings');
  const statusElement = document.getElementById('status');
  const detectedLanguageElement = document.getElementById('detectedLanguage');
  const videoTitleElement = document.getElementById('videoTitle');

  // Ses seviyesi değiştiğinde değeri güncelle
  originalVolumeSlider.addEventListener('input', function() {
    volumeValueSpan.textContent = this.value + '%';
  });

  // Ayarları kaydet butonu işlevi
  saveSettingsButton.addEventListener('click', function() {
    const settings = {
      enabled: enableExtensionToggle.checked,
      voiceGender: voiceGenderSelect.value,
      originalVolume: originalVolumeSlider.value,
      translationMode: translationModeSelect.value
    };

    chrome.storage.sync.set({ settings: settings }, function() {
      updateStatus('Ayarlar kaydedildi', 'success');
      
      // Content script'e ayarların değiştiğini bildir
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated', settings: settings });
      });
    });
  });

  // Ayarları yükle
  function loadSettings() {
    chrome.storage.sync.get('settings', function(data) {
      if (data.settings) {
        enableExtensionToggle.checked = data.settings.enabled;
        voiceGenderSelect.value = data.settings.voiceGender;
        originalVolumeSlider.value = data.settings.originalVolume;
        volumeValueSpan.textContent = data.settings.originalVolume + '%';
        translationModeSelect.value = data.settings.translationMode;
        
        updateStatus(data.settings.enabled ? 'Etkin' : 'Devre Dışı', 
                    data.settings.enabled ? 'success' : 'inactive');
      } else {
        // Varsayılan ayarları kaydet
        saveSettingsButton.click();
      }
    });
  }

  // Aktif sekmedeki video bilgilerini al
  function getCurrentVideoInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getVideoInfo' }, function(response) {
        if (response && response.videoInfo) {
          detectedLanguageElement.textContent = response.videoInfo.language || 'Algılanamadı';
          videoTitleElement.textContent = response.videoInfo.title || 'Bilinmiyor';
        } else {
          detectedLanguageElement.textContent = 'YouTube videosu bulunamadı';
          videoTitleElement.textContent = '-';
        }
      });
    });
  }

  // Durum mesajını güncelle
  function updateStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = 'status-value ' + (type || '');
    
    if (type === 'success') {
      statusElement.style.color = '#4caf50';
    } else if (type === 'inactive') {
      statusElement.style.color = '#9e9e9e';
    } else if (type === 'error') {
      statusElement.style.color = '#f44336';
    } else {
      statusElement.style.color = '#1a73e8';
    }
  }

  // Sayfa açıldığında ayarları yükle
  loadSettings();
  
  // Video bilgilerini al
  getCurrentVideoInfo();
  
  // YouTube sayfasını dinle
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'videoInfoUpdated') {
      detectedLanguageElement.textContent = request.videoInfo.language || 'Algılanamadı';
      videoTitleElement.textContent = request.videoInfo.title || 'Bilinmiyor';
    }
  });
});
