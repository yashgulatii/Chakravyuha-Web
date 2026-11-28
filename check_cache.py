import json
with open('src/content/feed-cache.json') as f:
    cache = json.load(f)
print('Top-level keys:', list(cache.keys()))
if 'modules' in cache:
    print('Modules count:', len(cache['modules']))
    for m in cache['modules']:
        has_readme = 'YES' if m.get('readmeContent') else 'NO'
        print(f"  Ring {m['ring']}: {m['name']} status={m['status']} allPublished={m.get('allEntriesPublished')} readmeContent={has_readme}")
if 'moduleReadmes' in cache:
    print('moduleReadmes keys:', list(cache['moduleReadmes'].keys()))
print('publishedCount:', cache.get('publishedCount'))
print('fetchedAt:', cache.get('fetchedAt'))
