// CivicConnect - Central Category Rules & Concept Matcher Engine
// Strict civic rules for AI label normalization, scoring, and decision policies

const CATEGORIES = {
  road_damage: {
    key: 'road_damage',
    displayName: 'Damaged Roads',
    description: 'Potholes, road cracks, collapsed asphalt, sunken road surface',
    // Strong signals proving damage exists
    acceptedConcepts: [
      'pothole', 'road damage', 'crack', 'broken road', 'damaged road', 
      'sinkhole', 'cavity', 'erosion', 'rut', 'pit', 'depression', 
      'tar break', 'gravel displacement', 'asphalt damage', 'trench'
    ],
    // Supporting/generic concepts (do NOT alone prove damage)
    supportingConcepts: [
      'road', 'street', 'asphalt', 'pavement', 'highway', 'lane', 
      'thoroughfare', 'tarmac', 'road surface', 'infrastructure'
    ],
    // Specific concepts proving a different civic problem or unrelated object
    rejectedConcepts: [
      'garbage', 'waste', 'trash', 'litter', 'street light', 'lamp post', 
      'water pipe', 'flood', 'drain', 'sewer', 'traffic light', 'food', 
      'animal', 'indoor', 'document', 'selfie', 'face', 'bedroom', 'kitchen'
    ],
    uncertainConcepts: [
      'construction', 'patch', 'road work', 'pebbles', 'manhole cover'
    ],
    guidance: 'Please upload a clear photo of the pothole, crack, or damaged road surface.'
  },

  garbage_overflow: {
    key: 'garbage_overflow',
    displayName: 'Overflowing Garbage',
    description: 'Uncollected trash, overflowing public dumpsters, roadside waste piles',
    acceptedConcepts: [
      'garbage', 'waste', 'trash', 'litter', 'rubbish', 'garbage bin', 
      'dumpster', 'waste pile', 'landfill', 'debris', 'scrap', 'refuse', 
      'plastic waste', 'overflowing trash', 'waste container'
    ],
    supportingConcepts: [
      'bin', 'container', 'can', 'bag', 'plastic', 'alley', 'curb'
    ],
    rejectedConcepts: [
      'pothole', 'street light', 'lamp post', 'pipe burst', 'traffic light', 
      'food preparation', 'meal', 'restaurant', 'clean road', 'indoor room', 
      'selfie', 'pet'
    ],
    uncertainConcepts: [
      'recycling', 'cardboard box', 'leaves', 'dry grass', 'compost'
    ],
    guidance: 'Please upload a clear photo of the overflowing garbage, waste pile, or uncollected dumpster.'
  },

  broken_streetlight: {
    key: 'broken_streetlight',
    displayName: 'Broken Streetlights',
    description: 'Dark streets, damaged lamp post, faulty LED fixture, exposed wires',
    acceptedConcepts: [
      'street light', 'street lamp', 'lamp post', 'light pole', 'utility pole', 
      'damaged pole', 'broken light', 'luminaire', 'lantern', 'lighting fixture', 
      'electric pole', 'wire dangling', 'dark fixture'
    ],
    supportingConcepts: [
      'pole', 'light', 'night', 'sky', 'electricity', 'wire', 'outdoor lighting'
    ],
    rejectedConcepts: [
      'pothole', 'asphalt crack', 'garbage pile', 'water leak', 'open drain', 
      'indoor lamp', 'ceiling light', 'table lamp', 'food', 'animal', 'room'
    ],
    uncertainConcepts: [
      'daylight street', 'traffic pole', 'solar panel', 'cctv pole'
    ],
    guidance: 'Please upload a clear photo of the non-functional streetlight fixture or damaged pole.'
  },

  water_leakage: {
    key: 'water_leakage',
    displayName: 'Water Leakage',
    description: 'Municipal pipeline rupture, potable water wastage, pressurized pipe leak',
    acceptedConcepts: [
      'water leak', 'leaking pipe', 'burst pipe', 'water pipe', 'pipe', 
      'plumbing', 'water flow', 'ruptured conduit', 'spraying water', 
      'gushing water', 'water gush', 'potable water'
    ],
    supportingConcepts: [
      'water', 'stream', 'puddle', 'wet', 'valve', 'hydrant', 'trench'
    ],
    rejectedConcepts: [
      'pothole without water', 'garbage bin', 'streetlight', 'traffic signal', 
      'indoor sink', 'shower', 'bathroom', 'lake', 'river', 'ocean', 'rain', 
      'beverage', 'drinking glass'
    ],
    uncertainConcepts: [
      'rain puddle', 'flood', 'drain overflow', 'wet asphalt'
    ],
    guidance: 'Please upload a clear photo showing the ruptured pipeline or leaking municipal water source.'
  },

  drainage_problem: {
    key: 'drainage_problem',
    displayName: 'Drainage Problems',
    description: 'Clogged storm gutters, overflowing open sewage, blocked municipal drains',
    acceptedConcepts: [
      'drain', 'drainage', 'sewer', 'sewage', 'gutter', 'blocked drain', 
      'wastewater', 'overflowing drain', 'manhole', 'culvert', 'storm drain', 
      'sewer grate', 'sludge', 'choked gutter'
    ],
    supportingConcepts: [
      'grate', 'channel', 'ditch', 'concrete drain', 'cover', 'curb'
    ],
    rejectedConcepts: [
      'clean potable pipe', 'streetlight', 'dry pothole', 'traffic light', 
      'indoor toilet', 'kitchen sink', 'food', 'pet', 'living room'
    ],
    uncertainConcepts: [
      'water puddle', 'stagnant water', 'debris near drain'
    ],
    guidance: 'Please upload a clear photo of the clogged drain, overflowing gutter, or choked sewer grate.'
  },

  broken_traffic_light: {
    key: 'broken_traffic_light',
    displayName: 'Broken Traffic Light',
    description: 'Non-operational traffic signal, damaged junction lights, detached signal head',
    acceptedConcepts: [
      'traffic light', 'traffic signal', 'signal light', 'stoplight', 
      'damaged traffic signal', 'broken signal', 'junction signal'
    ],
    supportingConcepts: [
      'intersection', 'junction', 'crossroad', 'traffic sign', 'pole'
    ],
    rejectedConcepts: [
      'garbage', 'pothole', 'water pipe', 'sewer', 'indoor light', 'food', 'animal'
    ],
    uncertainConcepts: [
      'traffic sign', 'billboard', 'street lamp'
    ],
    guidance: 'Please upload a clear photo of the non-operational or damaged traffic signal.'
  },

  other: {
    key: 'other',
    displayName: 'Other Civic Infrastructure',
    description: 'General public infrastructure issues not categorized above',
    acceptedConcepts: [
      'infrastructure', 'public property', 'footpath', 'railing', 'bench', 
      'divider', 'boundary wall', 'public signboard', 'bus shelter'
    ],
    supportingConcepts: ['city', 'public', 'urban', 'concrete'],
    rejectedConcepts: ['indoor room', 'food', 'animal', 'meme', 'document', 'selfie'],
    uncertainConcepts: ['building', 'park'],
    guidance: 'Please upload a clear photo of the civic infrastructure problem.'
  },

  irrelevant: {
    key: 'irrelevant',
    displayName: 'Irrelevant Content',
    description: 'Non-civic items such as food, pets, indoor rooms, documents, memes, selfies',
    acceptedConcepts: [
      'food', 'meal', 'dish', 'cuisine', 'recipe', 'snack', 'fast food',
      'animal', 'dog', 'cat', 'pet', 'wildlife', 'bird',
      'person', 'people', 'human face', 'selfie', 'portrait', 'crowd',
      'indoor', 'room', 'bedroom', 'living room', 'kitchen', 'furniture', 'couch', 'bed',
      'document', 'paper', 'text', 'screenshot', 'receipt', 'screen', 'display',
      'meme', 'cartoon', 'illustration', 'clipart', 'advertisement', 'poster',
      'clothing', 'shoe', 'shirt', 'dress', 'fashion accessory',
      'vehicle interior', 'car dashboard', 'steering wheel',
      'blank', 'monochrome', 'black screen', 'white screen'
    ],
    supportingConcepts: [],
    rejectedConcepts: [],
    uncertainConcepts: [],
    guidance: 'The uploaded photo does not appear to show a municipal civic problem.'
  }
};

// Map existing UI names or aliases to canonical internal key
const ALIAS_MAP = {
  'damaged roads': 'road_damage',
  'damaged road': 'road_damage',
  'road damage': 'road_damage',
  'road_damage': 'road_damage',
  'pothole': 'road_damage',
  'potholes': 'road_damage',

  'overflowing garbage': 'garbage_overflow',
  'garbage overflow': 'garbage_overflow',
  'garbage_overflow': 'garbage_overflow',
  'garbage': 'garbage_overflow',
  'waste': 'garbage_overflow',
  'trash': 'garbage_overflow',

  'broken streetlights': 'broken_streetlight',
  'broken streetlight': 'broken_streetlight',
  'broken_streetlight': 'broken_streetlight',
  'streetlights': 'broken_streetlight',
  'street light': 'broken_streetlight',
  'streetlight': 'broken_streetlight',

  'water leakage': 'water_leakage',
  'water_leakage': 'water_leakage',
  'pipe burst': 'water_leakage',
  'water leak': 'water_leakage',

  'drainage problems': 'drainage_problem',
  'drainage problem': 'drainage_problem',
  'drainage_problem': 'drainage_problem',
  'drainage': 'drainage_problem',
  'sewage': 'drainage_problem',
  'sewer': 'drainage_problem',

  'broken traffic light': 'broken_traffic_light',
  'broken traffic lights': 'broken_traffic_light',
  'broken_traffic_light': 'broken_traffic_light',
  'traffic light': 'broken_traffic_light',

  'damaged infrastructure': 'other',
  'infrastructure': 'other',
  'other': 'other',
  'other civic issue': 'other',

  'irrelevant': 'irrelevant'
};

function normalizeCategory(cat) {
  if (!cat) return 'other';
  const clean = String(cat).trim().toLowerCase();
  return ALIAS_MAP[clean] || (CATEGORIES[clean] ? clean : 'other');
}

function getCategoryConfig(cat) {
  const key = normalizeCategory(cat);
  return CATEGORIES[key] || CATEGORIES.other;
}

module.exports = {
  CATEGORIES,
  ALIAS_MAP,
  normalizeCategory,
  getCategoryConfig
};
