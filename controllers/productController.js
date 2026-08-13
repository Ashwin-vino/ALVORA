/**
 * Product Controller
 * Handles product display, categories, single detail view, filtering, and search functionality.
 */

const supabase = require('../config/supabase');
const { throwIfSupabaseError } = require('../utils/databaseHelpers');
const { mapProduct } = require('../utils/databaseMappers');

async function getProducts(filters = {}) {
  let query = supabase.from('products').select('*');

  if (filters.category && filters.category !== 'new') {
    query = query.eq('category', filters.category);
  }

  if (Number.isFinite(filters.minPrice)) {
    query = query.gte('price', filters.minPrice);
  }

  if (Number.isFinite(filters.maxPrice)) {
    query = query.lte('price', filters.maxPrice);
  }

  const { data, error } = await query.order(filters.sortField || 'created_at', {
    ascending: filters.ascending === true
  });

  throwIfSupabaseError(error, 'product listing');
  return (data || []).map(mapProduct);
}

// Home Page Catalog Loader
exports.getHomePage = async (req, res, next) => {
  try {
    const products = await getProducts({ sortField: 'created_at' });

    const menProducts = products.filter(p => p.category === 'men');
    const womenProducts = products.filter(p => p.category === 'women');
    const kidsProducts = products.filter(p => p.category === 'kids');

    const getSafeProduct = (list, index) => list.length > index ? list[index] : list[0];

    const featuredProducts = [
      getSafeProduct(menProducts, 0),
      getSafeProduct(womenProducts, 0),
      getSafeProduct(kidsProducts, 0)
    ].filter(Boolean);

    const newArrivals = [
      getSafeProduct(menProducts, 1),
      getSafeProduct(womenProducts, 1),
      getSafeProduct(kidsProducts, 1)
    ].filter(Boolean);

    const bestSellers = [
      getSafeProduct(menProducts, 2),
      getSafeProduct(womenProducts, 2),
      getSafeProduct(kidsProducts, 2)
    ].filter(Boolean);

    res.render('home', {
      title: 'ALVORA | Elevated Leisure. Quiet Prestige.',
      metaDescription: 'ALVORA luxury fashion house featuring quiet luxury essentials, tailored silhouettes, elegant womenswear, menswear, and statement accessories for elevated everyday dressing.',
      featuredProducts,
      newArrivals,
      bestSellers
    });
  } catch (error) {
    next(error);
  }
};

// Full Collection Page with Filter & Sort
exports.getCollection = async (req, res, next) => {
  try {
    const { category, sort, minPrice, maxPrice } = req.query;
    const normalizedCategory = category && category !== 'all' ? String(category).toLowerCase() : undefined;

    let sortField = 'created_at';
    let ascending = false;

    if (sort === 'price-asc' || sort === 'price-low') {
      sortField = 'price';
      ascending = true;
    }

    if (sort === 'price-desc' || sort === 'price-high') {
      sortField = 'price';
      ascending = false;
    }

    if (sort === 'oldest') {
      sortField = 'created_at';
      ascending = true;
    }

    const isNewOnly = normalizedCategory === 'new';
    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);

    const products = await getProducts({
      category: isNewOnly ? undefined : normalizedCategory,
      minPrice: minPrice && Number.isFinite(parsedMinPrice) ? parsedMinPrice : undefined,
      maxPrice: maxPrice && Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : undefined,
      sortField,
      ascending
    });

    const collectionMetaDescription = normalizedCategory && normalizedCategory !== 'all'
      ? `Shop the ALVORA ${normalizedCategory.toUpperCase()} collection featuring refined silhouettes, premium fabrics, and elevated essentials for contemporary luxury dressing.`
      : 'Shop the ALVORA full collection featuring refined silhouettes, premium fabrics, and elevated essentials for contemporary luxury dressing.';

    res.render('collection', {
      title: 'Collection | ALVORA MAISON',
      metaDescription: collectionMetaDescription,
      products,
      selectedCategory: normalizedCategory || 'all',
      selectedSort: sort || 'newest',
      minPrice: minPrice || '',
      maxPrice: maxPrice || ''
    });
  } catch (error) {
    next(error);
  }
};

// Men's Collection Page
exports.getMenProducts = async (req, res, next) => {
  try {
    const { sort } = req.query;
    let sortField = 'created_at';
    let ascending = false;

    if (sort === 'price-asc') {
      sortField = 'price';
      ascending = true;
    }

    if (sort === 'price-desc') {
      sortField = 'price';
      ascending = false;
    }

    if (sort === 'oldest') {
      sortField = 'created_at';
      ascending = true;
    }

    const products = await getProducts({ category: 'men', sortField, ascending });
    res.render('men', {
      title: "Men's Collection | ALVORA MAISON",
      metaDescription: 'Explore ALVORA men’s luxury essentials including tailored jackets, refined knitwear, and elevated wardrobe staples designed for modern sophistication.',
      products,
      currentSort: sort || 'newest'
    });
  } catch (error) {
    next(error);
  }
};

// Women's Collection Page
exports.getWomenProducts = async (req, res, next) => {
  try {
    const { sort } = req.query;
    let sortField = 'created_at';
    let ascending = false;

    if (sort === 'price-asc') {
      sortField = 'price';
      ascending = true;
    }

    if (sort === 'price-desc') {
      sortField = 'price';
      ascending = false;
    }

    if (sort === 'oldest') {
      sortField = 'created_at';
      ascending = true;
    }

    const products = await getProducts({ category: 'women', sortField, ascending });
    res.render('women', {
      title: "Women's Collection | ALVORA MAISON",
      metaDescription: 'Explore ALVORA women’s luxury essentials featuring sculptural silhouettes, fine fabrics, and elevated statement pieces for modern elegance.',
      products,
      currentSort: sort || 'newest'
    });
  } catch (error) {
    next(error);
  }
};

// Kids' Collection Page
exports.getKidsProducts = async (req, res, next) => {
  try {
    const { sort } = req.query;
    let sortField = 'created_at';
    let ascending = false;

    if (sort === 'price-asc') {
      sortField = 'price';
      ascending = true;
    }

    if (sort === 'price-desc') {
      sortField = 'price';
      ascending = false;
    }

    if (sort === 'oldest') {
      sortField = 'created_at';
      ascending = true;
    }

    const products = await getProducts({ category: 'kids', sortField, ascending });
    res.render('kids', {
      title: "Kids' Collection | ALVORA MAISON",
      metaDescription: 'Discover ALVORA kids’ luxury essentials built for comfort, quality, and refined everyday style in a family-friendly wardrobe.',
      products,
      currentSort: sort || 'newest'
    });
  } catch (error) {
    next(error);
  }
};

// Footwear Collection Page
exports.getFootwearProducts = async (req, res, next) => {
  try {
    const { sort } = req.query;
    let sortField = 'created_at';
    let ascending = false;

    if (sort === 'price-asc') {
      sortField = 'price';
      ascending = true;
    }

    if (sort === 'price-desc') {
      sortField = 'price';
      ascending = false;
    }

    if (sort === 'oldest') {
      sortField = 'created_at';
      ascending = true;
    }

    const products = await getProducts({ category: 'footwear', sortField, ascending });
    res.render('footwear', {
      title: 'Footwear Collection | ALVORA MAISON',
      metaDescription: 'Discover ALVORA footwear designed with comfort, craftsmanship, and modern luxury in mind, from refined leather essentials to everyday statement shoes.',
      products,
      currentSort: sort || 'newest'
    });
  } catch (error) {
    next(error);
  }
};

// Single Product Details Page
exports.getProductDetails = async (req, res, next) => {
  try {
    const productId = Number.parseInt(req.params.slug, 10);
    if (!Number.isSafeInteger(productId) || String(productId) !== req.params.slug) {
      return res.status(404).render('404', {
        title: 'Product Not Found | ALVORA'
      });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    throwIfSupabaseError(error, 'product detail lookup');
    const product = mapProduct(data);

    if (!product) {
      return res.status(404).render('404', {
        title: 'Product Not Found | ALVORA'
      });
    }

    const { data: relatedData, error: relatedError } = await supabase
      .from('products')
      .select('*')
      .eq('category', product.category)
      .neq('id', product.id)
      .order('created_at', { ascending: false })
      .limit(4);

    throwIfSupabaseError(relatedError, 'related product lookup');
    const relatedProducts = (relatedData || []).map(mapProduct);

    const productDescription = product.description
      ? `${product.name} by ALVORA — ${product.description.replace(/\s+/g, ' ').trim().slice(0, 150)}${product.description.length > 150 ? '...' : ''}`
      : `${product.name} by ALVORA — luxury essentials designed with refined craftsmanship and modern elegance.`;

    res.render('product', {
      title: `${product.name} | ALVORA MAISON`,
      metaDescription: productDescription,
      ogImage: product.images && product.images.length > 0 ? product.images[0] : undefined,
      product,
      relatedProducts
    });
  } catch (error) {
    next(error);
  }
};

// Search Products Page
exports.searchProducts = async (req, res, next) => {
  try {
    const query = req.query.q || '';
    let products = [];

    if (query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      const allProducts = await getProducts();
      products = allProducts.filter((product) => {
        return [
          product.name,
          product.description,
          product.collectionName,
          product.category,
          product.brand
        ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      });
    }

    const searchMetaDescription = query.trim()
      ? `Search ALVORA for ${query.trim()} and discover refined luxury essentials from the house collection.`
      : 'Search the ALVORA collection for luxury essentials, tailored silhouettes, and elevated wardrobe staples.';

    res.render('search', {
      title: query ? `Search: "${query}" | ALVORA` : 'Search | ALVORA',
      metaDescription: searchMetaDescription,
      query,
      products
    });
  } catch (error) {
    next(error);
  }
};
