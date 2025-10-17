import * as React from "react"
import { EnhancedToast } from "./enhanced-toast"
import { useToast } from "./use-toast"

export function EnhancedToaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <EnhancedToast
          key={toast.id}
          id={toast.id}
          variant={toast.variant as any}
          title={toast.title}
          description={toast.description}
          open={toast.open}
          onOpenChange={toast.onOpenChange}
          duration={toast.duration || 5000}
          className={toast.className}
        />
      ))}
    </div>
  )
}
