import WordTooltip from './WordTooltip'
import { getTranslation } from '../utils/translations'

interface ClickableTextProps {
  text: string
}

export default function ClickableText({ text }: ClickableTextProps) {
  // Split text into words, preserving punctuation and spaces
  const parts = text.split(/(\s+|[.,!?;:()"])/)
  
  return (
    <>
      {parts.map((part, index) => {
        // Skip empty strings and pure whitespace
        if (!part.trim() && part !== ' ') {
          return <span key={index}>{part}</span>
        }
        
        // Clean word for translation lookup
        const cleanWord = part.toLowerCase().replace(/[.,!?;:()"]/g, '').trim()
        const translation = cleanWord ? getTranslation(cleanWord) : null
        
        // If we have a translation, wrap in WordTooltip
        if (translation && cleanWord.length > 0) {
          return (
            <WordTooltip key={index} word={cleanWord} translation={translation}>
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

