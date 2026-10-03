import { getSanityAdminClient } from "@/lib/sanity-admin";

type CouponRecord = {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  active?: boolean;
  startsAt?: string;
  expiresAt?: string;
  maxUses?: number;
  usageCount?: number;
};

export type DiscountResult =
  | { valid: true; couponId: string; code: string; discountAmount: number }
  | { valid: false; error: string };

export async function calculateDiscount(codeValue: string, subtotal: number): Promise<DiscountResult> {
  const code = codeValue.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code) || !Number.isInteger(subtotal) || subtotal < 1) {
    return { valid: false, error: "This discount code is invalid or unavailable." };
  }
  const client = getSanityAdminClient();
  if (!client) return { valid: false, error: "Discount codes are temporarily unavailable." };

  const coupon = await client.fetch<CouponRecord | null>(`*[_type == "coupon" && upper(code) == $code][0]{_id, code, discountType, discountValue, active, startsAt, expiresAt, maxUses, usageCount}`, { code });
  const now = Date.now();
  if (!coupon || (coupon.discountType !== "percentage" && coupon.discountType !== "fixed") || coupon.active === false || (coupon.startsAt && Date.parse(coupon.startsAt) > now) || (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now) || (coupon.maxUses && (coupon.usageCount ?? 0) >= coupon.maxUses)) {
    return { valid: false, error: "This discount code is invalid or unavailable." };
  }

  if (!Number.isFinite(coupon.discountValue) || coupon.discountValue <= 0 || (coupon.discountType === "percentage" && coupon.discountValue > 100)) return { valid: false, error: "This discount code is invalid or unavailable." };
  const discountAmount = coupon.discountType === "percentage"
    ? Math.floor(subtotal * Math.min(coupon.discountValue, 100) / 100)
    : Math.min(subtotal, Math.round(coupon.discountValue * 100));
  if (!discountAmount) return { valid: false, error: "This discount code does not apply to this order." };
  return { valid: true, couponId: coupon._id, code: coupon.code, discountAmount };
}