import { Injectable,NotFoundException } from '@nestjs/common';
import { createReadStream,existsSync,mkdirSync,unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class StorageService {
  readonly root=resolve(process.cwd(),process.env.UPLOAD_DIR||'uploads');
  constructor(){mkdirSync(this.root,{recursive:true})}
  path(key:string){const safe=key.replace(/[^a-zA-Z0-9._-]/g,'');const path=resolve(this.root,safe);if(!path.startsWith(this.root))throw new NotFoundException();return path}
  stream(key:string){const path=this.path(key);if(!existsSync(path))throw new NotFoundException('Không tìm thấy tệp');return createReadStream(path)}
  remove(key:string){const path=this.path(key);if(existsSync(path))unlinkSync(path)}
}
