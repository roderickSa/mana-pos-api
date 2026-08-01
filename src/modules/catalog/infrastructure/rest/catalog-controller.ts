import type { FastifyReply, FastifyRequest } from 'fastify';

import { CreateProduct } from '#modules/catalog/use-cases/create-product/create-product.js';
import {
  CreateUnitProductInput,
  CreateWeightProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
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

export class CatalogController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly searchProducts: SearchProducts,
    private readonly getProductByBarcode: GetProductByBarcode,
    private readonly setProductImage: SetProductImage,
    private readonly removeProductImage: RemoveProductImage,
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = createProductDto.parse(request.body);
    const input =
      body.saleType === 'unit'
        ? new CreateUnitProductInput(
            body.barcode ?? null,
            body.shortCode ?? null,
            body.name,
            body.category,
            body.supplierId ?? null,
            body.priceCents,
            body.costCents,
            body.stockMinimum,
            body.quickAccess,
          )
        : new CreateWeightProductInput(
            body.barcode ?? null,
            body.shortCode ?? null,
            body.name,
            body.category,
            body.supplierId ?? null,
            body.pricePerKgCents,
            body.costPerKgCents,
            body.stockMinimumGrams,
            body.quickAccess,
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
        body.supplierId ?? null,
        body.priceCents,
        body.costCents,
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
        query.quickAccess,
        query.lowStock,
        query.includeInactive,
        query.orderBy === 'sales',
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
