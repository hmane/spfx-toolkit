// PnP-backed feature entry: a lightweight component + SPContext (PnP) + BatchBuilder
// (a direct-SPFI PnP utility). Measures the @pnp/sp augmentation surface a PnP-backed
// feature pulls into a consumer bundle.
import { Card } from 'spfx-toolkit/components/Card';
import { SPContext } from 'spfx-toolkit/utilities/context';
import { BatchBuilder } from 'spfx-toolkit/utilities/batchBuilder';
export const used = { Card, SPContext, BatchBuilder };
