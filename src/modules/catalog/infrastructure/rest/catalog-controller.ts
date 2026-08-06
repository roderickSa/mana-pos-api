import type { FastifyReply, FastifyRequest } from 'fastify';

import { CreateProduct } from '#modules/catalog/use-cases/create-product/create-product.js';
import {
  CreateUnitProductInput,
  CreateWeightProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
  NameAlreadyInUse,
  ProductCreated,
  ShortCodeAlreadyInUse,
  SupplierNotFound,
} from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { GetProductByBarcode } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.js';
import { GetProductByBarcodeInput } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.input.js';
import {
  ProductFoundByBarcode,
  UnknownBarcode,
} from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.output.js';
import { SearchProducts } from '#modules/catalog/use-cases/search-products/search-products.js';
import { SearchProductsInput } from '#modules/catalog/use-cases/search-products/search-products.input.js';
import { UpdateProduct } from '#modules/catalog/use-cases/update-product/update-product.js';
import { UpdateProductInput } from '#modules/catalog/use-cases/update-product/update-product.input.js';
import {
  BarcodeTakenByAnotherProduct,
  ProductNotFound,
  ProductUpdated,
} from '#modules/catalog/use-cases/update-product/update-product.output.js';
import {
  createProductDto,
  parseImageDataUrl,
  searchProductsDto,
  setProductImageDto,
  toProductResponse,
  updateProductDto,
} from '#modules/catalog/infrastructure/rest/dtos/product.dto.js';
import {
  RemoveProductImage,
  SetProductImage,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.js';
import {
  RemoveProductImageInput,
  SetProductImageInput,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.input.js';
import {
  ProductImageRemoved,
  ProductImageSet,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.output.js';
import { exhaustive } from '#shared/domain/exhaustive.js';
import { z } from 'zod';
import {
  AddProductBarcode,
  BarcodeAdded,
  ListProductBarcodes,
  RemoveProductBarcode,
  type ProductBarcodes,
} from '#modules/catalog/use-cases/manage-barcodes/manage-barcodes.js';
import {
  LinkProductSupplier,
  ProductSupplierLinked,
  UnlinkProductSupplier,
} from '#modules/catalog/use-cases/manage-product-suppliers/manage-product-suppliers.js';
import {
  CannotMergeDifferentSaleTypes,
  CannotMergeSameProduct,
  MergeProducts,
  ProductsMerged,
  ProductToMergeNotFound,
} from '#modules/catalog/use-cases/merge-products/merge-products.js';

const barcodeBodyDto = z.object({ barcode: z.string().min(4).max(30).regex(/^\d+$/) });
const mergeDto = z.object({ winnerId: z.string().min(1), loserId: z.string().min(1) });

function toBarcodesResponse(barcodes: ProductBarcodes): Record<string, unknown> {
  return { productId: barcodes.productId, barcodes: barcodes.barcodes };
}

export class CatalogController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly searchProducts: SearchProducts,
    private readonly getProductByBarcode: GetProductByBarcode,
    private readonly setProductImage: SetProductImage,
    private readonly removeProductImage: RemoveProductImage,
    private readonly listProductBarcodes: ListProductBarcodes,
    private readonly addProductBarcode: AddProductBarcode,
    private readonly removeProductBarcode: RemoveProductBarcode,
    private readonly mergeProducts: MergeProducts,
    private readonly linkProductSupplier: LinkProductSupplier,
    private readonly unlinkProductSupplier: UnlinkProductSupplier,
  ) {}

  async linkSupplier(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id, supplierId } = supplierParamsDto(request);
    const result = await this.linkProductSupplier.execute(id, supplierId);
    if (result instanceof ProductSupplierLinked) {
      await reply.status(204).send();
      return;
    }
    if (result instanceof ProductNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof SupplierNotFound) {
      await reply.status(422).send({ code: 'SUPPLIER_NOT_FOUND', supplierId: result.supplierId });
      return;
    }
    exhaustive(result);
  }

  async unlinkSupplier(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id, supplierId } = supplierParamsDto(request);
    await this.unlinkProductSupplier.execute(id, supplierId);
    await reply.status(204).send();
  }

  async barcodes(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    await reply.status(200).send(toBarcodesResponse(await this.listProductBarcodes.execute(id)));
  }

  async addBarcode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    const body = barcodeBodyDto.parse(request.body);
    const result = await this.addProductBarcode.execute(id, body.barcode);
    if (result instanceof BarcodeAdded) {
      await reply.status(201).send(toBarcodesResponse(result.barcodes));
      return;
    }
    if (result instanceof ProductNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof BarcodeAlreadyInUse) {
      await reply.status(409).send({ code: 'BARCODE_ALREADY_IN_USE', barcode: result.barcode });
      return;
    }
    exhaustive(result);
  }

  async removeBarcode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    const { barcode } = barcodeParamsDto(request);
    const result = await this.removeProductBarcode.execute(id, barcode);
    await reply.status(200).send(toBarcodesResponse(result.barcodes));
  }

  async merge(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = mergeDto.parse(request.body);
    const result = await this.mergeProducts.execute(body.winnerId, body.loserId);
    if (result instanceof ProductsMerged) {
      await reply.status(200).send(toProductResponse(result.winner));
      return;
    }
    if (result instanceof ProductToMergeNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof CannotMergeSameProduct) {
      await reply.status(400).send({ code: 'CANNOT_MERGE_SAME_PRODUCT' });
      return;
    }
    if (result instanceof CannotMergeDifferentSaleTypes) {
      await reply.status(409).send({
        code: 'CANNOT_MERGE_DIFFERENT_SALE_TYPES',
        message: 'No se puede fusionar un producto por unidad con uno por peso.',
      });
      return;
    }
    exhaustive(result);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = createProductDto.parse(request.body);
    const input =
      body.saleType === 'unit'
        ? new CreateUnitProductInput(
            body.barcode ?? null,
            body.shortCode ?? null,
            body.name,
            body.category,
            body.supplierIds,
            body.priceCents,
            body.costCents,
            body.packSize ?? null,
            body.packCostCents ?? null,
            body.stockMinimum,
            body.quickAccess,
            body.allowDuplicateName,
          )
        : new CreateWeightProductInput(
            body.barcode ?? null,
            body.shortCode ?? null,
            body.name,
            body.category,
            body.supplierIds,
            body.pricePerKgCents,
            body.costPerKgCents,
            body.stockMinimumGrams,
            body.quickAccess,
            body.allowDuplicateName,
          );

    const result = await this.createProduct.execute(input);
    if (result instanceof ProductCreated) {
      await reply.status(201).send(toProductResponse(result.product));
      return;
    }
    if (result instanceof BarcodeAlreadyInUse) {
      await reply.status(409).send({ code: 'BARCODE_ALREADY_IN_USE', barcode: result.barcode });
      return;
    }
    if (result instanceof ShortCodeAlreadyInUse) {
      await reply.status(409).send({
        code: 'SHORT_CODE_ALREADY_IN_USE',
        message: `El código corto ${result.shortCode} ya lo usa otro producto.`,
      });
      return;
    }
    if (result instanceof SupplierNotFound) {
      await reply.status(422).send({ code: 'SUPPLIER_NOT_FOUND', supplierId: result.supplierId });
      return;
    }
    if (result instanceof NameAlreadyInUse) {
      await reply.status(409).send({
        code: 'DUPLICATE_NAME',
        existingProductId: result.existingProductId,
        message: `Ya existe «${result.existingName}». Revisa si es el mismo producto antes de crear otro.`,
      });
      return;
    }
    exhaustive(result);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    const body = updateProductDto.parse(request.body);
    const result = await this.updateProduct.execute(
      new UpdateProductInput(
        id,
        body.barcode ?? null,
        body.shortCode ?? null,
        body.name,
        body.category,
        body.supplierIds,
        body.priceCents,
        body.costCents,
        body.packSize ?? null,
        body.packCostCents ?? null,
        body.stockMinimum,
        body.active,
        body.quickAccess,
      ),
    );

    if (result instanceof ProductUpdated) {
      await reply.status(200).send(toProductResponse(result.product));
      return;
    }
    if (result instanceof ProductNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof BarcodeTakenByAnotherProduct) {
      await reply.status(409).send({ code: 'BARCODE_ALREADY_IN_USE', barcode: result.barcode });
      return;
    }
    if (result instanceof ShortCodeAlreadyInUse) {
      await reply.status(409).send({
        code: 'SHORT_CODE_ALREADY_IN_USE',
        message: `El código corto ${result.shortCode} ya lo usa otro producto.`,
      });
      return;
    }
    if (result instanceof SupplierNotFound) {
      await reply.status(422).send({ code: 'SUPPLIER_NOT_FOUND', supplierId: result.supplierId });
      return;
    }
    exhaustive(result);
  }

  async search(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = searchProductsDto.parse(request.query);
    const perPage = query.perPage ?? 25;
    const page = query.page ?? 1;
    const paginated = query.page !== undefined;

    const result = await this.searchProducts.execute(
      new SearchProductsInput(
        query.query ?? null,
        query.category ?? null,
        query.supplier ?? null,
        query.quickAccess,
        query.lowStock,
        query.noCost,
        query.includeInactive,
        query.orderBy ?? 'default',
        query.orderDir === 'desc',
        paginated ? perPage : 50,
        paginated ? (page - 1) * perPage : 0,
      ),
    );

    if (paginated) {
      await reply.status(200).send({
        items: result.items.map(toProductResponse),
        total: result.total,
        page,
        perPage,
      });
      return;
    }
    await reply.status(200).send(result.items.map(toProductResponse));
  }

  async setImage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    const body = setProductImageDto.parse(request.body);
    const { data, extension } = parseImageDataUrl(body.imageBase64);
    const result = await this.setProductImage.execute(new SetProductImageInput(id, data, extension));

    if (result instanceof ProductImageSet) {
      await reply.status(200).send(toProductResponse(result.product));
      return;
    }
    if (result instanceof ProductNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }

  async removeImage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = idParamsDto(request);
    const result = await this.removeProductImage.execute(new RemoveProductImageInput(id));

    if (result instanceof ProductImageRemoved) {
      await reply.status(200).send(toProductResponse(result.product));
      return;
    }
    if (result instanceof ProductNotFound) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }

  async byBarcode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { barcode } = barcodeParamsDto(request);
    const result = await this.getProductByBarcode.execute(new GetProductByBarcodeInput(barcode));

    if (result instanceof ProductFoundByBarcode) {
      await reply.status(200).send(toProductResponse(result.product));
      return;
    }
    if (result instanceof UnknownBarcode) {
      await reply.status(404).send({ code: 'UNKNOWN_BARCODE', barcode: result.barcode });
      return;
    }
    exhaustive(result);
  }
}

function idParamsDto(request: FastifyRequest): { id: string } {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return { id: params.id };
  }
  throw new Error('Missing id param');
}

function barcodeParamsDto(request: FastifyRequest): { barcode: string } {
  const params = request.params;
  if (
    typeof params === 'object' &&
    params !== null &&
    'barcode' in params &&
    typeof params.barcode === 'string'
  ) {
    return { barcode: params.barcode };
  }
  throw new Error('Missing barcode param');
}

function supplierParamsDto(request: FastifyRequest): { id: string; supplierId: string } {
  const params = request.params;
  if (
    typeof params === 'object' &&
    params !== null &&
    'id' in params &&
    'supplierId' in params &&
    typeof params.id === 'string' &&
    typeof params.supplierId === 'string'
  ) {
    return { id: params.id, supplierId: params.supplierId };
  }
  throw new Error('Missing id/supplierId params');
}
