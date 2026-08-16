#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dishes = [
  { slug: 'bruschetta', bg: ['#f4d7b0', '#c45c26'], accent: '#7a2e2e', shape: 'toast' },
  { slug: 'tartare', bg: ['#e8cfc0', '#8b3a2a'], accent: '#d4a574', shape: 'tartare' },
  { slug: 'stracciatella', bg: ['#f7ead2', '#d9a441'], accent: '#c45c26', shape: 'cheese' },
  { slug: 'oysters', bg: ['#d7e4e2', '#4f6f6a'], accent: '#c4a574', shape: 'oyster' },
  { slug: 'quinoa', bg: ['#e7efd8', '#5c6b4a'], accent: '#c45c26', shape: 'bowl' },
  { slug: 'caesar', bg: ['#e9f0d8', '#6a7f3f'], accent: '#d4a574', shape: 'salad' },
  { slug: 'burrata', bg: ['#f8e7d2', '#c4783a'], accent: '#7a2e2e', shape: 'cheese' },
  { slug: 'pumpkin-soup', bg: ['#f3d3a4', '#c45c26'], accent: '#7a2e2e', shape: 'soup' },
  { slug: 'ukha', bg: ['#f0e0c8', '#8a5a32'], accent: '#4f6f6a', shape: 'soup' },
  { slug: 'ribeye', bg: ['#e8c4b4', '#7a2e2e'], accent: '#c4a574', shape: 'steak' },
  { slug: 'chicken', bg: ['#f0d8b8', '#b07a32'], accent: '#5c6b4a', shape: 'roast' },
  { slug: 'seabass', bg: ['#dce8ea', '#3f5d67'], accent: '#c45c26', shape: 'fish' },
  { slug: 'lamb', bg: ['#ead3c2', '#6b3a2a'], accent: '#c4a574', shape: 'steak' },
  { slug: 'carbonara', bg: ['#f4e4c8', '#c4a574'], accent: '#7a2e2e', shape: 'pasta' },
  { slug: 'shrimp-pasta', bg: ['#f3d7c8', '#c45c26'], accent: '#4f6f6a', shape: 'pasta' },
  { slug: 'risotto', bg: ['#efe4c4', '#b08a3a'], accent: '#5c6b4a', shape: 'bowl' },
  { slug: 'cheesecake', bg: ['#f7e8d0', '#d4a574'], accent: '#7a2e2e', shape: 'cake' },
  { slug: 'tiramisu', bg: ['#ead9c4', '#6b4a32'], accent: '#c4a574', shape: 'cake' },
  { slug: 'fondant', bg: ['#e4d0c0', '#4a2c22'], accent: '#c45c26', shape: 'cake' },
  { slug: 'pannacotta', bg: ['#f6ead8', '#e8c9a0'], accent: '#7a2e2e', shape: 'cream' },
  { slug: 'espresso', bg: ['#d9c8b8', '#3a2418'], accent: '#c4a574', shape: 'cup' },
  { slug: 'cappuccino', bg: ['#efe0cc', '#b08968'], accent: '#5c6b4a', shape: 'cup' },
  { slug: 'lemonade', bg: ['#e7f0d4', '#7ea35c'], accent: '#c45c26', shape: 'glass' },
  { slug: 'pinot', bg: ['#ead6dc', '#7a2e2e'], accent: '#c4a574', shape: 'wine' },
  { slug: 'spritz', bg: ['#f6d9c4', '#e07a3a'], accent: '#7a2e2e', shape: 'glass' },
  { slug: 'cocoa', bg: ['#ead6c4', '#6b3f2a'], accent: '#c4a574', shape: 'cup' },
  { slug: 'grilled-veg', bg: ['#e5edd8', '#5c6b4a'], accent: '#c45c26', shape: 'veg' },
  { slug: 'salmon-tartare', bg: ['#f3d4c8', '#d06a4a'], accent: '#4f6f6a', shape: 'tartare' },
];

function food(shape, accent) {
  switch (shape) {
    case 'toast':
      return `<rect x="250" y="240" width="300" height="180" rx="18" fill="${accent}" opacity=".9"/>
        <circle cx="330" cy="310" r="28" fill="#f3efe6"/><circle cx="410" cy="300" r="22" fill="#7a2e2e"/>
        <circle cx="480" cy="330" r="18" fill="#5c6b4a"/>`;
    case 'steak':
      return `<ellipse cx="400" cy="310" rx="170" ry="110" fill="${accent}"/>
        <ellipse cx="400" cy="310" rx="90" ry="50" fill="#f3d7c4" opacity=".45"/>`;
    case 'pasta':
      return `<path d="M230 300c40-80 300-80 340 0-20 90-320 90-340 0z" fill="${accent}"/>
        <path d="M260 300c30-40 250-40 280 0" stroke="#fff6e8" stroke-width="10" fill="none"/>
        <path d="M280 330c40-30 200-30 240 0" stroke="#fff6e8" stroke-width="8" fill="none"/>`;
    case 'soup':
      return `<ellipse cx="400" cy="340" rx="180" ry="70" fill="${accent}"/>
        <ellipse cx="400" cy="300" rx="150" ry="48" fill="#fff6e8" opacity=".5"/>`;
    case 'fish':
      return `<ellipse cx="390" cy="310" rx="160" ry="70" fill="${accent}"/>
        <polygon points="540,310 640,250 640,370" fill="${accent}"/>`;
    case 'salad':
    case 'bowl':
    case 'veg':
      return `<ellipse cx="400" cy="340" rx="190" ry="80" fill="${accent}"/>
        <circle cx="340" cy="290" r="36" fill="#f3efe6"/><circle cx="430" cy="280" r="44" fill="#7ea35c"/>
        <circle cx="480" cy="320" r="28" fill="#c45c26"/>`;
    case 'cake':
    case 'cream':
    case 'cheese':
      return `<rect x="270" y="250" width="260" height="140" rx="24" fill="${accent}"/>
        <ellipse cx="400" cy="250" rx="130" ry="36" fill="#fff6e8"/>`;
    case 'cup':
      return `<rect x="300" y="230" width="180" height="160" rx="24" fill="${accent}"/>
        <path d="M480 270h70c20 0 30 40 0 80h-70" stroke="${accent}" stroke-width="18" fill="none"/>
        <ellipse cx="390" cy="230" rx="90" ry="24" fill="#fff6e8"/>`;
    case 'glass':
    case 'wine':
      return `<path d="M330 180h140l-40 160h-60z" fill="${accent}"/>
        <rect x="388" y="340" width="24" height="80" fill="${accent}"/>
        <ellipse cx="400" cy="430" rx="50" ry="12" fill="${accent}"/>`;
    case 'oyster':
      return `<ellipse cx="400" cy="310" rx="150" ry="90" fill="${accent}"/>
        <ellipse cx="400" cy="310" rx="80" ry="40" fill="#f3efe6"/>`;
    case 'tartare':
      return `<circle cx="400" cy="310" r="120" fill="${accent}"/>
        <circle cx="400" cy="310" r="70" fill="#f3efe6" opacity=".55"/>`;
    case 'roast':
      return `<ellipse cx="400" cy="320" rx="150" ry="90" fill="${accent}"/>
        <rect x="360" y="210" width="16" height="70" rx="8" fill="#5c6b4a"/>`;
    default:
      return `<circle cx="400" cy="310" r="120" fill="${accent}"/>`;
  }
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../frontend/public/images/dishes');
fs.mkdirSync(dir, { recursive: true });

for (const dish of dishes) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dish.bg[0]}"/>
      <stop offset="1" stop-color="${dish.bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <ellipse cx="400" cy="470" rx="260" ry="28" fill="rgba(42,33,24,.18)"/>
  <circle cx="400" cy="310" r="210" fill="#f7f1e8"/>
  <circle cx="400" cy="310" r="188" fill="#fffaf3"/>
  ${food(dish.shape, dish.accent)}
</svg>`;
  fs.writeFileSync(path.join(dir, `${dish.slug}.svg`), svg);
}

console.log(`Wrote ${dishes.length} dish illustrations`);
