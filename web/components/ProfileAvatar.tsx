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

/** One cohesive avatar family, with many deterministic faces. */
export type AvatarStyle = "twyn-01" | "twyn-02" | "twyn-03" | "twyn-04" | "twyn-05" | "twyn-06" | "twyn-07" | "twyn-08" | "twyn-09" | "twyn-10" | "twyn-11" | "twyn-12" | "critters-01" | "critters-02" | "critters-03" | "critters-04" | "critters-05" | "critters-06" | "critters-07" | "critters-08" | "critters-09" | "critters-10" | "critters-11" | "critters-12";

export function profileAvatarUrl(seed: string, style: AvatarStyle = "twyn-01", _background = "d9cdf6") {
  const value = seed.trim() || "Twyn";
  if (style.startsWith("critters-")) {
    return `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(`${style}-${value}`)}&backgroundColor=f6f1eb&radius=50`;
  }
  // Waldrand's mirrored 5x5 grid is one cohesive pixel-art family; the selected
  // id gives users many deterministic faces without exposing style variants.
  return `https://avatar.waldrand.dev/${encodeURIComponent(`${style}-${value}`)}.svg?style=grid&radius=50&bg=f6f1eb`;
}

export function ProfileAvatar({ seed = "Twyn", image, size = 40, className = "", alt = "", style = "twyn-01", background = "d9cdf6" }: ProfileAvatarProps) {
  return <img src={image || profileAvatarUrl(seed, style, background)} alt={alt} width={size} height={size} className={`rounded-full object-cover ${className}`} referrerPolicy={image ? "no-referrer" : undefined} />;
}
