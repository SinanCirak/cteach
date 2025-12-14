import { createContext, useContext, useState, ReactNode } from 'react'

interface TooltipContextType {
  activeTooltip: string | null
  setActiveTooltip: (word: string | null) => void
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined)

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  return (
    <TooltipContext.Provider value={{ activeTooltip, setActiveTooltip }}>
      {children}
    </TooltipContext.Provider>
  )
}

export function useTooltip() {
  const context = useContext(TooltipContext)
  if (context === undefined) {
    throw new Error('useTooltip must be used within a TooltipProvider')
  }
  return context
}



