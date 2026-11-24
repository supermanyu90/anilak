/* Tailwind Play CDN theme: Soft UI palette, display font and soft shadows. Loaded as a classic script after the CDN. */
tailwind.config = { theme: { extend: {
  colors: { ink: '#2D3436', ink2: '#5B6466', cream: '#FFF5F5', mist: '#FBF1F0', blush: '#E8B4B8', sage: '#A8D5BA', gold: '#D4AF37',
            'sage-ink': '#2F6B4A', 'gold-ink': '#7A5F0E', 'rose-ink': '#A0444B', 'sage-50': '#EEF7F1', 'blush-50': '#FCEDEE', 'gold-50': '#FBF3DC' },
  fontFamily: { display: ['"Cormorant Garamond"', 'Georgia', 'serif'] },
  boxShadow: { soft: '0 1px 2px rgba(45,52,54,.04), 0 10px 30px -14px rgba(45,52,54,.18)', lift: '0 2px 4px rgba(45,52,54,.05), 0 18px 40px -18px rgba(45,52,54,.25)' },
} } };
