import os, hmac, hashlib, base64, json, time, re, secrets
from fastapi import Header, HTTPException

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-please").encode()

def make_token(payload: dict, ttl=60*60*24*14):
    body = {**payload, "exp": int(time.time()) + ttl}
    raw = base64.urlsafe_b64encode(json.dumps(body).encode()).rstrip(b"=")
    sig = base64.urlsafe_b64encode(hmac.new(SECRET, raw, hashlib.sha256).digest()).rstrip(b"=")
    return (raw + b"." + sig).decode()

def verify_token(token: str):
    try:
        raw, sig = token.encode().split(b".")
        expected = base64.urlsafe_b64encode(hmac.new(SECRET, raw, hashlib.sha256).digest()).rstrip(b"=")
        if not hmac.compare_digest(sig, expected): return None
        pad = b"=" * (-len(raw) % 4)
        payload = json.loads(base64.urlsafe_b64decode(raw + pad))
        if payload["exp"] < time.time(): return None
        return payload
    except Exception:
        return None

def hash_password(pw: str, salt: bytes = None):
    salt = salt or os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(h).decode()

def verify_password(pw: str, stored: str):
    try:
        salt_b64, hash_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
        return hmac.compare_digest(base64.b64encode(h).decode(), hash_b64)
    except Exception:
        return False

def slugify(name: str):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "team"

def random_token(n=6):
    return secrets.token_hex(n // 2 + 1)[:n]

def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth token. Please log in.")
    payload = verify_token(authorization[7:])
    if not payload:
        raise HTTPException(401, "Session expired or invalid. Please log in again.")
    return payload
