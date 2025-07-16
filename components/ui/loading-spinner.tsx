import { cn } from "@/lib/utils"

const LoadingSpinner = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900",
        className
      )}
    ></div>
  )
}

export default LoadingSpinner