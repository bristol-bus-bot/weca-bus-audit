import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../docs/app.js',import.meta.url),'utf8')
  .replace(/\nwireSections\(\);[\s\S]*$/, '');
const context={};
vm.runInNewContext(source+'\nglobalThis.helpers={evidenceText,limitedEvidence,format};',context);
const {evidenceText,limitedEvidence,format}=context.helpers;

test('missing coverage is not zero trips',()=>{
  assert.equal(format.count(null),'Unavailable');
  assert.equal(format.count(undefined),'Unavailable');
  assert.equal(format.count(0),'0');
});
test('many readings cannot bypass the shared sample decision',()=>{
  assert.equal(limitedEvidence({readings_in_gate:100000}),true);
  assert.equal(limitedEvidence({qualification:{status:'unavailable'}}),true);
  assert.equal(limitedEvidence({qualification:{status:'supported'}}),false);
});
test('context uses selected evidence and qualifies historical absence',()=>{
  const q={status:'indicative',journeys:20,service_days:1,reasons:['coverage_unverified'],range_pct:[40,80]};
  const text=evidenceText({qualification:q},{operators:[{name:'First',readings:90,share_pct:90}]},'ALL');
  assert.match(text,/First: 90%/);
  assert.match(text,/unverified/);
  assert.match(text,/40–80%/);
  assert.match(evidenceText({},null,'ALL'),/Historical result/);
});
