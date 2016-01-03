import json

fin = open('1.json', 'r', encoding=u)
data = json.loads(fin.readall())
print json.dumps(data.reverse())

open('2.json', 'w').write(data)
