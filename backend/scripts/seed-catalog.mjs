// Fills the catalog with demo products through the public API (so images are downloaded and stored by the backend).
// Usage (backend must be running):
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-catalog.mjs
// Idempotent: products that already exist (by name) are skipped.
import { readFileSync } from 'node:fs';

const API = process.env.API_URL ?? 'http://localhost:3000';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (a user with role ADMIN)');
  process.exit(1);
}

const photos = JSON.parse(readFileSync(new URL('./catalog-photos.json', import.meta.url), 'utf8'));

const CLOTHES = ['XS', 'S', 'M', 'L', 'XL'];
const SHOES = ['40', '41', '42', '43', '44'];
const WAIST = ['28', '30', '32', '34', '36'];

// photoKey picks the image pool; every product takes the next 3 photos from it
const PRODUCTS = [
  { photoKey: 'tshirt', category: 'T-Shirts', brand: 'Nike', name: 'Essential Cotton Tee', price: 22.99, colors: ['White', 'Black'], sizes: CLOTHES, description: 'Soft everyday cotton tee with a relaxed fit.' },
  { photoKey: 'tshirt', category: 'T-Shirts', brand: 'Adidas', name: 'Trefoil Classic T-Shirt', price: 27.99, colors: ['Black', 'Navy'], sizes: CLOTHES, description: 'Classic crew-neck tee with the signature trefoil logo.' },
  { photoKey: 'tshirt', category: 'T-Shirts', brand: 'Puma', name: 'Sport Logo Tee', price: 19.99, colors: ['Grey', 'Red'], sizes: CLOTHES, description: 'Lightweight breathable tee for training and daily wear.' },
  { photoKey: 'hoodie', category: 'Hoodies', brand: 'Nike', name: 'Club Fleece Hoodie', price: 59.99, colors: ['Black', 'Grey'], sizes: CLOTHES, description: 'Warm brushed-fleece hoodie with a kangaroo pocket.' },
  { photoKey: 'hoodie', category: 'Hoodies', brand: 'Adidas', name: 'Originals Oversize Hoodie', price: 69.99, colors: ['Beige', 'Black'], sizes: CLOTHES, description: 'Oversized cut, heavyweight cotton blend.' },
  { photoKey: 'hoodie', category: 'Hoodies', brand: 'The North Face', name: 'Drew Peak Pullover Hoodie', price: 82.99, colors: ['Olive', 'Black'], sizes: CLOTHES, description: 'Outdoor-ready pullover hoodie with a double-layer hood.' },
  { photoKey: 'jeans', category: 'Pants', brand: "Levi's", name: '501 Original Jeans', price: 87.99, colors: ['Blue', 'Black'], sizes: WAIST, description: 'The original straight-fit jeans since 1873.' },
  { photoKey: 'jeans', category: 'Pants', brand: "Levi's", name: '511 Slim Jeans', price: 82.99, colors: ['Dark Blue', 'Grey'], sizes: WAIST, description: 'Slim fit through the hip and thigh with a bit of stretch.' },
  { photoKey: 'jeans', category: 'Pants', brand: "Levi's", name: '512 Tapered Jeans', price: 79.99, colors: ['Light Blue', 'Black'], sizes: WAIST, description: 'Slim taper that stays comfortable all day.' },
  { photoKey: 'jacket', category: 'Jackets', brand: 'The North Face', name: 'Resolve Rain Jacket', price: 114.99, colors: ['Black', 'Blue'], sizes: CLOTHES, description: 'Waterproof, breathable shell for wet weather.' },
  { photoKey: 'jacket', category: 'Jackets', brand: 'Nike', name: 'Windrunner Jacket', price: 99.99, colors: ['Black', 'White'], sizes: CLOTHES, description: 'Iconic lightweight windbreaker with chevron panels.' },
  { photoKey: 'jacket', category: 'Jackets', brand: 'Adidas', name: 'Essentials Padded Jacket', price: 129.99, colors: ['Black', 'Olive'], sizes: CLOTHES, description: 'Insulated jacket for cold days.' },
  { photoKey: 'sneakers', category: 'Shoes', brand: 'Nike', name: 'Air Force 1 Low', price: 119.99, colors: ['White', 'Black'], sizes: SHOES, description: 'Legendary basketball-born sneaker with cushioned sole.' },
  { photoKey: 'sneakers', category: 'Shoes', brand: 'Adidas', name: 'Samba OG', price: 109.99, colors: ['Black', 'White'], sizes: SHOES, description: 'Terrace classic with a suede T-toe and gum sole.' },
  { photoKey: 'sneakers', category: 'Shoes', brand: 'Puma', name: 'Suede Classic XXI', price: 89.99, colors: ['Blue', 'Red'], sizes: SHOES, description: 'Timeless suede sneaker with a formstrip.' },
];

let token = '';

async function call(method, path, body, attempt = 0) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 5) {
    await new Promise((r) => setTimeout(r, 15_000));
    return call(method, path, body, attempt + 1);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : undefined;
}

async function main() {
  token = (await call('POST', '/auth/login', { email, password })).accessToken;

  const categories = Object.fromEntries((await call('GET', '/categories')).map((c) => [c.name, c.id]));
  const brands = Object.fromEntries((await call('GET', '/brands')).map((b) => [b.name, b.id]));
  const used = {};

  for (const p of PRODUCTS) {
    const pool = photos[p.photoKey] ?? [];
    const start = used[p.photoKey] ?? 0;
    const urls = pool.slice(start, start + 3);
    used[p.photoKey] = start + 3;

    const existing = await call('GET', `/products/admin?search=${encodeURIComponent(p.name)}&limit=100`);
    if (existing.items.some((x) => x.name === p.name)) {
      console.log(`skip   ${p.name} (exists)`);
      continue;
    }
    if (urls.length < 3) {
      console.log(`skip   ${p.name} (not enough photos for "${p.photoKey}")`);
      continue;
    }

    const created = await call('POST', '/products', {
      name: p.name,
      price: p.price,
      description: p.description,
      categoryId: categories[p.category],
      brandId: brands[p.brand],
    });
    await call('POST', `/products/${created.id}/images/import`, {
      images: urls.map((url, i) => ({ url, alt: `${p.name} ${i + 1}` })),
    });
    for (const color of p.colors) {
      for (const size of p.sizes) {
        await call('POST', `/products/${created.id}/variants`, { size, color, stock: 5 + Math.floor(Math.random() * 20) });
      }
    }
    await call('PATCH', `/products/${created.id}`, { isActive: true });
    console.log(`added  ${p.name}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
