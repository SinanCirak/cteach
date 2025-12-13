import WordTooltip from './WordTooltip'

interface ClickableTextProps {
  text: string
}

export default function ClickableText({ text }: ClickableTextProps) {
  // Split text into words, preserving punctuation and spaces
  const parts = text.split(/(\s+|[.,!?;:()"])/)
  
  // Simple word detection - make all words clickable
  const isWord = (part: string): boolean => {
    const cleaned = part.toLowerCase().replace(/[.,!?;:()"]/g, '').trim()
    // Only make clickable if it's a real word (letters only, at least 2 chars)
    return /^[a-z]{2,}$/.test(cleaned)
  }
  
  return (
    <>
      {parts.map((part, index) => {
        // Skip empty strings and pure whitespace
        if (!part.trim() && part !== ' ') {
          return <span key={index}>{part}</span>
        }
        
        // Clean word for checking
        const cleanWord = part.toLowerCase().replace(/[.,!?;:()"]/g, '').trim()
        
        // If it's a valid word, make it clickable (will use AWS Translate)
        if (isWord(part) && cleanWord.length > 0) {
          // Use index as key, WordTooltip will generate its own unique ID
          return (
            <WordTooltip key={`${cleanWord}_${index}_${Date.now()}`} word={cleanWord}>
              {part}
            </WordTooltip>
          )
        }
        
        // Otherwise, just render the text
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

