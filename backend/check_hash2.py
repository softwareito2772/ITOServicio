import hashlib

password = "$Jafet2213$"
salt = "5b62d6e2748224b3361e6fcf30783513"
stored_hex = "43784db19dfb7b6fd4efee04de43c5736ab102c6aad0c77e7b66bd71fc3add48"

hash_obj = hashlib.sha256((password + salt).encode())
computed = hash_obj.hexdigest()
print(f"Salt:      {salt}")
print(f"Stored:    {stored_hex}")
print(f"Computed:  {computed}")
print(f"Match:     {stored_hex == computed}")
