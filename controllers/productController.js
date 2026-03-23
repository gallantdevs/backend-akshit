import Product from "../models/Product.js";
import Category from "../models/Category.js";

// 🟢 Create Product
export const createProduct = async (req, res) => {
  try {
    if (!req.body.stock) {
      req.body.stock = {
        totalQty: 0,
        reservedQty: 0,
        lowStockThreshold: 5,
        isInStock: true,
      };
    }
   req.body.gst = Number(req.body.gst) || 0;
    const newProduct = new Product(req.body);
    let savedProduct = await newProduct.save();
    savedProduct = await savedProduct.populate("category");

     res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
      gstDetails: savedProduct.gstDetails, 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


export const getProducts = async (req, res) => {
  try {
    const {
      category,        
      subcategory,     
      tag,             
      general,         
      search,           
      sortBy,         
      // page = 1,  
      // limit = 20, 
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }

    if (subcategory) {
      const sub = await Category.findOne({ slug: subcategory });
      if (sub) filter.category = sub._id;
    }

    if (general) {
      const gen = await Category.findOne({ slug: general });
      if (gen) filter.category = gen._id;
    }

    if (tag) {
      filter.tags = { $regex: tag, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "price_asc") sortOption = { price: 1 };
    else if (sortBy === "price_desc") sortOption = { price: -1 };
    else if (sortBy === "newest") sortOption = { createdAt: -1 };

    
    const products = await Product.find(filter)
      .populate("category")
      .populate("parentCategory")
      .sort(sortOption)
        .lean(); ;

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// 🟢 Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("parentCategory");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json(product.toJSON());
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
  }
};

// 🟢 Update Product
export const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("category")
      .populate("parentCategory");

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
  }
};

// 🟢 Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
  }
};
