import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        info: "border-blue-200 bg-white text-gray-900",
        error: "border-red-200 bg-white text-gray-900",
        warning: "border-yellow-200 bg-white text-gray-900",
        success: "border-green-200 bg-white text-gray-900",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const progressBarVariants = cva(
  "absolute bottom-0 left-0 h-1 transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        info: "bg-blue-500",
        error: "bg-red-500",
        warning: "bg-yellow-500",
        success: "bg-green-500",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const iconVariants = cva(
  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-sm",
  {
    variants: {
      variant: {
        info: "bg-blue-500",
        error: "bg-red-500",
        warning: "bg-yellow-500 border-2 border-gray-800 text-gray-800",
        success: "bg-green-500",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

interface EnhancedToastProps extends VariantProps<typeof toastVariants> {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
  className?: string
}

const EnhancedToast = React.forwardRef<HTMLDivElement, EnhancedToastProps>(
  ({ className, variant = "info", title, description, duration = 5000, ...props }, ref) => {
    const [progress, setProgress] = React.useState(100)
    const [isVisible, setIsVisible] = React.useState(true)

    React.useEffect(() => {
      if (!isVisible) return

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            setIsVisible(false)
            props.onOpenChange?.(false)
            return 0
          }
          return prev - (100 / (duration / 100))
        })
      }, 100)

      return () => clearInterval(interval)
    }, [duration, isVisible, props])

    const getIcon = () => {
      switch (variant) {
        case "info":
          return <Info className="w-4 h-4" />
        case "error":
          return <AlertCircle className="w-4 h-4" />
        case "warning":
          return <AlertTriangle className="w-4 h-4" />
        case "success":
          return <CheckCircle className="w-4 h-4" />
        default:
          return <Info className="w-4 h-4" />
      }
    }

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div className={cn(iconVariants({ variant }))}>
            {getIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <div className="text-sm font-medium text-gray-900 mb-1">
                {title}
              </div>
            )}
            {description && (
              <div className="text-sm text-gray-600">
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          className="absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 focus:outline-none group-hover:opacity-100"
          onClick={() => {
            setIsVisible(false)
            props.onOpenChange?.(false)
          }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className={cn(progressBarVariants({ variant }))}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }
)

EnhancedToast.displayName = "EnhancedToast"

export { EnhancedToast, toastVariants, progressBarVariants, iconVariants }
export type { EnhancedToastProps }
