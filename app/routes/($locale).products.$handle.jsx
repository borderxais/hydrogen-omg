import {defer} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import React, {useState, useEffect} from 'react';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {Heart, Truck, Store} from 'lucide-react';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data}) => {
  return [
    {title: `OMG BEAUTY | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {LoaderFunctionArgs}
 */
async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  console.log(product);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs}
 */
function loadDeferredData({context, params}) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const [selectedImage, setSelectedImage] = useState(0);

  /** @type {LoaderReturnData} */
  const {product} = useLoaderData();

  console.log(product);
  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  //console.log(productOptions);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Product Images Section */}
        <div className="lg:w-2/3">
          <div className="flex gap-4">
            {/* Thumbnails */}
            <div className="hidden sm:flex flex-col gap-3 w-20">
              {product.images.edges.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`rounded-lg overflow-hidden border-2 ${
                    selectedImage === index
                      ? 'border-black'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={image.node.url || '/api/placeholder/400/400'}
                    alt={`Product view ${index + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="flex-1">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <img
                  src={
                    product.images.edges[selectedImage].node.url ||
                    '/api/placeholder/400/400'
                  }
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Info Section */}
        <div className="lg:w-1/3 space-y-4">
          {/* Vendor and Name */}
          <div>
            <h2 className="text-sm text-gray-500">{product.vendor}</h2>
            <h1 className="text-2xl font-medium mt-1">{product.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{product.category}</p>
          </div>

          {/* Stock Status */}
          <div className="text-sm">
            {product.selectedOrFirstAvailableVariant.availableForSale ? (
              <span className="text-green-600">In Stock</span>
            ) : (
              <span className="text-red-600">Out of Stock</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium">
              ${product.selectedOrFirstAvailableVariant.price.amount}
            </span>
            <span className="text-lg text-gray-500 line-through">
              ${product.selectedOrFirstAvailableVariant.compareAtPrice.amount}
            </span>
            {/* <span className="text-sm font-medium text-red-600">
              {calculateDiscount()}% OFF
            </span> */}
          </div>

          {/* Delivery Options */}
          <div className="border rounded-lg p-4 space-y-4 bg-white">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Free Standard Delivery</p>
                <p className="text-xs text-gray-500">
                  Arrives within 3-5 business days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Store Pickup</p>
                <p className="text-xs text-gray-500">
                  Usually ready in 2 hours
                </p>
              </div>
            </div>
          </div>

          {/* Add to Cart Section */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <select
                // value={quantity}
                // onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20 rounded-lg border border-gray-200 px-3 py-2"
              >
                {/* {[...Array(Math.min(10, product.stock_total))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))} */}
              </select>
              <button
                className="flex-1 bg-black text-white rounded-lg font-medium hover:bg-gray-800 py-2"
                disabled={product.stock_total === 0}
              >
                <ProductForm
                  productOptions={productOptions}
                  selectedVariant={selectedVariant}
                />
              </button>

              <button className="p-3 border border-gray-200 rounded-lg hover:border-gray-300">
                <Heart className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-4 pt-6">
        <h3 className="font-medium">Product Details</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">SKU:</span>{' '}
            {product.selectedOrFirstAvailableVariant.sku}
          </p>
          <div className="mt-2">
            <div
              dangerouslySetInnerHTML={{
                __html: product.descriptionHtml,
              }}
            />
          </div>
        </div>
      </div>
    </div>

    // <div className="product">
    //   <ProductImage image={selectedVariant?.image} />
    //   <div className="product-main">
    //     <h1>{title}</h1>
    //     <ProductPrice
    //       price={selectedVariant?.price}
    //       compareAtPrice={selectedVariant?.compareAtPrice}
    //     />
    //     <br />
    //     <ProductForm
    //       productOptions={productOptions}
    //       selectedVariant={selectedVariant}
    //     />
    //     <br />
    //     <br />
    //     <p>
    //       <strong>Description</strong>
    //     </p>
    //     <br />
    //     <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
    //     <br />
    //   </div>
    //   <Analytics.ProductView
    //     data={{
    //       products: [
    //         {
    //           id: product.id,
    //           title: product.title,
    //           price: selectedVariant?.price.amount || '0',
    //           vendor: product.vendor,
    //           variantId: selectedVariant?.id || '',
    //           variantTitle: selectedVariant?.title || '',
    //           quantity: 1,
    //         },
    //       ],
    //     }}
    //   />
    // </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    images(first: 100) {
      edges {
        node {
          url
          altText
        }
      }
    }
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
