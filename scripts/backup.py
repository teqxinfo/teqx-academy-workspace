#!/usr/bin/env python3
"""Teqx Academy - full database backup to a JSON file.

Dumps every public table (plus storage object metadata) to one JSON file.
Runs anywhere with Python 3:  pip install pg8000

  SUPABASE_DB_PASSWORD='...' python3 scripts/backup.py [output.json]

Defaults output to teqx-backup-<today>.json in the current directory.
DB host/user are fixed for this project (session pooler, ap-south-1).
"""
import json, os, ssl, sys, datetime
import pg8000

HOST = 'aws-0-ap-south-1.pooler.supabase.com'
USER = 'postgres.dizdotnqrabzoujszqjo'
DB = 'postgres'

def main():
    pw = os.environ.get('SUPABASE_DB_PASSWORD')
    if not pw:
        sys.exit('Set SUPABASE_DB_PASSWORD')
    out = sys.argv[1] if len(sys.argv) > 1 else f"teqx-backup-{datetime.date.today().isoformat()}.json"
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    c = pg8000.connect(host=HOST, port=5432, user=USER, password=pw, database=DB, ssl_context=ctx, timeout=60)
    cur = c.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1")
    tables = [r[0] for r in cur.fetchall()]
    dump = {'exported_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'project': 'dizdotnqrabzoujszqjo', 'tables': {}, 'row_counts': {}}
    for t in tables:
        cur.execute(f'SELECT * FROM public."{t}"')
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        dump['tables'][t] = rows
        dump['row_counts'][t] = len(rows)
    try:
        cur.execute('SELECT bucket_id, name, created_at, updated_at FROM storage.buckets')
        dump['storage_buckets'] = [dict(zip(['bucket_id','name','created_at','updated_at'], r)) for r in cur.fetchall()]
        cur.execute('SELECT bucket_id, name, created_at, updated_at, metadata FROM storage.objects')
        cols = ['bucket_id','name','created_at','updated_at','metadata']
        dump['storage_objects'] = [dict(zip(cols, r)) for r in cur.fetchall()]
    except Exception as e:
        dump['storage_note'] = f'storage metadata not exported: {e}'
    c.close()
    with open(out, 'w') as f:
        json.dump(dump, f, default=str)
    print(f"{out}: {sum(dump['row_counts'].values())} rows across {len(tables)} tables, {len(dump.get('storage_objects', []))} storage objects")

if __name__ == '__main__':
    main()
