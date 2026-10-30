import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

type PrismaLikeError = { code?: string };

const codeOf = (error: unknown) => (error as PrismaLikeError | null)?.code;

// Maps common Prisma errors of simple name-based resources to HTTP errors
export function mapCatalogError(error: unknown, label: string): never {
  switch (codeOf(error)) {
    case 'P2002':
      throw new ConflictException(`${label} with this name already exists`);
    case 'P2025':
      throw new NotFoundException(`${label} not found`);
    case 'P2003':
      throw new ConflictException(
        `${label} is used by products and cannot be deleted`,
      );
    default:
      throw error;
  }
}
