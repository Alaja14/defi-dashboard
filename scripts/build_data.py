import json
from pathlib import Path

def read(path, default=None):
    path = Path(path)
    return json.loads(path.read_text()) if path.exists() else default

def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n')
