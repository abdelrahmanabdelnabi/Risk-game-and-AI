from flask import Flask, render_template, send_from_directory, request, jsonify
from agent import select_agent
import json
import time
import math


app = Flask(__name__)


@app.route('/solve', methods=['GET'])
def solve():
	print(request.get_json())
	data = request.get_json()
	solution = select_agent(data)
	print(solution)
	# print(jsonify(solution))
	return solution


if __name__ == '__main__':
  app.run(debug=True)
