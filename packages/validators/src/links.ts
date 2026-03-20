// Re-export block schemas for backward compatibility
export {
  blockTypeSchema,
  blockConfigBaseSchema,
  linkConfigSchema,
  headerConfigSchema,
  connectConfigSchema,
  embedConfigSchema,
  createBlockSchema,
  updateBlockSchema,
  reorderBlocksSchema,
} from "./blocks";
export type { BlockType } from "./blocks";
