// Mock translation data - will be replaced with DynamoDB data
export const translations: Record<string, string> = {
  // Common words
  'I': 'Ben',
  'you': 'sen/siz',
  'he': 'o (erkek)',
  'she': 'o (kadın)',
  'it': 'o (cansız)',
  'we': 'biz',
  'they': 'onlar',
  'am': 'olmak (1. tekil)',
  'is': 'olmak (3. tekil)',
  'are': 'olmak (çoğul)',
  
  // Articles and determiners
  'the': 'belirli tanımlık',
  'a': 'bir (belirsiz)',
  'an': 'bir (belirsiz)',
  'this': 'bu',
  'that': 'şu, o',
  'these': 'bunlar',
  'those': 'şunlar, onlar',
  
  // Prepositions
  'in': 'içinde, -de/-da',
  'on': 'üzerinde, -de/-da',
  'at': '-de/-da, -e/-a',
  'to': '-e/-a, için',
  'for': 'için',
  'with': 'ile, birlikte',
  'from': '-den/-dan',
  'of': '-in/-ın, -nin/-nın',
  'by': 'tarafından, ile',
  'about': 'hakkında',
  'through': 'boyunca, aracılığıyla',
  
  // Verbs
  'work': 'çalışmak',
  'works': 'çalışır',
  'play': 'oynamak',
  'plays': 'oynar',
  'drink': 'içmek',
  'drinks': 'içer',
  'study': 'çalışmak, okumak',
  'studying': 'çalışıyor',
  'read': 'okumak',
  'reading': 'okuyor',
  'build': 'inşa etmek',
  'building': 'inşa ediyor',
  'go': 'gitmek',
  'going': 'gidiyor',
  'meet': 'buluşmak',
  'meeting': 'buluşuyor',
  'stay': 'kalmak',
  'staying': 'kalıyor',
  'get': 'almak, olmak',
  'getting': 'oluyor',
  
  // Nouns
  'hospital': 'hastane',
  'coffee': 'kahve',
  'morning': 'sabah',
  'tennis': 'tenis',
  'weekend': 'hafta sonu',
  'water': 'su',
  'book': 'kitap',
  'house': 'ev',
  'cinema': 'sinema',
  'tonight': 'bu gece',
  'friends': 'arkadaşlar',
  'week': 'hafta',
  'tomorrow': 'yarın',
  'weather': 'hava',
  'warmer': 'daha sıcak',
  'sun': 'güneş',
  'rises': 'doğar',
  'east': 'doğu',
  'train': 'tren',
  'leaves': 'ayrılır, kalkar',
  'school': 'okul',
  'starts': 'başlar',
  'September': 'Eylül',
  
  // Adjectives and others
  'every': 'her',
  'right': 'doğru, sağ',
  'now': 'şimdi',
  'new': 'yeni',
  'English': 'İngilizce',
  'degrees': 'derece',
  'Celsius': 'Celsius',
  '100': 'yüz',
  'had': 'sahipti, vardı',
  'has': 'sahip (3. tekil)',
  'have': 'sahip olmak',
  'five': 'beş',
  'languages': 'diller',
  'speak': 'konuşmak',
  'travels': 'seyahat eder',
  'business': 'iş',
  'was': 'idi, oldu',
  'noticed': 'fark edildi',
  'everyone': 'herkes',
  'confidence': 'güven',
  'plants': 'bitkiler',
  'roots': 'kökler',
  'love': 'aşk, sevgi',
  'concept': 'kavram',
  'region': 'bölge',
  'natural': 'doğal',
  'resources': 'kaynaklar',
  'impressive': 'etkileyici',
  'record': 'kayıt, sicil',
  'accept': 'kabul etmek',
  'invitation': 'davet',
  'car': 'araba',
  'snow': 'kar',
}

// Function to get translation for a word
export function getTranslation(word: string): string | null {
  const cleanWord = word.toLowerCase().replace(/[.,!?;:"]/g, '')
  return translations[cleanWord] || null
}

// Function to split text into words and create clickable words
export function parseTextWithTranslations(text: string): Array<{ text: string; isWord: boolean; word?: string }> {
  const words = text.split(/(\s+|[.,!?;:])/)
  return words.map(part => {
    const cleanPart = part.trim()
    if (!cleanPart) return { text: part, isWord: false }
    
    const cleanWord = cleanPart.toLowerCase().replace(/[.,!?;:"]/g, '')
    if (translations[cleanWord]) {
      return { text: part, isWord: true, word: cleanWord }
    }
    return { text: part, isWord: false }
  })
}

