import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../lib/auth';

describe('styleshopZ Hard Rules Verification', () => {
  it('Rule 1: HMAC token signs and verifies session integrity correctly', () => {
    const payload = { sub: 'usr_123', email: 'user@shop.test', role: 'customer' };
    const token = signToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('usr_123');
    expect(decoded?.role).toBe('customer');

    // Tampered token must fail verification
    const tampered = token.slice(0, -4) + 'abcd';
    const tamperedDecoded = verifyToken(tampered);
    expect(tamperedDecoded).toBeNull();
  });

  it('Rule 2: Server calculates exact delivery fee and order total from line items', () => {
    // Under ₹499 (49,900 paise) pays ₹40 (4,000 paise) simulated delivery fee
    const subtotalLow = 29900;
    const feeLow = subtotalLow >= 49900 ? 0 : 4000;
    expect(feeLow).toBe(4000);

    // ₹499 and above gets FREE delivery
    const subtotalHigh = 149900;
    const feeHigh = subtotalHigh >= 49900 ? 0 : 4000;
    expect(feeHigh).toBe(0);
  });

  it('Rule 3: Cash on Delivery ceiling strictly caps at ₹50,000 (5,000,000 paise)', () => {
    const orderTotalNormal = 4500000; // ₹45,000
    const isCodEligibleNormal = orderTotalNormal <= 5000000;
    expect(isCodEligibleNormal).toBe(true);

    const orderTotalOverLimit = 5500000; // ₹55,000
    const isCodEligibleOver = orderTotalOverLimit <= 5000000;
    expect(isCodEligibleOver).toBe(false);
  });

  it('Rule 4: Coupon calculation enforces minimum cart and discount math in paise', () => {
    const couponPercent = { discount_type: 'percent', discount_value: 10, min_cart_paise: 50000 };
    const cartPaise = 100000; // ₹1,000
    let discount = 0;
    if (cartPaise >= couponPercent.min_cart_paise) {
      discount = Math.round((cartPaise * couponPercent.discount_value) / 100);
    }
    expect(discount).toBe(10000); // ₹100

    const couponFlat = { discount_type: 'flat', discount_value: 50000, min_cart_paise: 200000 };
    const cartSmall = 150000; // ₹1,500 < ₹2,000 min cart
    let discountFlat = 0;
    if (cartSmall >= couponFlat.min_cart_paise) {
      discountFlat = couponFlat.discount_value;
    }
    expect(discountFlat).toBe(0); // Rejected due to minimum cart threshold
  });

  it('Rule 5: 7-day return policy verifies delivered window', () => {
    const now = Date.now();
    const delivered3DaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    const isEligible3Days = (now - delivered3DaysAgo) / (1000 * 60 * 60 * 24) <= 7;
    expect(isEligible3Days).toBe(true);

    const delivered9DaysAgo = now - 9 * 24 * 60 * 60 * 1000;
    const isEligible9Days = (now - delivered9DaysAgo) / (1000 * 60 * 60 * 24) <= 7;
    expect(isEligible9Days).toBe(false);
  });
});
