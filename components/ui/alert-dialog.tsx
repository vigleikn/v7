import * as React from "react"

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

const AlertDialogContent = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => (
  <div className={`bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 ${className}`}>
    {children}
  </div>
)

const AlertDialogHeader = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => (
  <div className={`space-y-2 ${className}`}>
    {children}
  </div>
)

const AlertDialogTitle = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => (
  <h2 className={`text-lg font-semibold ${className}`}>
    {children}
  </h2>
)

const AlertDialogDescription = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => (
  <p className={`text-sm text-muted-foreground ${className}`}>
    {children}
  </p>
)

const AlertDialogFooter = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => (
  <div className={`flex justify-end gap-2 mt-4 ${className}`}>
    {children}
  </div>
)

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 ${className || ''}`}
    {...props}
  />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground ${className || ''}`}
    {...props}
  />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
}

