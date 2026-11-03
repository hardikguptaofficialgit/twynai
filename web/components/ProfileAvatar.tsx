"use client";

type ProfileAvatarProps = {
  seed?: string;
  image?: string;
  size?: number;
  className?: string;
  alt?: string;
  style?: AvatarStyle;
};

export type AvatarStyle = "notionists-neutral" | "adventurer-neutral" | "bottts-neutral";

export function profileAvatarUrl(seed: string, style: AvatarStyle = "notionists-neutral") {
  const value = seed.trim() || "Twyn";
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(value)}&backgroundColor=d9cdf6&radius=50&scale=90`;
}

export function ProfileAvatar({ seed = "Twyn", image, size = 40, className = "", alt = "", style = "notionists-neutral" }: ProfileAvatarProps) {
  return <img src={image || profileAvatarUrl(seed, style)} alt={alt} width={size} height={size} className={`rounded-full object-cover ${className}`} referrerPolicy={image ? "no-referrer" : undefined} />;
}
