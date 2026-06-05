import hashlib, secrets

password = "$Jafet2213$"
stored_hash = "4ce2564de759d44245212bc0b87e2fcc$ade753c889fb32319d6d1f00b5fb083d3e95f17b33e36bd70f3cf791ca2a5c40"
salt, stored_hex = stored_hash.split("$", 1)
hash_obj = hashlib.sha256((password + salt).encode())
computed = hash_obj.hexdigest()
print(f"Stored:   {stored_hex}")
print(f"Computed: {computed}")
print(f"Match: {stored_hex == computed}")

# Generate correct hash for superadmin
salt2 = secrets.token_hex(16)
hash2 = hashlib.sha256((password + salt2).encode())
print(f"\nNew hash: {salt2}${hash2.hexdigest()}")
