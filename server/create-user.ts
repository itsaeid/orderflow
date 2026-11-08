import {Pool} from 'pg';
import {hash} from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {roles,Role} from '../lib/workflow';
async function main(){const {DATABASE_URL,USER_EMAIL,USER_PASSWORD,USER_NAME,USER_ROLE,USER_CUSTOMER_ID}=process.env;if(!DATABASE_URL||!USER_EMAIL||!USER_NAME||!USER_PASSWORD||USER_PASSWORD.length<12||!USER_ROLE||!(USER_ROLE in roles))throw Error('Provide DATABASE_URL, USER_EMAIL, USER_NAME, USER_PASSWORD (12+), USER_ROLE');if(USER_ROLE==='customer'&&!USER_CUSTOMER_ID)throw Error('Customer requires USER_CUSTOMER_ID');const db=new Pool({connectionString:DATABASE_URL});const id=randomUUID();await db.query('INSERT INTO users(id,email,password_hash,actor) VALUES($1,$2,$3,$4)',[id,USER_EMAIL.toLowerCase(),await hash(USER_PASSWORD,12),JSON.stringify({id,name:USER_NAME,role:USER_ROLE as Role,...(USER_CUSTOMER_ID?{customerId:USER_CUSTOMER_ID}:{})})]);await db.end();console.log('User created');}main().catch(e=>{console.error(e.message);process.exit(1)});
