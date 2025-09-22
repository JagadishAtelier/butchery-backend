const Cart = require("../Model/Cart");
const User = require("../Model/User");
const Product = require("../Model/ProductModel");
// Add item to cart
exports.addToCart = async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user._id;
  
      const product = await Product.findById(productId);
      console.log("products id :",product)
      if (!product) return res.status(404).json({ message: "Product not found" });
  
      let cart = await Cart.findOne({ user: userId });
  
      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [{ product: productId, quantity, price }],
        });
      } else {
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += quantity;
        } else {
          cart.items.push({ product: productId, quantity, price: product.price });
        }
      }
  
      await cart.save();
      res.status(200).json({ success: true, data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Get user's cart
  exports.getCart = async (req, res) => {
    try {
      const userId = req.user._id;
      const cart = await Cart.findOne({ user: userId }).populate("items.product", "name price image");
  
      if (!cart) return res.status(404).json({ message: "Cart is empty" });
      res.status(200).json({ success: true, data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Remove item from cart
  exports.removeFromCart = async (req, res) => {
    try {
      const userId = req.user._id;
      const { productId } = req.params;
  
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ message: "Cart not found" });
  
      cart.items = cart.items.filter(item => item.product.toString() !== productId);
      await cart.save();
  
      res.status(200).json({ success: true, data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
