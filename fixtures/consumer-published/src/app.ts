// PnP-backed feature entry: a lightweight component + SPContext (PnP) + BatchBuilder
// (a direct-SPFI PnP utility). Exercises the @pnp/sp augmentation surface that
// Phase 1 will centralize behind ensurePnPAugmentations().
import { Card } from 'spfx-toolkit/components/Card';
import { SPContext } from 'spfx-toolkit/utilities/context';
import { BatchBuilder } from 'spfx-toolkit/utilities/batchBuilder';
export const used = { Card, SPContext, BatchBuilder };
