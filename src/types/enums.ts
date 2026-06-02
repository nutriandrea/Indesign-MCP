export const ExportFormat = {
  pdfType: 'pdfType',
  epubType: 'epubType',
  htmlType: 'htmlType',
  jpgType: 'jpgType',
  pngType: 'pngType',
  gifType: 'gifType',
  swfType: 'swfType',
  xmlType: 'xmlType',
  packageType: 'packageType',
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export const LocationOptions = {
  before: 'before',
  after: 'after',
  atBeginning: 'atBeginning',
  atEnd: 'atEnd',
  unknown: 'unknown',
} as const;

export type LocationOptions =
  (typeof LocationOptions)[keyof typeof LocationOptions];

export const SaveOptions = {
  yes: 'yes',
  no: 'no',
  ask: 'ask',
} as const;

export type SaveOptions = (typeof SaveOptions)[keyof typeof SaveOptions];

export const Units = {
  points: 'points',
  picas: 'picas',
  inches: 'inches',
  millimeters: 'millimeters',
  centimeters: 'centimeters',
  ciceros: 'ciceros',
  pixels: 'pixels',
} as const;

export type Units = (typeof Units)[keyof typeof Units];

export const PageOrientation = {
  portrait: 'portrait',
  landscape: 'landscape',
  reversePortrait: 'reversePortrait',
  reverseLandscape: 'reverseLandscape',
} as const;

export type PageOrientation =
  (typeof PageOrientation)[keyof typeof PageOrientation];

export const Alignment = {
  leftAlign: 'leftAlign',
  centerAlign: 'centerAlign',
  rightAlign: 'rightAlign',
  justifyAlign: 'justifyAlign',
} as const;

export type Alignment = (typeof Alignment)[keyof typeof Alignment];

export const LayerProperties = {
  visible: 'visible',
  locked: 'locked',
  printable: 'printable',
  guideLayer: 'guideLayer',
} as const;

export type LayerProperties =
  (typeof LayerProperties)[keyof typeof LayerProperties];

export const EffectTypes = {
  dropShadow: 'dropShadow',
  innerShadow: 'innerShadow',
  outerGlow: 'outerGlow',
  innerGlow: 'innerGlow',
  bevelEmboss: 'bevelEmboss',
  satin: 'satin',
  basicFeather: 'basicFeather',
  directionalFeather: 'directionalFeather',
  gradientFeather: 'gradientFeather',
} as const;

export type EffectTypes = (typeof EffectTypes)[keyof typeof EffectTypes];
