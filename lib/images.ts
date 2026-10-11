/**
 * Resolves real, high-resolution product and category photography
 * bundled directly in public/photos/
 */
export function getProductImage(title = '', category = ''): string {
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
    return '/photos/products/air-fryer-compact.webp';
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
