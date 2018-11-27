from flask import Flask, render_template, send_from_directory, request, jsonify
from agent import select_agent
import json
import time
import math
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)

@app.route('/solve', methods=['POST'])
@cross_origin("*")
def solve():
    data = request.get_json()
    print(data["G"])
    print(data["ctx"])
    print(data["agent"])
    print(data["adjacencyList"])
    print("\ncountries of 40: ", data["G"]["countries"]['40'])
    solution = select_agent(data)
    print(solution)
    # print(jsonify(solution))
    return jsonify(solution)


# if __name__ == '__main__':
#   app.run(debug=True)
