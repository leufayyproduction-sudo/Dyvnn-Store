export type Game = { id: string; name: string; shortName: string; publisher: string; category: string; image: string; color: string; rating: string; available: boolean; currency: string; price: string };
export const games: Game[] = [
  { id: 'mlbb', name: 'Mobile Legends', shortName: 'Mobile Legends', publisher: 'MOONTON', category: 'MOBA', image: '/images/mlbb.jpg', color: '#8b5cf6', rating: '4.9', available: true, currency: 'Diamonds', price: '1.500' },
  { id: 'pubg', name: 'PUBG Mobile', shortName: 'PUBG Mobile', publisher: 'Tencent Games', category: 'Battle Royale', image: '/images/pubg.jpg', color: '#38bdf8', rating: '4.8', available: true, currency: 'UC', price: '16.000' },
  { id: 'ff', name: 'Free Fire', shortName: 'Free Fire', publisher: 'Garena', category: 'Battle Royale', image: '/images/ff.png', color: '#f472b6', rating: '4.8', available: true, currency: 'Diamonds', price: '1.000' },
  { id: 'hok', name: 'Honor of Kings', shortName: 'Honor of Kings', publisher: 'Level Infinite', category: 'MOBA', image: '/images/hok.png', color: '#a78bfa', rating: '4.9', available: false, currency: 'Tokens', price: '' },
  { id: 'roblox', name: 'Roblox', shortName: 'Roblox', publisher: 'Roblox Corporation', category: 'Adventure', image: '/images/roblox.png', color: '#6ee7d2', rating: '4.7', available: false, currency: 'Robux', price: '' },
];
