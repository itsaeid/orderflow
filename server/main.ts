import 'reflect-metadata';
import {Pool} from 'pg';
import {hash} from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {Repository,Database} from './repository';
import {makeApp} from './app';
async function main(){const {DATABASE_URL,SESSION_SECRET,WEB_ORIGIN,BOOTSTRAP_EMAIL,BOOTSTRAP_PASSWORD}=process.env;if(!DATABASE_URL||!SESSION_SECRET||SESSION_SECRET.length<32||!WEB_ORIGIN)throw Error('DATABASE_URL, SESSION_SECRET (32+ characters), WEB_ORIGIN required');const pool=new Pool({connectionString:DATABASE_URL});const db:Database={query:(s,p)=>pool.query(s,p),transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}};const repo=new Repository(db);await repo.init();if(BOOTSTRAP_EMAIL&&BOOTSTRAP_PASSWORD){if(BOOTSTRAP_PASSWORD.length<12)throw Error('Bootstrap password needs 12+ characters');const r=await db.query('SELECT id FROM users LIMIT 1');if(!r.rows.length){const id=randomUUID();await db.query('INSERT INTO users(id,email,password_hash,actor) VALUES($1,$2,$3,$4)',[id,BOOTSTRAP_EMAIL.toLowerCase(),await hash(BOOTSTRAP_PASSWORD,12),JSON.stringify({id,name:'مدیرعامل',role:'ceo'})])}}const app=await makeApp(repo,{secret:SESSION_SECRET,origin:WEB_ORIGIN,secure:process.env.NODE_ENV==='production'});await app.listen(Number(process.env.PORT||4000),'0.0.0.0');console.log('Seyfi API listening');}
main().catch(e=>{console.error(e.message);process.exit(1)});
