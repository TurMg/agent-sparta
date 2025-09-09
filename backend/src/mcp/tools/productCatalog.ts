import { dbAll, dbGet } from '../../database/init';

/**
 * Get all products from the database
 * @returns Promise resolving to array of products
 */
export async function getAllProducts() {
  try {
    const products = await dbAll('SELECT * FROM products ORDER BY name');
    return {
      success: true,
      data: products
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get a specific product by ID
 * @param id Product ID
 * @returns Promise resolving to product object or null if not found
 */
export async function getProductById(id: string) {
  try {
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }
    
    return {
      success: true,
      data: product
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Search products by name or description
 * @param query Search query
 * @returns Promise resolving to array of matching products
 */
export async function searchProducts(query: string) {
  try {
    // Using LIKE for case-insensitive search
    const products = await dbAll(
      'SELECT * FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY name',
      [`%${query}%`, `%${query}%`]
    );
    
    return {
      success: true,
      data: products
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}