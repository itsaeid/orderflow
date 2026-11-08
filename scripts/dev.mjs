import {spawn} from 'node:child_process';
const args=process.argv.slice(2);const i=args.indexOf('--port');const port=i>=0?args[i+1]:'3000';const p=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','0.0.0.0','--port',port],{stdio:'inherit'});p.on('exit',code=>process.exit(code??1));
