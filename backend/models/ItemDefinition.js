import mongoose from 'mongoose';

const itemDefinitionSchema = new mongoose.Schema({
  // 1. Brand ka naam (e.g., Weldon Paints)
  brandName: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  
  // 2. Units jo is brand mein istemal hoty hain
  units: [{ type: String }], 

  // 3. Products list (e.g., Weather Shield, Emulsion)
  products: [{
    itemName: { type: String, required: true },
    hasColors: { type: Boolean, default: false },
    colors: [{
      code: { type: String },    // e.g., "1951"
      colour: { type: String }   // e.g., "White"
    }]
  }]
}, { timestamps: true });

const ItemDefinition = mongoose.model('ItemDefinition', itemDefinitionSchema);
export default ItemDefinition;




