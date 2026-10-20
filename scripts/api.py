"""Bounded, retrying public API client; compact disk cache enables failed-run recovery."""
import hashlib
import json
import time
from pathlib import Path
from urllib.parse import quote
import requests

class API:
    def __init__(self, cache=Path('.cache/api'), attempts=4, base_url='https://api.llama.fi'):
        self.base_url = base_url
        self.cache, self.attempts = Path(cache), attempts
        self.cache.mkdir(parents=True, exist_ok=True)

    def get(self, path, ttl=3600):
        file = self.cache / (hashlib.sha256((self.base_url+path).encode()).hexdigest() + '.json')
        if file.exists() and time.time() - file.stat().st_mtime < ttl:
            return json.loads(file.read_text())
        for attempt in range(self.attempts):
            try:
                response = requests.get(self.base_url + path, timeout=(15, 90), headers={'User-Agent':'DeFiTVLMonitor/1.0'})
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, (dict, list)) or not payload:
                    raise ValueError(f'Empty or invalid response: {path}')
                tmp = file.with_suffix('.tmp')
                tmp.write_text(json.dumps(payload, separators=(',', ':')))
                tmp.replace(file)
                return payload
            except (requests.RequestException, ValueError):
                if attempt + 1 == self.attempts:
                    raise
                time.sleep(min(30, 2 ** (attempt + 1)))

def segment(value):
    return quote(value, safe='')
