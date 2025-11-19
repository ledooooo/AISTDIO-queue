import { AppSettings } from "../types";

// Helper to generate list of audio files needed for a number
export const getArabicNumberAudioKeys = (num: number): string[] => {
  if (num === 0) return ['0'];
  
  const files: string[] = [];
  
  const thousands = Math.floor(num / 1000);
  const remainder1000 = num % 1000;
  const hundreds = Math.floor(remainder1000 / 100);
  const remainder100 = remainder1000 % 100;
  
  if (thousands > 0) {
    if (thousands === 1) files.push('1000');
    else if (thousands === 2) files.push('2000');
    else {
        files.push(thousands.toString());
        files.push('1000'); 
    }
  }

  if (thousands > 0 && remainder1000 > 0) files.push('wa');

  if (hundreds > 0) {
    if (hundreds === 1) files.push('100');
    else if (hundreds === 2) files.push('200');
    else files.push((hundreds * 100).toString());
  }

  if (hundreds > 0 && remainder100 > 0) files.push('wa');

  if (remainder100 > 0) {
    if (remainder100 < 20) {
      files.push(remainder100.toString());
    } else {
      const units = remainder100 % 10;
      const tens = Math.floor(remainder100 / 10) * 10;
      
      if (units > 0) {
        files.push(units.toString());
        files.push('wa');
      }
      files.push(tens.toString());
    }
  }
  
  return files;
};

// The Text-to-Speech Engine
const playTTS = (text: string, rate: number = 1.0) => {
  if (!('speechSynthesis' in window)) return;

  // Cancel any existing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = rate;
  utterance.pitch = 1;
  
  // Find a good Arabic voice if available
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => v.lang.includes('ar'));
  if (arabicVoice) utterance.voice = arabicVoice;

  window.speechSynthesis.speak(utterance);
};

// The File-Based Player
const playFileSequence = async (files: string[], basePath: string) => {
    console.log(`Playing sequence from ${basePath}:`, files);
    
    // Ensure basePath ends with a slash
    const path = basePath.endsWith('/') ? basePath : `${basePath}/`;

    // Helper to play a single file returning a promise
    const playFile = (fileName: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const url = `${path}${fileName}.mp3`;
            const audio = new Audio(url);
            
            audio.onended = () => resolve();
            audio.onerror = (e) => {
                console.warn(`Audio file missing or failed: ${url}`, e);
                resolve(); // Skip missing files instead of crashing sequence
            };
            
            audio.play().catch(e => {
                console.warn(`Playback prevented for ${url}:`, e);
                resolve();
            });
        });
    };

    // Play sequentially
    for (const file of files) {
        await playFile(file);
    }
    
    return true;
};

// Professional Announcement Chime (Ding)
const playDing = (): Promise<void> => {
    return new Promise((resolve) => {
        // Using a better "Airport Chime" sound
        const ding = new Audio('https://cdn.freesound.org/previews/265/265549_4486188-lq.mp3');
        ding.volume = 0.6;
        ding.onended = () => resolve();
        ding.onerror = () => resolve(); // Proceed even if ding fails
        ding.play().then(() => {}).catch(() => resolve()); // Resolve immediately if play fails
    });
}

export const announceTicket = async (ticketNumber: number, clinicName: string, settings: AppSettings) => {
  await playDing();
  
  // Small delay after ding
  await new Promise(r => setTimeout(r, 800));

  if (settings.audioMode === 'TTS') {
    const text = `عميل رقم ${ticketNumber}، التوجه إلى ${clinicName}`;
    playTTS(text, settings.speechRate);
  } else {
    const numberKeys = getArabicNumberAudioKeys(ticketNumber);
    // Sequence: "client_number" -> [numbers] -> "proceed_to" -> [clinic_name]
    const playlist = [
      'client_number', // "على العميل رقم"
      ...numberKeys,
      'proceed_to',    // "التوجه الى عيادة"
      `clinic_${clinicName.replace(/\s/g, '_')}` // "باطنية"
    ];
    
    playFileSequence(playlist, settings.audioBasePath);
  }
};

export const announceReset = async (settings: AppSettings) => {
    await playDing();
    await new Promise(r => setTimeout(r, 500));

    if (settings.audioMode === 'TTS') {
        playTTS("تمت إعادة التعيين", settings.speechRate);
    } else {
        // Plays 'reset.mp3'
        playFileSequence(['reset'], settings.audioBasePath);
    }
}

export const announceCustom = async (text: string, settings: AppSettings) => {
    await playDing();
    await new Promise(r => setTimeout(r, 500));
    playTTS(text, settings.speechRate);
}

export const playRecording = async (blobUrl: string) => {
     await playDing();
     await new Promise(r => setTimeout(r, 500));
     const audio = new Audio(blobUrl);
     audio.play().catch(e => console.error("Recording play failed", e));
}