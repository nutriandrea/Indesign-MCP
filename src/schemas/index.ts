import { z } from 'zod';

export const createDocumentSchema = z.object({
  width: z.number().positive().default(210),
  height: z.number().positive().default(297),
  pages: z.number().int().positive().default(1),
  margins: z
    .object({
      top: z.number().min(0).default(12),
      bottom: z.number().min(0).default(12),
      left: z.number().min(0).default(12),
      right: z.number().min(0).default(12),
    })
    .default({ top: 12, bottom: 12, left: 12, right: 12 }),
  bleed: z
    .object({
      top: z.number().min(0).default(3),
      bottom: z.number().min(0).default(3),
      left: z.number().min(0).default(3),
      right: z.number().min(0).default(3),
    })
    .optional(),
  slug: z
    .object({
      top: z.number().min(0).default(0),
      bottom: z.number().min(0).default(0),
      left: z.number().min(0).default(0),
      right: z.number().min(0).default(0),
    })
    .optional(),
  facingPages: z.boolean().default(false),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
});

export const pageSchema = z.object({
  index: z.number().int().min(0),
  properties: z
    .object({
      label: z.string().optional(),
      pageColor: z.string().optional(),
    })
    .optional(),
});

export const addPageSchema = z.object({
  position: z
    .enum(['atEnd', 'atBeginning', 'before', 'after'])
    .default('atEnd'),
  referencePage: z.number().int().min(0).optional(),
});

export const openDocumentSchema = z.object({
  filePath: z.string().min(1),
  showWindow: z.boolean().default(true),
});

export const saveDocumentSchema = z.object({
  filePath: z.string().optional(),
  saveOptions: z.enum(['yes', 'no', 'ask']).default('yes'),
});

export const closeDocumentSchema = z.object({
  saveOptions: z.enum(['yes', 'no', 'ask']).default('ask'),
});

export const placeFileSchema = z.object({
  filePath: z.string().min(1),
  pageIndex: z.number().int().min(0),
  x: z.number(),
  y: z.number(),
  layerIndex: z.number().int().min(0).optional(),
});

export const exportDocumentSchema = z.object({
  format: z.enum(['pdf', 'epub', 'html', 'jpg', 'png', 'package']),
  filePath: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const executeCodeSchema = z.object({
  code: z.string().min(1).max(50000),
});

export const preflightSchema = z.object({
  profile: z.string().optional(),
  waitForCompletion: z.boolean().default(true),
});
