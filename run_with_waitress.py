from flask import Flask
from waitress import serve
import sys

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    print("Starting server on http://127.0.0.1:5004", file=sys.stderr)
    try:
        serve(app, host='127.0.0.1', port=5004)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)