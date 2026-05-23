import { IOtherOptionConfig } from '../SPChoiceField.types';

export function shouldCollectOtherValue(otherConfig: IOtherOptionConfig = {}): boolean {
  return otherConfig.collectOtherValue !== false;
}
