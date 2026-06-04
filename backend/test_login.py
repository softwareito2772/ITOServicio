import urllib.request, json

data = json.dumps({'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'}).encode()
try:
    req = urllib.request.Request('https://itoservicio.onrender.com/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print('Login OK')
    print(json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print(f'Error {e.code}:')
    body = e.read().decode()
    print(body)
