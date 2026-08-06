import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type { Category } from '#modules/catalog/domain/category.js';
import type { CategoryRepository } from '#modules/catalog/ports/category-repository.js';
import {
  CategoryAlreadyExists,
  CategoryDeleted,
  CategoryNameEmpty,
  CategoryNotFound,
  CategorySaved,
  CreateCategory,
  CreateCategoryInput,
  DeleteCategory,
  DeleteCategoryInput,
  ListCategories,
  ReassignTargetInvalid,
  ReorderCategories,
  UpdateCategory,
  UpdateCategoryInput,
} from '#modules/catalog/use-cases/manage-categories/manage-categories.js';

// Sets fijos que el front sabe dibujar; el API solo valida la llave.
const CATEGORY_ICONS = [
  'bolsa', 'manzana', 'botella', 'limpieza', 'pan', 'carne', 'lacteo', 'dulce', 'mascota', 'nieve',
] as const;
const CATEGORY_COLORS = [
  'verde', 'marron', 'azul', 'morado', 'ambar', 'rojo', 'turquesa', 'rosado',
] as const;

const listCategoriesDto = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const createCategoryDto = z.object({
  name: z.string().min(1, 'El nombre de la categoría no puede estar vacío.').max(60),
});

const updateCategoryDto = z.object({
  name: z.string().min(1).max(60).nullish(),
  active: z.boolean().nullish(),
  icon: z.enum(CATEGORY_ICONS).nullish(),
  color: z.enum(CATEGORY_COLORS).nullish(),
});

const reorderDto = z.object({
  slugs: z.array(z.string().min(1)).min(1).max(100),
});

const deleteCategoryDto = z.object({
  // Los productos migran aquí: nunca quedan sin categoría.
  reassignTo: z.string().min(1),
});

export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategories,
    private readonly createCategory: CreateCategory,
    private readonly updateCategory: UpdateCategory,
    private readonly reorderCategories: ReorderCategories,
    private readonly deleteCategory: DeleteCategory,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = listCategoriesDto.parse(request.query);
    const items = await this.listCategories.execute(query.includeInactive);
    const withCounts = await Promise.all(
      items.map(async (category) => ({
        ...toCategoryResponse(category),
        productCount: await this.categoryRepository.countProducts(category.slug),
      })),
    );
    await reply.status(200).send(withCounts);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = createCategoryDto.parse(request.body);
    const result = await this.createCategory.execute(new CreateCategoryInput(body.name));

    if (result instanceof CategorySaved) {
      await reply.status(201).send(toCategoryResponse(result.category));
      return;
    }
    if (result instanceof CategoryAlreadyExists) {
      await reply.status(409).send({
        code: 'CATEGORY_ALREADY_EXISTS',
        message: 'Ya existe una categoría con ese nombre.',
      });
      return;
    }
    if (result instanceof CategoryNameEmpty) {
      await reply.status(400).send({
        code: 'CATEGORY_NAME_EMPTY',
        message: 'El nombre de la categoría no puede estar vacío.',
      });
      return;
    }
    exhaustive(result);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params;
    const slug =
      typeof params === 'object' && params !== null && 'slug' in params && typeof params.slug === 'string'
        ? params.slug
        : '';
    const body = updateCategoryDto.parse(request.body);
    const result = await this.updateCategory.execute(
      new UpdateCategoryInput(slug, body.name ?? null, body.active ?? null, body.icon ?? null, body.color ?? null),
    );

    if (result instanceof CategorySaved) {
      await reply.status(200).send(toCategoryResponse(result.category));
      return;
    }
    if (result instanceof CategoryNotFound) {
      await reply.status(404).send({ code: 'CATEGORY_NOT_FOUND', slug: result.slug });
      return;
    }
    if (result instanceof CategoryNameEmpty) {
      await reply.status(400).send({
        code: 'CATEGORY_NAME_EMPTY',
        message: 'El nombre de la categoría no puede estar vacío.',
      });
      return;
    }
    exhaustive(result);
  }

  // El orden de la lista recibida ES el orden de las pestañas de Vender.
  async reorder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = reorderDto.parse(request.body);
    const result = await this.reorderCategories.execute(body.slugs);
    await reply.status(200).send({ slugs: result.slugs });
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params;
    const slug =
      typeof params === 'object' && params !== null && 'slug' in params && typeof params.slug === 'string'
        ? params.slug
        : '';
    const body = deleteCategoryDto.parse(request.body ?? {});
    const result = await this.deleteCategory.execute(new DeleteCategoryInput(slug, body.reassignTo));

    if (result instanceof CategoryDeleted) {
      await reply.status(200).send({ slug: result.slug, movedProducts: result.movedProducts });
      return;
    }
    if (result instanceof CategoryNotFound) {
      await reply.status(404).send({ code: 'CATEGORY_NOT_FOUND', slug: result.slug });
      return;
    }
    if (result instanceof ReassignTargetInvalid) {
      await reply.status(422).send({
        code: 'REASSIGN_TARGET_INVALID',
        message: 'Elige otra categoría válida para mover los productos.',
      });
      return;
    }
    exhaustive(result);
  }
}

function toCategoryResponse(category: Category): Record<string, unknown> {
  return {
    slug: category.slug,
    name: category.name,
    active: category.active,
    sortOrder: category.sortOrder,
    icon: category.icon,
    color: category.color,
  };
}
