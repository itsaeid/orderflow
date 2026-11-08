import 'reflect-metadata';
import {Module,Controller,Post,Get,Body,Param,Req,Res,UseGuards,Injectable,Inject,CanActivate,ExecutionContext,UnauthorizedException,Catch,ExceptionFilter,ArgumentsHost} from '@nestjs/common';
import {NestExpressApplication} from '@nestjs/platform-express';
import {NestFactory} from '@nestjs/core';
import {SignJWT,jwtVerify} from 'jose';
import {compare} from 'bcryptjs';
import {z,ZodError} from 'zod';
import {Repository} from './repository';
import {Actor,WorkflowError,createSchema} from '../lib/workflow';
export const REPO='REPOSITORY';export const CONFIG='CONFIG';
export type Config={secret:string;origin:string;secure:boolean};
const command=z.object({type:z.enum(['approve','return','progress','payment','revise']),note:z.string().max(8000).optional(),changes:createSchema.optional(),value:z.number().finite().optional(),contract:z.string().max(1000).optional(),shipping:z.string().max(4000).optional(),serial:z.string().max(200).optional(),expectedVersion:z.number().int().positive(),requestId:z.string().min(8).max(150)}).strict();
@Injectable()
class Guard implements CanActivate{
 constructor(@Inject(REPO)private repo:Repository,@Inject(CONFIG)private cfg:Config){}
 async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest();try{const token=(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('seyfi_session='))?.slice(14);if(!token)throw Error();const {payload}=await jwtVerify(token,new TextEncoder().encode(this.cfg.secret),{issuer:'seyfi-api',audience:'seyfi-web',algorithms:['HS256']});const r=await this.repo.db.query('SELECT actor FROM users WHERE id=$1',[payload.sub]);if(!r.rows[0])throw Error();req.actor=r.rows[0].actor;return true}catch{throw new UnauthorizedException('لطفاً وارد حساب خود شوید')}}
}
@Catch()
class Errors implements ExceptionFilter{catch(e:any,host:ArgumentsHost){const res=host.switchToHttp().getResponse();const status=e instanceof WorkflowError?e.status:e instanceof ZodError?400:e.getStatus?.()||500;res.status(status).json({message:e instanceof ZodError?'اطلاعات واردشده معتبر نیست':status===500?'خطای داخلی سرور':e.message})}}
@Controller()
class ApiController{
 constructor(@Inject(REPO)private repo:Repository,@Inject(CONFIG)private cfg:Config){}
 @Get('health')health(){return {ok:true}}
 @Post('auth/login')async login(@Body()body:any,@Res({passthrough:true})res:any){const p=z.object({email:z.string().email().max(254),password:z.string().min(1).max(200)}).parse(body);const result=await this.repo.db.query('SELECT * FROM users WHERE email=$1',[p.email.toLowerCase()]);const u=result.rows[0];if(!u||!await compare(p.password,u.password_hash))throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');const token=await new SignJWT({}).setSubject(u.id).setProtectedHeader({alg:'HS256'}).setIssuedAt().setIssuer('seyfi-api').setAudience('seyfi-web').setExpirationTime('8h').sign(new TextEncoder().encode(this.cfg.secret));res.cookie('seyfi_session',token,{httpOnly:true,secure:this.cfg.secure,sameSite:'strict',path:'/',maxAge:8*60*60*1000});return u.actor}
 @Post('auth/logout')logout(@Res({passthrough:true})res:any){res.clearCookie('seyfi_session',{httpOnly:true,secure:this.cfg.secure,sameSite:'strict',path:'/'});return {ok:true}}
 @Get('auth/me')@UseGuards(Guard)me(@Req()req:any){return req.actor}
 @Get('orders')@UseGuards(Guard)list(@Req()req:any){return this.repo.list(req.actor)}
 @Get('orders/:id/documents')@UseGuards(Guard)documents(@Req()req:any,@Param('id')id:string){return this.repo.documents(req.actor,id)}
 @Get('orders/:id/documents/:docId')@UseGuards(Guard)async document(@Req()req:any,@Param('id')id:string,@Param('docId')docId:string,@Res()res:any){const d=await this.repo.readDocument(req.actor,id,docId);res.setHeader('Content-Type',d.mime);res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(d.name)}`);res.send(Buffer.from(d.data,'base64'))}
 @Post('orders/:id/documents')@UseGuards(Guard)addDocument(@Req()req:any,@Param('id')id:string,@Body()body:any){return this.repo.addDocument(req.actor,id,body)}
 @Get('orders/:id')@UseGuards(Guard)get(@Req()req:any,@Param('id')id:string){return this.repo.get(req.actor,id)}
 @Post('orders')@UseGuards(Guard)create(@Req()req:any,@Body()body:any){return this.repo.create(req.actor,body)}
 @Post('orders/:id/actions')@UseGuards(Guard)action(@Req()req:any,@Param('id')id:string,@Body()body:any){return this.repo.action(req.actor,id,command.parse(body))}
}
export async function makeApp(repo:Repository,config:Config){
 @Module({controllers:[ApiController],providers:[{provide:REPO,useValue:repo},{provide:CONFIG,useValue:config},Guard]})class App{}
 const app=await NestFactory.create<NestExpressApplication>(App,{logger:false});app.useBodyParser('json',{limit:'3mb'});app.setGlobalPrefix('api');app.useGlobalFilters(new Errors());app.enableCors({origin:config.origin,credentials:true});
 const buckets=new Map<string,{count:number;until:number}>();
 app.use((req:any,res:any,next:any)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==config.origin)return res.status(403).json({message:'مبدأ درخواست مجاز نیست'});if(req.path==='/api/auth/login'){const now=Date.now(),key=req.ip;let b=buckets.get(key);if(!b||b.until<now){b={count:0,until:now+60000};buckets.set(key,b)}if(++b.count>10)return res.status(429).json({message:'تعداد تلاش زیاد است؛ کمی بعد امتحان کنید'});if(buckets.size>10000)for(const[k,v]of buckets)if(v.until<now)buckets.delete(k)}next()});
 await app.init();return app;
}
