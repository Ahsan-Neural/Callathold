// Local preview only. Vercel serves dist directly; this server is never deployed.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const qa=fileURLToPath(new URL('./tests/browser/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const option=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const port=Number(option('--port')||process.env.PORT||8000),host=option('--host')||process.env.HOST||'127.0.0.1';
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
  const localQA=pathname.startsWith('/__qa/'),base=localQA?qa:root;
  let path=resolve(base,'.'+(localQA?pathname.slice(5):pathname));
  if(path!==resolve(base)&&!path.startsWith(resolve(base)+sep)){res.writeHead(403).end();return;}
  if((await stat(path)).isDirectory())path=resolve(path,'index.html');
  const body=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
}).listen(port,host,()=>console.log(`Portfolio preview: http://localhost:${port}`));
