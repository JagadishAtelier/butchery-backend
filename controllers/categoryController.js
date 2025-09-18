const Category = require("../Model/categoryModel");

// ✅ Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image, subcategories } = req.body;

    // Check if category already exists
    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({
      name,
      description,
      image,
      subcategories: subcategories || [],
    });

    await category.save();
    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update category
exports.updateCategory = async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category updated", updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Add a subcategory by name
exports.addSubcategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) return res.status(404).json({ message: "Category not found" });

    // Prevent duplicate subcategory names
    if (category.subcategories.some((sub) => sub.name === name)) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }

    category.subcategories.push({ name, description, image });
    await category.save();

    res.status(201).json({ message: "Subcategory added", category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Remove a subcategory by name
exports.removeSubcategory = async (req, res) => {
  try {
    const { id, subName } = req.params;
    const category = await Category.findById(id);

    if (!category) return res.status(404).json({ message: "Category not found" });

    const index = category.subcategories.findIndex((sub) => sub.name === subName);
    if (index === -1) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    category.subcategories.splice(index, 1);
    await category.save();

    res.json({ message: "Subcategory removed", category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
