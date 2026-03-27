/**
 * مسارات صور الأفاتار الافتراضية حسب الجنس (public/images/)
 */
const DEFAULT_AVATAR_MALE = "/images/avatar-male.png"
const DEFAULT_AVATAR_FEMALE = "/images/avatar-female.png"

export function getDefaultAvatarForGender(gender?: "MALE" | "FEMALE" | null): string {
  return gender === "FEMALE" ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE
}
