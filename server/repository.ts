import {OrderDocument,canReadDocument,canWriteDocument,validateDocument} from '../lib/documents';
import {Actor,Order,Command,CreateInput,createOrder,transition,project,visible,WorkflowError} from '../lib/workflow';
import {randomUUID} from 'node:crypto';
export interface Queryable {query(sql:string,params?:any[]):Promise<{rows:any[];rowCount?:number|null}>}
export interface Database extends Queryable{transaction<T>(fn:(q:Queryable)=>Promise<T>):Promise<T>}
export const schema=`
CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY,email text UNIQUE NOT NULL,password_hash text NOT NULL,actor jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY, data jsonb NOT NULL,version integer NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),event jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),document jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS outbox(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders((data->>'customerId'));
CREATE INDEX IF NOT EXISTS orders_stage_idx ON orders((data->>'stage'));
`;
export class Repository{
 constructor(public db:Database){}
 async raw(id:string,q:Queryable=this.db):Promise<Order>{const r=await q.query('SELECT data FROM orders WHERE id=$1',[id]);if(!r.rows[0])throw new WorkflowError('سفارش پیدا نشد',404);return r.rows[0].data}
 async documents(a:Actor,id:string){const o=await this.raw(id);if(!visible(a,o))throw new WorkflowError('دسترسی مجاز نیست',403);const r=await this.db.query('SELECT document FROM documents WHERE order_id=$1',[id]);return r.rows.map(r=>r.document as OrderDocument).filter(d=>canReadDocument(a,o,d.kind)).map(({data,...d})=>d)}
 async readDocument(a:Actor,id:string,docId:string){const o=await this.raw(id);const r=await this.db.query('SELECT document FROM documents WHERE id=$1 AND order_id=$2',[docId,id]);if(!r.rows[0])throw new WorkflowError('فایل پیدا نشد',404);const d=r.rows[0].document as OrderDocument;if(!canReadDocument(a,o,d.kind))throw new WorkflowError('دسترسی به فایل مجاز نیست',403);return d}
 async addDocument(a:Actor,id:string,input:Pick<OrderDocument,'name'|'mime'|'kind'|'data'>){validateDocument(input);return this.db.transaction(async q=>{const r=await q.query('SELECT data FROM orders WHERE id=$1 FOR UPDATE',[id]);if(!r.rows[0])throw new WorkflowError('سفارش پیدا نشد',404);const o=r.rows[0].data as Order;if(!canWriteDocument(a,o,input.kind))throw new WorkflowError('بارگذاری این نوع مدرک در این مرحله مجاز نیست',403);const d:OrderDocument={id:randomUUID(),orderId:id,name:input.name,mime:input.mime,kind:input.kind,data:input.data,at:new Date().toISOString(),by:a.name,invoiceVersion:o.invoiceVersion};await q.query('INSERT INTO documents(id,order_id,document) VALUES($1,$2,$3)',[d.id,id,JSON.stringify(d)]);o.version++;const event={id:d.id,at:d.at,actor:a.name,role:a.role,action:'پیوست مدرک',note:input.name,from:o.stage,to:o.stage,version:o.version};o.history.push(event);await q.query('UPDATE orders SET data=$2,version=$3 WHERE id=$1',[id,JSON.stringify(o),o.version]);await this.events(q,o,event);const {data,...meta}=d;return meta})}
 async init(){await this.db.query(schema)}
 async list(a:Actor){const {rows}=await this.db.query('SELECT data FROM orders ORDER BY id DESC');return rows.map(r=>r.data as Order).filter(o=>visible(a,o)).map(o=>project(a,o))}
 async get(a:Actor,id:string){const r=await this.db.query('SELECT data FROM orders WHERE id=$1',[id]);if(!r.rows[0])throw new WorkflowError('سفارش پیدا نشد',404);return project(a,r.rows[0].data)}
 async create(a:Actor,input:CreateInput){const o=createOrder(a,input,'SEY-'+randomUUID().slice(0,8).toUpperCase());await this.db.transaction(async q=>{await q.query('INSERT INTO orders(id,data,version) VALUES($1,$2,$3)',[o.id,JSON.stringify(o),o.version]);await this.events(q,o,o.history[0])});return project(a,o)}
 async events(q:Queryable,o:Order,event:Order['history'][number]){await q.query('INSERT INTO audit_events(id,order_id,event) VALUES($1,$2,$3)',[event.id,o.id,JSON.stringify(event)]);await q.query('INSERT INTO outbox(id,order_id,payload) VALUES($1,$2,$3)',[event.id,o.id,JSON.stringify({stage:o.stage,eventId:event.id})])}
 async action(a:Actor,id:string,c:Command){return this.db.transaction(async q=>{const r=await q.query('SELECT data FROM orders WHERE id=$1 FOR UPDATE',[id]);if(!r.rows[0])throw new WorkflowError('سفارش پیدا نشد',404);const old=r.rows[0].data as Order;const updated=transition(a,old,c);if(updated===old)return {id:old.id,version:old.version};await q.query('UPDATE orders SET data=$2,version=$3 WHERE id=$1',[id,JSON.stringify(updated),updated.version]);await this.events(q,updated,updated.history.at(-1)!);return {id:updated.id,version:updated.version}})}
}
