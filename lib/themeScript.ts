// Runs in <head> before first paint: the stored choice, else THEME_FIRST.
export const THEME_STORAGE_KEY = 'styleshopz-theme';
export const THEME_FIRST = 'dark' as 'dark' | 'light' | 'system';
const FALLBACK = THEME_FIRST === 'system' ? `matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'` : `'${THEME_FIRST}'`;
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=${FALLBACK}}var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t}catch(e){}`;
