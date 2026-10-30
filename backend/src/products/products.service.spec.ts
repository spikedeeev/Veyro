import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

const image = (id: string, sortOrder: number) => ({
  id,
  url: `https://example.com/${id}.jpg`,
  alt: null,
  sortOrder,
  isPrimary: sortOrder === 0,
  createdAt: new Date(),
  productId: 'p1',
});

describe('ProductsService', () => {
  const prisma = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productImage: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const imageStorage = {
    importUrls: jest.fn(),
    saveUploadedMany: jest.fn(),
  };
  const storage = { remove: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProductsService(
      prisma as never,
      imageStorage as never,
      storage as never,
    );
  });

  it('findOne throws NotFound for missing/inactive product', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'x', isActive: true } }),
    );
  });

  it('create rejects publishing with fewer than 3 images before touching storage', async () => {
    await expect(
      service.create({
        name: 'Shirt',
        price: 10,
        isActive: true,
        images: [{ url: 'https://a/1.jpg' }, { url: 'https://a/2.jpg' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(imageStorage.importUrls).not.toHaveBeenCalled();
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('create stores imported urls as a draft with ordered images', async () => {
    imageStorage.importUrls.mockResolvedValue(['own/1.jpg', 'own/2.jpg']);
    prisma.product.create.mockResolvedValue({});

    await service.create({
      name: 'Shirt',
      price: 10,
      images: [{ url: 'https://a/1.jpg' }, { url: 'https://a/2.jpg' }],
    });

    const data = prisma.product.create.mock.calls[0][0].data;
    expect(data.isActive).toBe(false);
    expect(data.images.create).toEqual([
      expect.objectContaining({ url: 'own/1.jpg', sortOrder: 0, isPrimary: true }),
      expect.objectContaining({ url: 'own/2.jpg', sortOrder: 1, isPrimary: false }),
    ]);
  });

  it('create removes stored files when the database write fails', async () => {
    imageStorage.importUrls.mockResolvedValue(['own/1.jpg']);
    prisma.product.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.create({ name: 'Shirt', price: 10, images: [{ url: 'https://a/1.jpg' }] }),
    ).rejects.toThrow('db down');
    expect(storage.remove).toHaveBeenCalledWith(['own/1.jpg']);
  });

  it('update refuses to publish a product with fewer than 3 images', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      isActive: false,
      images: [image('a', 0)],
    });

    await expect(
      service.update('p1', { isActive: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removeImage refuses to drop a published product below 3 images', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      isActive: true,
      images: [image('a', 0), image('b', 1), image('c', 2)],
    });

    await expect(service.removeImage('p1', 'b')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('uploadImages requires at least one file', async () => {
    await expect(service.uploadImages('p1', [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reorderImages rejects an incomplete id list', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      isActive: false,
      images: [image('a', 0), image('b', 1)],
    });

    await expect(
      service.reorderImages('p1', { imageIds: ['a'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
