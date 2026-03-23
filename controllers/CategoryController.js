import Category from "../models/Category.js";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") 
    .replace(/[^\w\-]+/g, "") 
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "") 
    .replace(/-+$/, "");

// ✅ Create Category (Main or Sub)
export const createCategory = async (req, res) => {
  try {
    const { name, categoryType, parentCategory } = req.body;

    // slug auto-generate
    const slug = slugify(name);

    if (categoryType === "subcategory") {
      if (!parentCategory) {
        return res.status(400).json({ message: "Parent category required for subcategory" });
      }
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const newCategory = new Category({ ...req.body, slug });
    const savedCategory = await newCategory.save();

    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { active } = req.query;
    let filter = {};
    if (active) filter.isActive = active === "true";

    const categories = await Category.find(filter).sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id).populate("parentCategory");
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const { name, categoryType, parentCategory } = req.body;

    if (name) req.body.slug = slugify(name);

    if (categoryType === "subcategory" && parentCategory) {
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedCategory) return res.status(404).json({ message: "Category not found" });

    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete Category
export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const hasChildren = await Category.findOne({ parentCategory: id });
    if (hasChildren) {
      return res
        .status(400)
        .json({ message: "Cannot delete category with subcategories" });
    }

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Category Tree (main + subcategories nested)
export const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find().lean();

    const map = {};
    categories.forEach((cat) => (map[cat._id] = { ...cat, children: [] }));

    const tree = [];
    categories.forEach((cat) => {
      if (cat.parentCategory) {
        map[cat.parentCategory]?.children.push(map[cat._id]);
      } else {
        tree.push(map[cat._id]);
      }
    });

    res.json(tree);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
