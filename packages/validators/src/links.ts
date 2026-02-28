// Re-export block schemas for backward compatibility
export {
  blockTypeSchema,
  blockConfigBaseSchema,
  linkConfigSchema,
  headerConfigSchema,
  socialIconsConfigSchema,
  embedConfigSchema,
  formConfigSchema,
  socialIconItemSchema,
  createBlockSchema,
  updateBlockSchema,
  reorderBlocksSchema,
} from "./blocks";
export type { BlockType } from "./blocks";
