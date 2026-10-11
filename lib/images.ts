/**
 * Resolves real, high-resolution product and category photography
 * bundled directly in public/photos/
 */
export function getProductImage(title = '', category = ''): string {
  const kind = category.toLowerCase();
  if (kind.includes('headphone')) return '/photos/products/sony-headphones-black.webp';
  if (kind.includes('earbud')) return '/photos/products/bose-earbuds-gold.webp';
  if (kind.includes('smartphone') || kind.includes('mobile')) return '/photos/products/smartphone-generated.png';
  if (kind.includes('smartwatch') || kind.includes('watch')) return '/photos/products/apple-watch-titanium.webp';
  if (kind.includes('keyboard')) return '/photos/products/mechanical-keyboard.webp';
  if (kind.includes('ultrabook') || kind.includes('laptop') || kind.includes('workstation')) return '/photos/banner2.webp';
  if (kind.includes('fryer') || kind.includes('blender')) return '/photos/products/air-fryer-generated.png';
  if (kind.includes('shirt')) return '/photos/products/shirt-generated.png';
  if (kind.includes('kurta')) return '/photos/products/kurta-generated.png';
  if (kind.includes('serum') || kind.includes('skin')) return '/photos/products/serum-generated.png';
  if (kind.includes('lamp') || kind.includes('lighting')) return '/photos/products/lamp-generated.png';
  if (kind.includes('dumbbell') || kind.includes('mat')) return '/photos/products/dumbbells-generated.png';
  const t = title.toLowerCase();
  if (t.includes('headphone') || t.includes('audio') || t.includes('sound')) {
    return '/photos/products/sony-headphones-black.webp';
  }
  if (t.includes('earbud') || t.includes('airpod') || t.includes('buds')) {
    return '/photos/products/bose-earbuds-gold.webp';
  }
  if (t.includes('watch') || t.includes('band') || t.includes('wearable')) {
    return '/photos/products/apple-watch-titanium.webp';
  }
  if (t.includes('keyboard') || t.includes('mouse') || t.includes('keycap')) {
    return '/photos/products/mechanical-keyboard.webp';
  }
  if (t.includes('fryer') || t.includes('cooker') || t.includes('blender') || t.includes('appliance')) {
    return '/photos/products/air-fryer-generated.png';
  }
  if (t.includes('shoe') || t.includes('sneaker') || t.includes('boot')) {
    return '/photos/products/nike-running-shoes.webp';
  }
  if (t.includes('backpack') || t.includes('bag') || t.includes('luggage')) {
    return '/photos/products/urban-backpack.webp';
  }
  if (t.includes('sunglass') || t.includes('eyewear') || t.includes('glasses')) {
    return '/photos/products/designer-sunglasses.webp';
  }

  const c = category.toLowerCase();
  if (c.includes('electron') || c.includes('gadget')) {
    return '/photos/categories/electronics.webp';
  }
  if (c.includes('fash') || c.includes('apparel') || c.includes('cloth')) {
    return '/photos/categories/fashion.webp';
  }
  if (c.includes('home') || c.includes('kitchen')) {
    return '/photos/categories/home-kitchen.webp';
  }
  if (c.includes('beauty') || c.includes('health') || c.includes('skin')) {
    return '/photos/categories/beauty-health.webp';
  }
  if (c.includes('sport') || c.includes('fit') || c.includes('gym')) {
    return '/photos/categories/sports-fitness.webp';
  }

  return '/photos/products/sony-headphones-black.webp';
}

export function getCategoryCover(categoryName = ''): string {
  const c = categoryName.toLowerCase();
  if (c.includes('electron')) return '/photos/categories/electronics.webp';
  if (c.includes('fash')) return '/photos/categories/fashion.webp';
  if (c.includes('home') || c.includes('kitchen')) return '/photos/categories/home-kitchen.webp';
  if (c.includes('beauty') || c.includes('health')) return '/photos/categories/beauty-health.webp';
  if (c.includes('sport') || c.includes('fit')) return '/photos/categories/sports-fitness.webp';
  return '/photos/categories/electronics.webp';
}
