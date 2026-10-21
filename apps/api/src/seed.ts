import { Store } from './database.ts';
const store = new Store(process.env.DATABASE_PATH ?? './data/ecogrid.sqlite');
try { console.log(JSON.stringify(store.seed())); } finally { store.close(); }
