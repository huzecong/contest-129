import hashlib
import os
import time

import flask

app = flask.Flask("contest")
app.config['DEBUG'] = False
app.config['SECRET_KEY'] = '129'


@app.route("/")
def render_index():
    return flask.send_file('index.html')


@app.route("/assets/<path:path>")
def render_static(path):
    return flask.send_from_directory('assets', path)


@app.route("/gamedata.json")
def render_json():
    return flask.send_from_directory('.', 'gamedata.json')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
