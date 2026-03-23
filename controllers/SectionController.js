import Section from "../models/Section.js";
import Category from "../models/Category.js";

// Create Section
export const createSection = async (req, res, next) => {
  try {
    const newSection = new Section(req.body);
    const savedSection = await newSection.save();
    res.status(201).json({
      message: "Section created successfully",
      section: savedSection,
      success: true
    });
  } catch (err) {
    console.error("Error creating section:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get All Sections 
export const getSections = async (req, res, next) => {
  try {
    const sections = await Section.find()
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort({ order: 1 });
    res.status(200).json(sections);
  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Update Section
export const updateSection = async (req, res, next) => {
  try {
    const updatedSection = await Section.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true }
    )
      .populate("category", "name slug")
      .populate("subCategory", "name slug");

    if (!updatedSection)
      return res.status(404).json({ message: "Section not found", success: false });

    res.status(200).json({
      message: "Section updated successfully",
      section: updatedSection,
      success: true
    });
  } catch (err) {
    console.error("Error updating section:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Delete Section
export const deleteSection = async (req, res, next) => {
  try {
    const deletedSection = await Section.findByIdAndDelete(req.params.id);
    if (!deletedSection)
      return res.status(404).json({ message: "Section not found", success: false });

    res.status(200).json({
      message: "Section deleted successfully",
      success: true
    });
  } catch (err) {
    console.error("Error deleting section:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get only Active Sections (for homepage)
export const getActiveSections = async (req, res, next) => {
  try {
    const sections = await Section.find({ isActive: true })
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort({ order: 1 });

    res.status(200).json(sections);
  } catch (err) {
    console.error("Error fetching active sections:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};
