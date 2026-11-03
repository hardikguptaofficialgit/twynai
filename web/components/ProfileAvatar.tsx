"use client";

type ProfileAvatarProps = {
  seed?: string;
  image?: string;
  size?: number;
  className?: string;
  alt?: string;
  style?: AvatarStyle;
  background?: string;
};

export type AvatarStyle = "lorelei-neutral" | "notionists-neutral" | "micah" | "big-smile" | "initial-face";

export function profileAvatarUrl(seed: string, style: AvatarStyle = "notionists-neutral", background = "d9cdf6") {
  const value = seed.trim() || "Twyn";
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(value)}&backgroundColor=${encodeURIComponent(background)}&radius=50&scale=10`;
}

export function ProfileAvatar({ seed = "Twyn", image, size = 40, className = "", alt = "", style = "notionists-neutral", background = "d9cdf6" }: ProfileAvatarProps) {
  return <img src={image || profileAvatarUrl(seed, style, background)} alt={alt} width={size} height={size} className={`rounded-full object-cover ${className}`} referrerPolicy={image ? "no-referrer" : undefined} />;
}
