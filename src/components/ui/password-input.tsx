import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { EyeIcon, EyeOffIcon } from "lucide-react"

function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className={cn("relative", className)}>
      <Input
        type={showPassword ? "text" : "password"}
        className="pr-9"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((value) => !value)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {showPassword ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
