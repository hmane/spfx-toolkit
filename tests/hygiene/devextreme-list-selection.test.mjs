import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

const filesUsingSelectList = [
  'src/components/GroupUsersPicker/GroupUsersPicker.tsx',
  'src/components/spFields/SPChoiceField/SPChoiceField.tsx',
  'src/components/spFields/SPLookupField/SPLookupField.tsx',
  'src/components/spForm/DevExtremeControls/DevExtremeSelectBox.tsx',
  'src/components/spForm/DevExtremeControls/DevExtremeTagBox.tsx',
];

test('toolkit SelectBox/TagBox modules explicitly register DevExtreme List selection', () => {
  for (const rel of filesUsingSelectList) {
    const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(source, /ensureDevExtremeListSelection/);
    assert.match(source, /ensureDevExtremeListSelection\(\);/);
  }
});
