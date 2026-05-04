#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const exts=['.ts','.tsx','.js','.jsx','.mts','.cts'];
const scanRoots=['artifacts/rentrix/src'];
const enforcedLowerDirs=['artifacts/rentrix/src/components/ui'];

function walk(dir,acc=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','.migration-backup'].includes(e.name)) continue; const p=path.join(dir,e.name); e.isDirectory()?walk(p,acc):acc.push(p);}return acc;}
const files=scanRoots.flatMap(d=>walk(path.join(root,d))).filter(f=>exts.includes(path.extname(f)));
let failed=false;
const map=new Map();
for(const f of files){const rel=path.relative(root,f).replace(/\\/g,'/'); const k=rel.toLowerCase(); (map.get(k)||map.set(k,[]).get(k)).push(rel);} 
for(const v of map.values()) if(v.length>1){console.error(`Case-conflict files: ${v.join(' <> ')}`); failed=true;}
for (const d of enforcedLowerDirs){
  for (const f of walk(path.join(root,d)).filter(f=>exts.includes(path.extname(f)))){
    const rel=path.relative(root,f).replace(/\\/g,'/');
    if (/[A-Z]/.test(path.basename(rel))) {console.error(`Non-lowercase filename: ${rel}`); failed=true;}
  }
}
const re=/from\s+['\"]([^'\"]+)['\"]|import\(['\"]([^'\"]+)['\"]\)/g;
function resolve(fromRel,spec){if(!spec.startsWith('.')&&!spec.startsWith('@/')) return null; let base=spec.startsWith('@/')?path.join(root,'artifacts/rentrix/src',spec.slice(2)):path.resolve(path.dirname(path.join(root,fromRel)),spec); for(const c of [base,...exts.map(e=>base+e),...exts.map(e=>path.join(base,'index'+e))]) if(fs.existsSync(c)) return c; return null;}
for(const abs of files){const rel=path.relative(root,abs).replace(/\\/g,'/'); const txt=fs.readFileSync(abs,'utf8'); let m; while((m=re.exec(txt))){const spec=m[1]||m[2]; const r=resolve(rel,spec); if(!r) continue; const real=path.relative(root,fs.realpathSync.native(r)).replace(/\\/g,'/'); if(spec.startsWith('@/')){const canonical='@/'+real.replace(/^artifacts\/rentrix\/src\//,''); if(canonical.toLowerCase()===spec.toLowerCase() && canonical!==spec){console.error(`Import case mismatch in ${rel}: '${spec}' -> '${canonical}'`); failed=true;}}}}
if(failed) process.exit(1); console.log('Import path casing check passed.');
