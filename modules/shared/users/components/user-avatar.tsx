import { UserIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

/** Placeholder until users have photos: a round avatar with a generic person icon. */
export function UserAvatar({
  size = "default",
}: {
  size?: React.ComponentProps<typeof Avatar>["size"]
}) {
  return (
    <Avatar size={size} aria-hidden="true">
      <AvatarFallback>
        <UserIcon className="size-1/2" />
      </AvatarFallback>
    </Avatar>
  )
}
