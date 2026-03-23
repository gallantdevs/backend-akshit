import Wishlist from "../models/Wishlist.js";

export const addToWishlist = async (req, res) => {
  try {
    const { userId, productId, note } = req.body;

    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      return res.status(400).json({ message: "Already in wishlist" });
    }

    const newWishlist = new Wishlist({ userId, productId, note });
    await newWishlist.save();

    res.status(201).json({
      message: "Product added to wishlist",
      wishlist: newWishlist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ 2. Get all wishlist items for a user
export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    const wishlistItems = await Wishlist.find({ userId }).populate("productId");
    res.status(200).json(wishlistItems);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const updatedWishlist = await Wishlist.findByIdAndUpdate(
      id,
      { note },
      { new: true }
    );

    if (!updatedWishlist) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    res.status(200).json({
      message: "Wishlist updated successfully",
      wishlist: updatedWishlist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedItem = await Wishlist.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    res.status(200).json({ message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const clearWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    await Wishlist.deleteMany({ userId });
    res.status(200).json({ message: "Wishlist cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
