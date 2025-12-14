/**
 * Extract unique words from text
 */
export function extractWords(text: string): string[] {
  // Remove punctuation and split into words
  const words = text
    .toLowerCase()
    .replace(/[.,!?;:()"'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && /^[a-z]+$/.test(word))
  
  // Return unique words
  return [...new Set(words)]
}

/**
 * Extract words from multiple text strings
 */
export function extractWordsFromTexts(texts: string[]): string[] {
  const allWords = texts.flatMap(text => extractWords(text))
  return [...new Set(allWords)]
}




