import React, { useState, useEffect } from "react";
import { Product } from "@/types";
import { productsAPI } from "@/utils/api";
import toast from "react-hot-toast";
import Layout from "@/components/Layout";
import { Edit, Trash2, Plus, X } from "lucide-react";

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

    // Form state - store price as string for formatting
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        description: "",
    });

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getAllProducts();
            if (response.data?.success) {
                setProducts(response.data.data || []);
            } else {
                setError(response.data?.error || "Failed to fetch products");
            }
        } catch (err) {
            setError("An error occurred while fetching products");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        
        if (name === "price") {
            // Remove non-digit characters and format with thousand separators
            const numericValue = value.replace(/\D/g, "");
            const formattedValue = numericValue === ""
                ? ""
                : `Rp ${parseInt(numericValue, 10).toLocaleString("id-ID")}`;
            
            setFormData({
                ...formData,
                price: formattedValue,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleEditClick = (product: Product) => {
        setIsEditing(true);
        setCurrentProduct(product);
        setFormData({
            name: product.name,
            // Convert number to formatted string with "Rp" prefix
            price: product.price ? `Rp ${product.price.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "",
            description: product.description,
        });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setCurrentProduct(null);
        setFormData({ name: "", price: "", description: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Prepare data for API - convert formatted price to number
            const priceValue = formData.price.replace(/\D/g, "");
            const apiData = {
                ...formData,
                price: priceValue ? parseInt(priceValue, 10) : 0
            };
            
            if (isEditing && currentProduct) {
                // Update existing product
                const response = await productsAPI.updateProduct(
                    currentProduct.id,
                    apiData
                );
                if (response.data?.success) {
                    toast.success("Product updated successfully");
                    fetchProducts();
                    handleCancelEdit();
                    setIsModalOpen(false); // Close modal on success
                } else {
                    toast.error(
                        response.data?.error || "Failed to update product"
                    );
                }
            } else {
                // Create new product
                const response = await productsAPI.createProduct(apiData);
                if (response.data?.success) {
                    toast.success("Product created successfully");
                    fetchProducts();
                    setFormData({ name: "", price: "", description: "" });
                    setIsModalOpen(false); // Close modal on success
                } else {
                    toast.error(
                        response.data?.error || "Failed to create product"
                    );
                }
            }
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                const response = await productsAPI.deleteProduct(id);
                if (response.data?.success) {
                    toast.success("Product deleted successfully");
                    fetchProducts();
                } else {
                    toast.error(
                        response.data?.error || "Failed to delete product"
                    );
                }
            } catch (err) {
                toast.error("An error occurred. Please try again.");
                console.error(err);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded shadow">
                <p>{error}</p>
                <button
                    onClick={fetchProducts}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Modal for Add/Edit Product */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-semibold mb-4">
                                {isEditing ? "Update Product" : "Add New Product"}
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nama Produk
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Harga
                                        </label>
                                        <input
                                            type="text"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Deskripsi
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                                    >
                                        {isEditing ? (
                                            <>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Update Produk
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Tambah Produk
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            handleCancelEdit();
                                        }}
                                        className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Products</h1>
                        <p className="text-gray-600 mt-1">Kelola informasi produk</p>
                    </div>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setCurrentProduct(null);
                            setFormData({ name: "", price: "", description: "" });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </button>
                </div>

                {/* Product List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Nama Produk
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Harga
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Deskripsi
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-6 py-4 text-center text-sm text-gray-500"
                                            >
                                                No products found
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product) => (
                                            <tr
                                                key={product.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {product.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Intl.NumberFormat("id-ID", {
                                                        style: "currency",
                                                        currency: "IDR",
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0
                                                    }).format(product.price)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {product.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                handleEditClick(product);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
                                                        >
                                                            <Edit className="mr-1 h-4 w-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(product.id)
                                                            }
                                                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200"
                                                        >
                                                            <Trash2 className="mr-1 h-4 w-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ProductsPage;
