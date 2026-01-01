const mongoose = require('mongoose');

const phaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Keimling', 'Vegetation', 'Blüte', 'Spülen', 'Trocknen']
  },
  duration: {
    type: Number, // in Tagen
    required: true
  },
  lightHours: {
    type: Number,
    default: 18
  },
  tempDay: {
    min: Number,
    target: Number,
    max: Number
  },
  tempNight: {
    min: Number,
    target: Number,
    max: Number
  },
  humidity: {
    min: Number,
    target: Number,
    max: Number
  },
  vpd: {
    min: Number,
    target: Number,
    max: Number
  },
  ec: {
    min: Number,
    target: Number,
    max: Number
  },
  ph: {
    min: Number,
    target: Number,
    max: Number
  },
  wateringInterval: Number, // in Stunden
  description: String,
  tips: [String]
});

const growRecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  strain: String,
  type: {
    type: String,
    enum: ['Indica', 'Sativa', 'Hybrid', 'Autoflower', 'CBD'],
    default: 'Hybrid'
  },
  difficulty: {
    type: String,
    enum: ['Anfänger', 'Fortgeschritten', 'Experte'],
    default: 'Anfänger'
  },
  totalDuration: Number, // in Tagen
  yieldEstimate: {
    min: Number,
    max: Number,
    unit: { type: String, default: 'g/plant' }
  },
  description: String,
  phases: [phaseSchema],
  tags: [String],
  author: {
    type: String,
    default: 'System'
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: {
    type: Number,
    default: 0
  },
  uses: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indizes für schnelle Suche
growRecipeSchema.index({ name: 1 });
growRecipeSchema.index({ strain: 1 });
growRecipeSchema.index({ type: 1 });
growRecipeSchema.index({ isTemplate: 1 });
growRecipeSchema.index({ tags: 1 });

module.exports = mongoose.model('GrowRecipe', growRecipeSchema);
