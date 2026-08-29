import Link from "next/link";
import { avatarUrl } from "../lib/avatar";

export function ProfileBadge({
  displayName,
  username,
  avatarSeed,
}: {
  displayName: string;
  username: string;
  avatarSeed?: string | null;
}) {
  return (
    <Link href="/profile" className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-paper/10 transition-colors">
      <img
        src={avatarUrl(avatarSeed || username || displayName, 72)}
        alt=""
        className="w-9 h-9 rounded-full bg-paper border border-paper/10"
      />
      <span className="hidden sm:block leading-tight text-left">
        <span className="block text-xs font-medium text-paper">{displayName}</span>
        <span className="block text-[10px] text-ash">@{username}</span>
      </span>
    </Link>
  );
}
