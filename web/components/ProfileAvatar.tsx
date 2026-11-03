"use client";

type ProfileAvatarProps = {
  seed?: string;
  image?: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function profileAvatarUrl(seed: string) {
  const value = seed.trim() || "Twyn";
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(value)}&backgroundColor=d9cdf6&fontFamily=Arial&fontWeight=600&fontSize=38&radius=50`;
}

export function ProfileAvatar({ seed = "Twyn", image, size = 40, className = "", alt = "" }: ProfileAvatarProps) {
  return <img src={image || profileAvatarUrl(seed)} alt={alt} width={size} height={size} className={`rounded-full object-cover ${className}`} referrerPolicy={image ? "no-referrer" : undefined} />;
}
